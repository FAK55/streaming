'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useServerHost } from '@/lib/ServerHostContext';
import { useWebSocket } from '@/lib/useWebSocket';

const STREAM_NAME = 'live';
type Protocol = 'webrtc' | 'hls';

export default function OverlayPage() {
  const { host } = useServerHost();

  const webrtcRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hlsInstanceRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const wsDebugEndRef = useRef<HTMLDivElement>(null);

  const [protocol, setProtocol] = useState<Protocol>('webrtc');
  const [connectionState, setConnectionState] = useState('connecting');
  const [viewers, setViewers] = useState(142);
  const [chatInput, setChatInput] = useState('');
  const [uptime, setUptime] = useState('00:00');
  const [streamVisible, setStreamVisible] = useState(false);
  const [showWsDebug, setShowWsDebug] = useState(false);

  const startTimeRef = useRef(Date.now());

  const { messages: chatMessages, polls, connected: wsConnected, traffic: wsTraffic, sendMessage: wsSend, sendVote: wsSendVote } = useWebSocket(`ws://${host}:4000`);
  const votes = polls.match || { a: 0, b: 0, c: 0 };

  /* ── players ── */
  useEffect(() => {
    if (!host) return;
    const pc = new RTCPeerConnection();
    pcRef.current = pc;
    pc.onconnectionstatechange = () => setConnectionState(pc.connectionState);
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.ontrack = (e) => {
      if (webrtcRef.current) { webrtcRef.current.srcObject = e.streams[0]; setStreamVisible(true); }
    };
    pc.createOffer()
      .then(o => { pc.setLocalDescription(o); return fetch(`http://${host}:8889/${STREAM_NAME}/whep`, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: o.sdp }); })
      .then(r => r.text()).then(sdp => pc.setRemoteDescription({ type: 'answer', sdp })).catch(() => {});

    const hlsEl = hlsRef.current;
    if (hlsEl) {
      const hlsUrl = `http://${host}:8888/${STREAM_NAME}/index.m3u8`;
      if (hlsEl.canPlayType('application/vnd.apple.mpegurl')) { hlsEl.src = hlsUrl; }
      else {
        const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        s.onload = () => { const H = (window as any).Hls; if (H?.isSupported()) { const i = new H(); hlsInstanceRef.current = i; i.loadSource(hlsUrl); i.attachMedia(hlsEl); } };
        document.head.appendChild(s);
      }
    }
    return () => { pc.close(); hlsInstanceRef.current?.destroy(); };
  }, [host]);

  /* ── timers ── */
  useEffect(() => {
    const u = setInterval(() => { const e = Math.floor((Date.now() - startTimeRef.current) / 1000); setUptime(`${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`); }, 1000);
    const v = setInterval(() => setViewers(142 + Math.floor(Math.random() * 20) - 10), 3000);
    return () => { clearInterval(u); clearInterval(v); };
  }, []);

  /* ── auto-scroll chat + ws debug ── */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { wsDebugEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [wsTraffic]);

  /* ── derived ── */
  const total = (votes.a||0) + (votes.b||0) + (votes.c||0);
  const pct = (n: number) => total === 0 ? 0 : Math.round((n / total) * 100);
  const connColor = connectionState === 'connected' ? '#39ff14' : connectionState === 'connecting' || connectionState === 'new' ? '#ffb800' : '#ff2d78';
  const connLabel = connectionState === 'connected' ? 'Connected' : connectionState === 'connecting' || connectionState === 'new' ? 'Connecting...' : 'Disconnected';
  const latency = protocol === 'webrtc' ? '<1s' : '~6s';

  function handleSend() { const t = chatInput.trim(); if (!t) return; wsSend('Presenter', '#ffd740', t); setChatInput(''); }
  function handleVote(k: 'a'|'b'|'c') { wsSendVote('match', k); }

  const WsBadge = () => (
    <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${wsConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
      <span className={`w-1 h-1 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
      WS
    </span>
  );

  return (
    <div className="h-[calc(100vh-3rem)] overflow-hidden flex" style={{ background: '#06060a' }}>
      {/* ════════════════════════ LEFT: Video Monitor ════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Video header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5" style={{ background: '#0a0a10' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-red-600/90 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider" style={{ animation: 'pulse 2s infinite' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Live
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: connColor }} />
              {connLabel}
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">/{STREAM_NAME}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {viewers}
            </div>
            <span className="text-[10px] font-mono text-zinc-600">{uptime}</span>

            {/* Protocol toggle */}
            <div className="flex rounded-md overflow-hidden border border-white/10" style={{ background: '#0d0d14' }}>
              {(['webrtc', 'hls'] as Protocol[]).map(p => (
                <button
                  key={p}
                  onClick={() => setProtocol(p)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    protocol === p
                      ? 'text-white'
                      : 'text-zinc-600 hover:text-zinc-300'
                  }`}
                  style={protocol === p ? { background: p === 'webrtc' ? 'rgba(0,240,255,0.15)' : 'rgba(255,45,120,0.15)', color: p === 'webrtc' ? '#00f0ff' : '#ff2d78' } : {}}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Video area */}
        <div className="flex-1 relative bg-black">
          <video ref={webrtcRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-contain" style={{ display: protocol === 'webrtc' ? undefined : 'none' }} />
          <video ref={hlsRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-contain" style={{ display: protocol === 'hls' ? undefined : 'none' }} />

          {!streamVisible && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-white/10 flex items-center justify-center" style={{ background: '#0d0d14' }}>
                  <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-sm mb-1">Waiting for stream</p>
                <code className="text-[11px] font-mono text-cyan-500/60">rtmp://localhost:1935/live</code>
              </div>
            </div>
          )}

          {/* latency/protocol info moved to stats strip */}
        </div>
      </div>

      {/* ════════════════════════ RIGHT: Sidebar ════════════════════════ */}
      <div className="w-[340px] flex flex-col border-l border-white/5 overflow-hidden" style={{ background: '#08080e' }}>

        {/* ── Poll ── */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 20 20" fill="currentColor"><path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.784l-1.192.24a1 1 0 0 0 0 1.96l1.192.24a1 1 0 0 1 .784.784l.24 1.192a1 1 0 0 0 1.96 0l.24-1.192a1 1 0 0 1 .784-.784l1.192-.24a1 1 0 0 0 0-1.96l-1.192-.24a1 1 0 0 1-.784-.784l-.24-1.192ZM7 4a1 1 0 0 0-2 0v1H4a1 1 0 0 0 0 2h1v1a1 1 0 0 0 2 0V7h1a1 1 0 0 0 0-2H7V4Z" /></svg>
              <span className="text-[12px] font-bold text-white uppercase tracking-wider">Live Poll</span>
            </div>
            <div className="flex items-center gap-2">
              <WsBadge />
              <span className="text-[10px] font-mono text-zinc-600">{total}</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mb-3">Who will win this round?</p>

          {([
            { key: 'a' as const, label: 'Team Alpha', color: '#ff2d78' },
            { key: 'b' as const, label: 'Team Bravo', color: '#00f0ff' },
            { key: 'c' as const, label: 'Draw', color: '#39ff14' },
          ]).map(opt => (
            <button key={opt.key} onClick={() => handleVote(opt.key)} className="w-full mb-2 group cursor-pointer">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-300 group-hover:text-white transition-colors">{opt.label}</span>
                <span className="font-mono" style={{ color: opt.color }}>{pct(votes[opt.key])}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct(votes[opt.key])}%`, background: opt.color }} />
              </div>
            </button>
          ))}
        </div>

        {/* ── Chat ── */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 0 0 1.33 0l1.713-3.293a.783.783 0 0 1 .642-.413 41.102 41.102 0 0 0 3.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2ZM6.75 6a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 2.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z" clipRule="evenodd" /></svg>
              <span className="text-[12px] font-bold text-white uppercase tracking-wider">Chat</span>
            </div>
            <WsBadge />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-0">
            {chatMessages.length === 0 && (
              <p className="text-zinc-600 text-[11px] text-center py-8">No messages yet</p>
            )}
            {chatMessages.slice(-30).map((msg, i) => (
              <div key={`${msg.timestamp}-${i}`} className="text-[12px] leading-relaxed py-0.5" style={{ animation: 'fadeIn 0.2s ease' }}>
                <span className="font-bold mr-1" style={{ color: msg.color }}>{msg.nick}</span>
                <span className="text-zinc-400">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="px-3 py-2 border-t border-white/5">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Send as Presenter..."
                className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-[12px] text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/40 transition-colors"
              />
              <button type="submit" className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all" style={{ background: 'rgba(0,240,255,0.1)', color: '#00f0ff', border: '1px solid rgba(0,240,255,0.2)' }}>
                Send
              </button>
            </div>
          </form>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {([
            { label: 'UPTIME', value: uptime, color: '#00f0ff' },
            { label: 'LATENCY', value: latency, color: protocol === 'webrtc' ? '#39ff14' : '#ffb800' },
            { label: 'PROTOCOL', value: protocol.toUpperCase(), color: protocol === 'webrtc' ? '#00f0ff' : '#ff2d78' },
          ]).map(s => (
            <div key={s.label} className="px-3 py-3 text-center" style={{ background: '#08080e' }}>
              <div className="text-[16px] font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[8px] text-zinc-600 uppercase tracking-[0.15em] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════ WS Debug Toggle ════════════════════════ */}
      <button
        onClick={() => setShowWsDebug(!showWsDebug)}
        className="fixed bottom-3 right-[356px] z-50 rounded-md px-2.5 py-1 text-[9px] font-mono transition-all flex items-center gap-1.5"
        style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.08)', color: wsConnected ? '#39ff14' : '#ff2d78' }}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
        WS {showWsDebug ? '▾' : '▸'}
      </button>

      {showWsDebug && (
        <div className="fixed bottom-10 right-[356px] z-50 w-[400px] max-h-[280px] rounded-lg overflow-hidden font-mono text-[10px]" style={{ background: '#0a0a12', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between">
            <span className="text-zinc-400 font-bold text-[10px]">WebSocket Traffic</span>
            <span className="text-zinc-700 text-[9px]">ws://{host}:4000</span>
          </div>
          <div className="overflow-y-auto max-h-[240px] p-1.5 space-y-0.5">
            {wsTraffic.length === 0 && (
              <div className="text-zinc-700 text-center py-6">Send a message or vote to see traffic</div>
            )}
            {wsTraffic.map((entry, i) => (
              <div
                key={`${entry.time}-${i}`}
                className="px-2 py-1 rounded leading-relaxed break-all"
                style={{
                  background: entry.dir === 'out' ? 'rgba(0,240,255,0.04)' : 'rgba(255,184,0,0.04)',
                  borderLeft: `2px solid ${entry.dir === 'out' ? '#00f0ff' : '#ffb800'}`,
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <span className="font-bold mr-1.5" style={{ color: entry.dir === 'out' ? '#00f0ff' : '#ffb800' }}>
                  {entry.dir === 'out' ? '↑' : '↓'}
                </span>
                <span className="text-zinc-400">{entry.data}</span>
              </div>
            ))}
            <div ref={wsDebugEndRef} />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
