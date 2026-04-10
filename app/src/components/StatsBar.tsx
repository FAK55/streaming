'use client';

import { useState, useEffect } from 'react';
import { useServerHost } from '@/lib/ServerHostContext';

interface PathInfo {
  name: string;
  readyTime?: string;
  source?: { type: string } | null;
  readers?: { type: string }[];
}

interface Props {
  streamPath?: string;
}

export default function StatsBar({ streamPath = 'stream' }: Props) {
  const { host } = useServerHost();
  const [info, setInfo] = useState<PathInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`http://${host}:9997/v3/paths/list`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const match = data.items?.find((p: PathInfo) => p.name === streamPath);
        if (active) { setInfo(match || null); setError(false); }
      } catch {
        if (active) setError(true);
      }
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => { active = false; clearInterval(id); };
  }, [host, streamPath]);

  const uptime = (() => {
    if (!info?.readyTime) return '--';
    const secs = Math.floor((Date.now() - new Date(info.readyTime).getTime()) / 1000);
    if (secs < 0) return '--';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  })();

  const protocol = info?.source?.type || '--';
  const viewers = info?.readers?.length ?? 0;

  const items = [
    { label: 'UPTIME', value: uptime, color: 'var(--neon-cyan)' },
    { label: 'PROTOCOL', value: protocol.toUpperCase(), color: 'var(--neon-green)' },
    { label: 'LATENCY', value: protocol !== '--' ? '~200ms' : '--', color: 'var(--neon-amber)' },
    { label: 'VIEWERS', value: `${viewers}`, color: 'var(--neon-magenta)' },
  ];

  return (
    <div
      className="w-full px-4 py-2 flex items-center justify-between"
      style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4))',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {error && (
        <span className="text-[10px] text-red-400 font-mono">API unavailable</span>
      )}
      {!error && items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-semibold">{item.label}</span>
          <span className="text-xs font-mono font-bold" style={{ color: item.color }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
