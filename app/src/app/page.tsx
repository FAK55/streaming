'use client';

import { useState, useEffect, useRef } from 'react';
import { useServerHost } from '@/lib/ServerHostContext';

/* ───────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────── */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function formatUptime(isoString: string | null): string {
  if (!isoString) return '--:--:--';
  const start = new Date(isoString);
  const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
  if (elapsed < 0) return '--:--:--';
  const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

/* ───────────────────────────────────────────
   Dashboard page component
   ─────────────────────────────────────────── */
export default function DashboardPage() {
  const { host } = useServerHost();

  // ── WebRTC player ──
  const webrtcVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // ── Stream stats state ──
  const [stats, setStats] = useState({
    status: 'connecting',
    uptime: '--:--:--',
    readers: '--',
    codec: '--',
    resolution: '--',
    profile: '--',
    ingest: '--',
    inbound: '--',
    outbound: '--',
  });
  const [rtmpCount, setRtmpCount] = useState(0);
  const [hlsCount, setHlsCount] = useState(0);
  const [webrtcCount, setWebrtcCount] = useState(0);
  const [bandwidthHistory, setBandwidthHistory] = useState<number[]>(new Array(24).fill(0));
  const [bandwidthLabel, setBandwidthLabel] = useState('-- Mbps');
  const prevBytesRef = useRef(0);
  const prevTimeRef = useRef(0);
  const streamOnlineTimeRef = useRef<string | null>(null);

  // ── WebRTC WHEP connection ──
  useEffect(() => {
    if (!host) return;
    const video = webrtcVideoRef.current;
    if (!video) return;

    const pc = new RTCPeerConnection();
    pcRef.current = pc;
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.ontrack = (e) => {
      video.srcObject = e.streams[0];
    };

    pc.createOffer()
      .then((offer) => {
        pc.setLocalDescription(offer);
        return fetch(`http://${host}:8889/live/whep`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        });
      })
      .then((res) => res.text())
      .then((sdp) => {
        pc.setRemoteDescription({ type: 'answer', sdp });
      })
      .catch(() => {});

    return () => {
      pc.close();
      pcRef.current = null;
    };
  }, [host]);

  // ── Stream stats fetching ──
  useEffect(() => {
    if (!host) return;
    const apiBase = `http://${host}:9997/v3`;

    const fetchStats = async () => {
      try {
        const [pathsRes, rtmpRes, hlsRes, webrtcRes] = await Promise.all([
          fetch(`${apiBase}/paths/list`).then((r) => r.json()).catch(() => ({ items: [] })),
          fetch(`${apiBase}/rtmpconns/list`).then((r) => r.json()).catch(() => ({ items: [] })),
          fetch(`${apiBase}/hlsmuxers/list`).then((r) => r.json()).catch(() => ({ items: [] })),
          fetch(`${apiBase}/webrtcsessions/list`).then((r) => r.json()).catch(() => ({ items: [] })),
        ]);

        setRtmpCount((rtmpRes.items || []).length);
        setHlsCount((hlsRes.items || []).length);
        setWebrtcCount((webrtcRes.items || []).length);

        if (pathsRes.items && pathsRes.items.length > 0) {
          const stream = pathsRes.items[0];
          const isOnline = stream.ready && stream.online;
          streamOnlineTimeRef.current = stream.onlineTime || stream.readyTime || null;

          let codec = '--';
          let resolution = '--';
          let profile = '--';
          if (stream.tracks2) {
            const video = stream.tracks2.find((t: any) => t.codecProps && t.codecProps.width);
            const audio = stream.tracks2.find((t: any) => t.codecProps && t.codecProps.sampleRate);
            if (video) {
              codec = audio ? `${video.codec} + ${audio.codec}` : video.codec;
              resolution = `${video.codecProps.width}\u00d7${video.codecProps.height}`;
              profile = `${video.codecProps.profile} ${video.codecProps.level}`;
            }
          }

          const ingestType = stream.source
            ? stream.source.type.replace('Conn', '').toUpperCase()
            : '--';

          const readers = stream.readers ? stream.readers.length : 0;

          // Bandwidth calculation
          const now = Date.now();
          const currentBytes = stream.inboundBytes || 0;
          if (prevBytesRef.current > 0 && prevTimeRef.current > 0) {
            const dtSec = (now - prevTimeRef.current) / 1000;
            const bps = ((currentBytes - prevBytesRef.current) * 8) / dtSec;
            const mbps = bps / 1_000_000;
            setBandwidthHistory((prev) => {
              const next = [...prev, mbps];
              next.shift();
              return next;
            });
            setBandwidthLabel(`${mbps.toFixed(2)} Mbps`);
          }
          prevBytesRef.current = currentBytes;
          prevTimeRef.current = now;

          setStats({
            status: isOnline ? 'online' : 'offline',
            uptime: formatUptime(streamOnlineTimeRef.current),
            readers: String(readers),
            codec,
            resolution,
            profile,
            ingest: ingestType,
            inbound: formatBytes(stream.inboundBytes || 0),
            outbound: formatBytes(stream.outboundBytes || 0),
          });
        } else {
          setStats((prev) => ({ ...prev, status: 'no stream' }));
          streamOnlineTimeRef.current = null;
        }
      } catch {
        setStats((prev) => ({ ...prev, status: 'api error' }));
      }
    };

    fetchStats();
    const iv = setInterval(fetchStats, 2000);
    return () => clearInterval(iv);
  }, [host]);

  // ── Uptime ticker ──
  useEffect(() => {
    const iv = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        uptime: formatUptime(streamOnlineTimeRef.current),
      }));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // ── Bandwidth graph max ──
  const bwMax = Math.max(...bandwidthHistory, 0.1);
  const statusOnline = stats.status === 'online';

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-8">

      {/* ═══════════════════════════════════════════
          SECTION 1: Latency Comparison
          ═══════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-bold text-xl text-white">Latency Comparison</h2>
          <span className="tag bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/20">
            live demo
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* WebRTC panel */}
          <div
            className="panel p-4"
            style={{ boxShadow: '0 0 20px rgba(0,240,255,0.15), inset 0 0 20px rgba(0,240,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full bg-[var(--neon-cyan)]"
                  style={{ boxShadow: '0 0 8px rgba(0,240,255,0.5)' }}
                />
                <span className="font-bold text-white">WebRTC</span>
                <span className="font-mono text-[10px] text-gray-500">WHEP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tag bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20">
                  &lt;1s latency
                </span>
                <span className="font-mono text-[10px] text-gray-600">:8889</span>
              </div>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[var(--neon-cyan)]/10">
              <video
                ref={webrtcVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 font-mono">
              UDP frame-by-frame &middot; instant playback &middot; ideal for interaction
            </p>
          </div>

          {/* HLS panel */}
          <div
            className="panel p-4"
            style={{ boxShadow: '0 0 20px rgba(255,45,120,0.15), inset 0 0 20px rgba(255,45,120,0.03)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full bg-[var(--neon-magenta)]"
                  style={{ boxShadow: '0 0 8px rgba(255,45,120,0.5)' }}
                />
                <span className="font-bold text-white">HLS</span>
                <span className="font-mono text-[10px] text-gray-500">HTTP Live Streaming</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tag bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border border-[var(--neon-amber)]/20">
                  ~6s latency
                </span>
                <span className="font-mono text-[10px] text-gray-600">:8888</span>
              </div>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[var(--neon-magenta)]/10">
              <iframe
                src={`http://${host}:8888/live`}
                allow="autoplay"
                className="w-full h-full border-none"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 font-mono">
              Segmented delivery &middot; high compatibility &middot; passive viewing
            </p>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="panel p-4">
            <h4 className="font-bold text-white text-sm mb-2">Why the difference?</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              HLS breaks video into segments (2-6s each), and the player must buffer 2-3 segments before playback begins.
              WebRTC streams frame-by-frame over UDP, like a video call &mdash; no buffering, no segmentation.
            </p>
          </div>
          <div className="panel p-4">
            <h4 className="font-bold text-[var(--neon-magenta)] text-sm mb-2">When to use HLS</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Large audiences, broad device support, passive viewing. Works everywhere including smart TVs and older browsers.
              Great when a 6-second delay is acceptable.
            </p>
          </div>
          <div className="panel p-4">
            <h4 className="font-bold text-[var(--neon-cyan)] text-sm mb-2">When to use WebRTC</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Interactive features: live polls, predictions, chat-driven mechanics, audience participation.
              Sub-second latency makes real-time interaction possible.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2: Stream Stats
          ═══════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-bold text-xl text-white">Stream Stats</h2>
          {statusOnline && (
            <span className="tag bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20 live-dot">
              LIVE
            </span>
          )}
          {!statusOnline && (
            <span className="tag bg-white/5 text-gray-500 border border-white/10">
              {stats.status}
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Status', value: stats.status, color: statusOnline ? 'var(--neon-green)' : '#888' },
            { label: 'Uptime', value: stats.uptime, color: 'var(--neon-cyan)' },
            { label: 'Codec', value: stats.codec, color: 'var(--text-primary)' },
            { label: 'Resolution', value: stats.resolution, color: 'var(--text-primary)' },
            { label: 'Profile', value: stats.profile, color: 'var(--text-primary)' },
            { label: 'Ingest', value: stats.ingest, color: 'var(--neon-amber)' },
            { label: 'Inbound', value: stats.inbound, color: 'var(--neon-cyan)' },
            { label: 'Outbound', value: stats.outbound, color: 'var(--neon-magenta)' },
            { label: 'Readers', value: stats.readers, color: 'var(--neon-purple)' },
            { label: 'RTMP Conns', value: String(rtmpCount), color: 'var(--neon-amber)' },
            { label: 'HLS Muxers', value: String(hlsCount), color: 'var(--neon-magenta)' },
            { label: 'WebRTC Sessions', value: String(webrtcCount), color: 'var(--neon-cyan)' },
          ].map((item) => (
            <div key={item.label} className="panel p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{item.label}</div>
              <div className="font-mono text-sm font-bold" style={{ color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bandwidth graph */}
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Inbound Bandwidth</h3>
              <span className="font-mono text-[10px] text-gray-500">24-point history</span>
            </div>
            <span className="font-mono text-sm text-[var(--neon-cyan)]">{bandwidthLabel}</span>
          </div>
          <div className="flex items-end gap-[3px] h-24">
            {bandwidthHistory.map((val, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max((val / bwMax) * 100, 2)}%`,
                  background: `linear-gradient(to top, rgba(0,240,255,0.6), rgba(0,240,255,0.2))`,
                  opacity: 0.4 + (i / bandwidthHistory.length) * 0.6,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-600 font-mono">-48s</span>
            <span className="text-[9px] text-gray-600 font-mono">now</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3: Protocol Reference
          ═══════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-bold text-xl text-white">Protocol Reference</h2>
        </div>

        {/* Group 1 — Ingest Protocol */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">
            Ingest Protocol &mdash; how streams get TO the server
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div
              className="panel p-5 border-l-2"
              style={{ borderLeftColor: '#ffb800', boxShadow: '0 0 12px rgba(255,184,0,0.08)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffb800', boxShadow: '0 0 6px rgba(255,184,0,0.5)' }} />
                  <span className="font-bold text-white">RTMP</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border border-[var(--neon-amber)]/20">
                    Port 1935
                  </span>
                  <span className="tag bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border border-[var(--neon-amber)]/20">
                    1-3s
                  </span>
                  <span className="tag bg-white/5 text-gray-400 border border-white/10">
                    Ingest only
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                The universal standard for pushing streams from encoders (OBS, FFmpeg) to a server.
                Not for browser playback &mdash; Flash is dead.
              </p>
            </div>
          </div>
        </div>

        {/* Group 2 — Browser Playback Protocols */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">
            Browser Playback Protocols &mdash; how viewers watch in browsers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WebRTC (WHEP) */}
            <div
              className="panel p-5 border-l-2"
              style={{ borderLeftColor: '#00f0ff', boxShadow: '0 0 12px rgba(0,240,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#00f0ff', boxShadow: '0 0 6px rgba(0,240,255,0.5)' }} />
                  <span className="font-bold text-white">WebRTC (WHEP)</span>
                </div>
                <span className="tag bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/20">
                  Browser &#10003;
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="tag bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/20">
                  Port 8889
                </span>
                <span className="tag bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20">
                  &lt;1s
                </span>
                <span className="tag bg-white/5 text-gray-400 border border-white/10">
                  Both
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Sub-second frame-by-frame delivery over UDP. Essential for interactive features.
                WHIP for browser publishing, WHEP for browser playback.
              </p>
            </div>

            {/* HLS / LL-HLS */}
            <div
              className="panel p-5 border-l-2"
              style={{ borderLeftColor: '#ff2d78', boxShadow: '0 0 12px rgba(255,45,120,0.08)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff2d78', boxShadow: '0 0 6px rgba(255,45,120,0.5)' }} />
                  <span className="font-bold text-white">HLS / LL-HLS</span>
                </div>
                <span className="tag bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] border border-[var(--neon-magenta)]/20">
                  Browser &#10003;
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="tag bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] border border-[var(--neon-magenta)]/20">
                  Port 8888
                </span>
                <span className="tag bg-[var(--neon-amber)]/10 text-[var(--neon-amber)] border border-[var(--neon-amber)]/20">
                  2-30s
                </span>
                <span className="tag bg-white/5 text-gray-400 border border-white/10">
                  Playback
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Segments video into small files served over HTTP. Works on every device and CDN.
                LL-HLS reduces latency to 2-5s with partial segments.
              </p>
            </div>
          </div>
        </div>

        {/* Group 3 — Specialized Protocols */}
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">
            Specialized Protocols &mdash; non-browser, niche use cases
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RTSP */}
            <div
              className="panel p-5 border-l-2"
              style={{ borderLeftColor: '#b026ff', boxShadow: '0 0 12px rgba(176,38,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#b026ff', boxShadow: '0 0 6px rgba(176,38,255,0.5)' }} />
                  <span className="font-bold text-white">RTSP</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag bg-[var(--neon-purple)]/10 text-[var(--neon-purple)] border border-[var(--neon-purple)]/20">
                    Port 8554
                  </span>
                  <span className="tag bg-[var(--neon-purple)]/10 text-[var(--neon-purple)] border border-[var(--neon-purple)]/20">
                    ~1s
                  </span>
                  <span className="tag bg-white/5 text-gray-400 border border-white/10">
                    Both
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                IP camera and surveillance standard. Efficient over LAN/UDP.
                No browser support &mdash; use VLC or FFplay.
              </p>
            </div>

            {/* SRT */}
            <div
              className="panel p-5 border-l-2"
              style={{ borderLeftColor: '#39ff14', boxShadow: '0 0 12px rgba(57,255,20,0.08)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#39ff14', boxShadow: '0 0 6px rgba(57,255,20,0.5)' }} />
                  <span className="font-bold text-white">SRT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tag bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20">
                    Port 8890
                  </span>
                  <span className="tag bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20">
                    ~1s
                  </span>
                  <span className="tag bg-white/5 text-gray-400 border border-white/10">
                    Both
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Reliable delivery over lossy networks with built-in error correction.
                Ideal for remote contribution over bad Wi-Fi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Footer
          ═══════════════════════════════════════════ */}
      <footer className="border-t border-white/5 pt-4 pb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600 font-mono">
            GameJam 2026 &middot; Workshop W-4 &middot; Powered by MediaMTX
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <a
              href={`http://${host}:9997/v3/paths/list`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[var(--neon-cyan)] transition-colors"
            >
              API
            </a>
            <a
              href={`http://${host}:8889/live/whep`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[var(--neon-cyan)] transition-colors"
            >
              WebRTC
            </a>
            <a
              href={`http://${host}:8888/live`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[var(--neon-magenta)] transition-colors"
            >
              HLS
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
