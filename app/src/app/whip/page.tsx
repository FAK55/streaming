'use client';

import { useServerHost } from '@/lib/ServerHostContext';
import { useState, useRef, useCallback, useEffect } from 'react';

type Status = 'stopped' | 'connecting' | 'live' | 'error';

export default function WhipIngestPage() {
  const { host } = useServerHost();

  const [streamPath, setStreamPath] = useState('browser');
  const [source, setSource] = useState<'camera' | 'screen' | 'both'>('camera');
  const [resolution, setResolution] = useState('1280:720');
  const [status, setStatus] = useState<Status>('stopped');
  const [statusLabel, setStatusLabel] = useState('Stopped');
  const [errorMessage, setErrorMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPlayback, setShowPlayback] = useState(false);
  const [previewRes, setPreviewRes] = useState('--');
  const [previewTime, setPreviewTime] = useState('00:00');
  const [copied, setCopied] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const isStreamingRef = useRef(false);
  const uptimeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const path = streamPath.trim() || 'browser';
  const whipUrl = `http://${host}:8889/${path}/whip`;
  const webrtcPlayback = `http://${host}:8889/${path}`;
  const hlsPlayback = `http://${host}:8888/${path}`;

  const setStatusState = useCallback((state: Status, label: string) => {
    setStatus(state);
    setStatusLabel(label);
  }, []);

  const cleanupMedia = useCallback(() => {
    [localStreamRef, screenStreamRef, canvasStreamRef].forEach((ref) => {
      if (ref.current) {
        ref.current.getTracks().forEach((t) => t.stop());
        ref.current = null;
      }
    });
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    }
  }, []);

  const stopUptime = useCallback(() => {
    if (uptimeRef.current) {
      clearInterval(uptimeRef.current);
      uptimeRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const startUptime = useCallback(() => {
    startTimeRef.current = Date.now();
    uptimeRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      setPreviewTime(`${m}:${s}`);
    }, 1000);
  }, []);

  const stopStream = useCallback(() => {
    isStreamingRef.current = false;
    setIsStreaming(false);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    cleanupMedia();

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setPreviewRes('--');
    setPreviewTime('00:00');
    setStatusState('stopped', 'Stopped');
    setShowPlayback(false);
    setErrorMessage('');
    stopUptime();
  }, [cleanupMedia, setStatusState, stopUptime]);

  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    const parts = resolution.split(':');
    const w = parseInt(parts[0], 10);
    const h = parseInt(parts[1], 10);

    if (source === 'camera') {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: 30 } },
        audio: true,
      });
      localStreamRef.current = stream;
      return stream;
    }

    if (source === 'screen') {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: w }, height: { ideal: h } },
        audio: true,
      });
      localStreamRef.current = stream;
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (isStreamingRef.current) stopStream();
      });
      return stream;
    }

    // both: camera + screen
    const screenStr = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: w }, height: { ideal: h } },
      audio: true,
    });
    const camStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 } },
      audio: true,
    });

    screenStreamRef.current = screenStr;
    localStreamRef.current = camStream;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const screenVid = document.createElement('video');
    screenVid.srcObject = screenStr;
    screenVid.muted = true;
    screenVid.play();

    const camVid = document.createElement('video');
    camVid.srcObject = camStream;
    camVid.muted = true;
    camVid.play();

    function drawFrame() {
      if (!isStreamingRef.current) return;
      ctx.drawImage(screenVid, 0, 0, w, h);
      const pipW = Math.round(w * 0.25);
      const pipH = Math.round(h * 0.25);
      const margin = 16;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.drawImage(camVid, w - pipW - margin, h - pipH - margin, pipW, pipH);
      ctx.restore();
      requestAnimationFrame(drawFrame);
    }

    await new Promise<void>((resolve) => { screenVid.onplaying = () => resolve(); });
    await new Promise<void>((resolve) => { camVid.onplaying = () => resolve(); });

    drawFrame();

    const cStream = canvas.captureStream(30);
    const audioTracks = camStream.getAudioTracks();
    if (audioTracks.length > 0) {
      cStream.addTrack(audioTracks[0]);
    } else {
      const screenAudio = screenStr.getAudioTracks();
      if (screenAudio.length > 0) cStream.addTrack(screenAudio[0]);
    }

    screenStr.getVideoTracks()[0].addEventListener('ended', () => {
      if (isStreamingRef.current) stopStream();
    });

    canvasStreamRef.current = cStream;
    return cStream;
  }, [resolution, source, stopStream]);

  const startStream = useCallback(async () => {
    setErrorMessage('');
    setStatusState('connecting', 'Connecting...');
    isStreamingRef.current = true;
    setIsStreaming(true);

    let stream: MediaStream;
    try {
      stream = await acquireMedia();
    } catch (err: unknown) {
      isStreamingRef.current = false;
      setIsStreaming(false);
      const e = err as DOMException;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setStatusState('error', 'Error');
        setErrorMessage('Camera access denied. Please allow camera/microphone permissions and try again.');
      } else if (e.name === 'NotFoundError') {
        setStatusState('error', 'Error');
        setErrorMessage('No camera or microphone found. Check that a device is connected.');
      } else if (e.name === 'AbortError') {
        setStatusState('stopped', 'Stopped');
        setErrorMessage('Screen sharing was cancelled.');
      } else {
        setStatusState('error', 'Error');
        setErrorMessage(`Could not access media: ${e.message}`);
      }
      return;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      setPreviewRes(`${settings.width || '?'}x${settings.height || '?'}`);
    }

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setStatusState('live', 'Live');
        setShowPlayback(true);
        startUptime();
      } else if (state === 'failed') {
        setErrorMessage('Connection lost. The peer connection failed.');
        stopStream();
      } else if (state === 'disconnected') {
        setStatusState('connecting', 'Reconnecting...');
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(whipUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription!.sdp,
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err: unknown) {
      setStatusState('error', 'Error');
      setErrorMessage(`Connection failed -- is MediaMTX running? (${(err as Error).message})`);
      cleanupMedia();
      isStreamingRef.current = false;
      setIsStreaming(false);
      if (videoRef.current) videoRef.current.srcObject = null;
      setPreviewRes('--');
      return;
    }
  }, [acquireMedia, cleanupMedia, setStatusState, startUptime, stopStream, whipUrl]);

  const toggleStream = useCallback(() => {
    if (isStreamingRef.current) {
      stopStream();
    } else {
      startStream();
    }
  }, [startStream, stopStream]);

  const copyUrl = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusColors: Record<Status, { dot: string; text: string; badge: string }> = {
    stopped: {
      dot: 'bg-[#555]',
      text: 'text-[#555]',
      badge: 'bg-[#333] text-[#888]',
    },
    connecting: {
      dot: 'bg-yellow-500 animate-pulse',
      text: 'text-yellow-500',
      badge: 'bg-yellow-500/20 text-yellow-500',
    },
    live: {
      dot: 'bg-[var(--neon-green)] shadow-[0_0_8px_rgba(57,255,20,0.6)]',
      text: 'text-[var(--neon-green)]',
      badge: 'bg-[var(--neon-green)]/20 text-[var(--neon-green)] animate-pulse',
    },
    error: {
      dot: 'bg-red-500',
      text: 'text-red-500',
      badge: 'bg-red-500/20 text-red-500',
    },
  };

  const sc = statusColors[status];

  return (
    <div className="px-5 py-6 max-w-[1200px] mx-auto">
      <h1 className="text-center text-2xl font-bold mb-1.5">
        Browser Live Publisher
      </h1>
      <p className="text-center text-sm text-[var(--text-muted)] mb-7">
        Stream your camera or screen directly to MediaMTX via{' '}
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-[var(--neon-green)]">
          WebRTC WHIP
        </code>{' '}
        -- no OBS required
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: Preview */}
        <div
          className={`bg-[var(--bg-card)] rounded-xl overflow-hidden border-2 flex flex-col transition-colors ${
            status === 'live' ? 'border-[var(--neon-green)]' : 'border-[#333]'
          }`}
        >
          <div className="px-4 py-3 flex justify-between items-center bg-white/[0.03] border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-[#aaa]">Local Preview</span>
            <span
              className={`px-2.5 py-0.5 rounded-xl text-[11px] font-bold uppercase tracking-wide ${sc.badge}`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
            {!isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#555] gap-3">
                <svg
                  className="w-16 h-16 opacity-30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span className="text-sm">Select a source and go live</span>
              </div>
            )}
          </div>
          <div className="px-4 py-2.5 text-xs text-[#555] border-t border-white/[0.06] flex justify-between">
            <span>{previewRes}</span>
            <span>{previewTime}</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex flex-col gap-4">
          {/* Stream Path */}
          <div className="bg-[var(--bg-card)] rounded-[10px] p-4 border border-white/[0.06]">
            <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#666] mb-3">
              Stream Path
            </h3>
            <div className="mb-3">
              <label className="block text-xs text-[#999] mb-1 font-semibold">
                Path on MediaMTX
              </label>
              <input
                type="text"
                value={streamPath}
                onChange={(e) => setStreamPath(e.target.value)}
                disabled={isStreaming}
                placeholder="e.g. browser, mycam, demo"
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[#333] rounded-md text-white text-sm outline-none focus:border-[var(--neon-green)]/50 transition-colors disabled:opacity-50"
              />
              <div className="mt-1.5 text-[11px] text-[#555] break-all">
                WHIP endpoint:{' '}
                <span className="text-[var(--neon-green)]">{whipUrl}</span>
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="bg-[var(--bg-card)] rounded-[10px] p-4 border border-white/[0.06]">
            <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#666] mb-3">
              Source
            </h3>
            <div className="mb-3">
              <label className="block text-xs text-[#999] mb-1 font-semibold">
                Capture source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as typeof source)}
                disabled={isStreaming}
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[#333] rounded-md text-white text-sm outline-none cursor-pointer focus:border-[var(--neon-green)]/50 appearance-none pr-8 disabled:opacity-50"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                <option value="camera">Camera</option>
                <option value="screen">Screen Share</option>
                <option value="both">Camera + Screen (PiP)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#999] mb-1 font-semibold">
                Resolution
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                disabled={isStreaming}
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[#333] rounded-md text-white text-sm outline-none cursor-pointer focus:border-[var(--neon-green)]/50 appearance-none pr-8 disabled:opacity-50"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                <option value="1280:720">720p</option>
                <option value="854:480">480p</option>
                <option value="640:360">360p</option>
              </select>
            </div>
          </div>

          {/* Go Live Button */}
          <button
            onClick={toggleStream}
            disabled={status === 'connecting'}
            className={`w-full py-4 rounded-[10px] text-base font-bold uppercase tracking-wider transition-all disabled:bg-[#333] disabled:text-[#666] disabled:cursor-not-allowed disabled:shadow-none ${
              isStreaming
                ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(244,67,54,0.3)] hover:bg-red-600 hover:shadow-[0_0_30px_rgba(244,67,54,0.5)]'
                : 'bg-[var(--neon-green)] text-black shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)]'
            }`}
          >
            {isStreaming ? 'Stop Stream' : 'Go Live'}
          </button>

          {/* Connection Status */}
          <div className="bg-[var(--bg-card)] rounded-[10px] p-4 border border-white/[0.06]">
            <h3 className="text-[11px] uppercase tracking-[1.5px] text-[#666] mb-3">
              Connection
            </h3>
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.03]">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc.dot}`} />
              <span className={`text-[13px] font-semibold ${sc.text}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-3 text-[13px] text-red-500 leading-relaxed">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Playback URLs */}
      {showPlayback && (
        <div className="mt-6 bg-[var(--neon-green)]/[0.06] border border-[var(--neon-green)]/20 rounded-xl p-5 animate-[fadeUp_0.4s_ease]">
          <h3 className="text-sm font-bold text-[var(--neon-green)] mb-3.5">
            Your stream is now available at:
          </h3>
          {[
            { label: 'WebRTC', value: webrtcPlayback, key: 'webrtc' },
            { label: 'HLS', value: hlsPlayback, key: 'hls' },
          ].map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-3 mb-2.5 last:mb-0 px-3.5 py-2.5 bg-black/30 rounded-md"
            >
              <span className="text-xs font-bold uppercase tracking-wide text-[#888] min-w-[60px]">
                {row.label}
              </span>
              <span className="text-[13px] text-[var(--neon-cyan)] font-mono break-all flex-1">
                {row.value}
              </span>
              <button
                onClick={() => copyUrl(row.value, row.key)}
                className={`px-2.5 py-1 bg-white/[0.08] border border-white/10 rounded text-[11px] font-semibold cursor-pointer shrink-0 transition-all hover:bg-white/15 hover:text-white ${
                  copied === row.key
                    ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)] border-[var(--neon-green)]/30'
                    : 'text-[#aaa]'
                }`}
              >
                {copied === row.key ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
