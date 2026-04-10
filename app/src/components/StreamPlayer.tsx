'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useServerHost } from '@/lib/ServerHostContext';

interface Props {
  streamPath?: string;
  protocol: 'webrtc' | 'hls';
  className?: string;
}

export default function StreamPlayer({ streamPath = 'stream', protocol, className = '' }: Props) {
  const { host } = useServerHost();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [state, setState] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const connectWebRTC = useCallback(async () => {
    setState('connecting');
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'connected') setState('connected');
        else if (s === 'failed' || s === 'disconnected') setState('error');
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(`http://${host}:8889/${streamPath}/whep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      if (!res.ok) throw new Error(`WHEP ${res.status}`);

      const answer = await res.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    } catch {
      setState('error');
    }
  }, [host, streamPath]);

  const connectHLS = useCallback(async () => {
    setState('connecting');
    const video = videoRef.current;
    if (!video) return;

    const hlsUrl = `http://${host}:8888/${streamPath}/index.m3u8`;

    // Safari native HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadeddata', () => setState('connected'), { once: true });
      video.addEventListener('error', () => setState('error'), { once: true });
      return;
    }

    try {
      // Load hls.js from CDN dynamically
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let Hls = (window as any).Hls;
      if (!Hls) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
          s.onload = () => resolve();
          s.onerror = () => reject();
          document.head.appendChild(s);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Hls = (window as any).Hls;
      }
      if (!Hls?.isSupported()) { setState('error'); return; }

      const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3 });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setState('connected');
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal: boolean }) => {
        if (data.fatal) setState('error');
      });
    } catch {
      setState('error');
    }
  }, [host, streamPath]);

  useEffect(() => {
    if (protocol === 'webrtc') connectWebRTC();
    else connectHLS();

    return () => {
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [protocol, connectWebRTC, connectHLS]);

  const stateColors = { connecting: 'text-yellow-400', connected: 'text-[var(--neon-green)]', error: 'text-red-400' };
  const stateLabels = { connecting: 'Connecting...', connected: 'Connected', error: 'Connection failed' };

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 rounded-full px-2.5 py-1">
        <span className={`w-2 h-2 rounded-full ${state === 'connected' ? 'bg-[var(--neon-green)] live-dot' : state === 'connecting' ? 'bg-yellow-400' : 'bg-red-500'}`} />
        <span className={`text-[10px] font-mono font-semibold ${stateColors[state]}`}>
          {stateLabels[state]}
        </span>
      </div>
    </div>
  );
}
