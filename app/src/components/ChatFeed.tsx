'use client';

import { useRef, useEffect, useState, FormEvent } from 'react';
import { useWebSocket } from '@/lib/useWebSocket';
import { useServerHost } from '@/lib/ServerHostContext';

const VIEWER_COLORS = ['#00f0ff', '#ff2d78', '#39ff14', '#b026ff', '#ffb800', '#ff6b6b', '#4ecdc4'];
const VIEWER_NAMES = ['Pixel', 'Glitch', 'Nova', 'Echo', 'Blitz', 'Spark', 'Drift', 'Flux', 'Pulse', 'Vibe'];

function randomViewer() {
  return {
    nick: VIEWER_NAMES[Math.floor(Math.random() * VIEWER_NAMES.length)] + Math.floor(Math.random() * 100),
    color: VIEWER_COLORS[Math.floor(Math.random() * VIEWER_COLORS.length)],
  };
}

interface Props {
  maxMessages?: number;
  showInput?: boolean;
  presenterMode?: boolean;
}

export default function ChatFeed({ maxMessages = 50, showInput = false, presenterMode = false }: Props) {
  const { host } = useServerHost();
  const { messages, connected, sendMessage } = useWebSocket(`ws://${host}:4000`);
  const [input, setInput] = useState('');
  const [viewer] = useState(() => presenterMode ? { nick: 'Presenter', color: '#ffd740' } : randomViewer());
  const bottomRef = useRef<HTMLDivElement>(null);

  const visible = messages.slice(-maxMessages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visible.length]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(viewer.nick, viewer.color, trimmed);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 12 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs font-semibold text-gray-400">CHAT</span>
        <span className={`text-[10px] font-mono ${connected ? 'text-[var(--neon-green)]' : 'text-red-500'}`}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
        {visible.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className="text-sm leading-relaxed animate-[fadeIn_0.3s_ease-out]"
            style={{ animation: 'fadeIn 0.3s ease-out' }}
          >
            <span className="font-bold mr-1.5" style={{ color: msg.color }}>{msg.nick}</span>
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {showInput && (
        <form onSubmit={handleSend} className="flex gap-2 px-3 py-2 border-t border-white/5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Chat as ${viewer.nick}...`}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[var(--neon-cyan)]/50"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] text-xs font-semibold hover:bg-[var(--neon-cyan)]/30 transition-colors"
          >
            Send
          </button>
        </form>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
