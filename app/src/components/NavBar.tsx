'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useServerHost } from '@/lib/ServerHostContext';
import { useState } from 'react';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/overlay', label: 'Overlay' },
  { href: '/whip', label: 'WHIP Ingest' },
  { href: '/api-explorer', label: 'API' },
];

export default function NavBar() {
  const pathname = usePathname();
  const { host, setHost } = useServerHost();
  const [input, setInput] = useState(host);

  const apply = () => {
    if (input.trim()) {
      setHost(input.trim());
      window.location.reload();
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#08080c]/90 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-magenta)] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          </div>
          <span className="font-bold text-sm">
            <span className="text-[var(--neon-cyan)] glow-cyan">Stream</span>
            <span className="text-white">Lab</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                pathname === l.href
                  ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}

          <div className="flex items-center gap-1.5 ml-3 bg-[var(--bg-surface)] rounded-lg px-2 py-1">
            <span className="text-[10px] text-gray-500 font-mono">SERVER</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              className="bg-[var(--bg-primary)] border border-white/10 rounded px-2 py-0.5 font-mono text-xs text-[var(--neon-cyan)] w-32 outline-none focus:border-[var(--neon-cyan)]/50"
            />
            <button
              onClick={apply}
              className="px-2 py-0.5 rounded bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] text-[10px] font-semibold hover:bg-[var(--neon-cyan)]/30 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
