'use client';

import { useState, useEffect, useCallback } from 'react';

interface PollOption {
  label: string;
  color: string;
}

interface Props {
  title?: string;
  options?: PollOption[];
}

const DEFAULT_OPTIONS: PollOption[] = [
  { label: 'WebRTC', color: 'var(--neon-cyan)' },
  { label: 'HLS', color: 'var(--neon-magenta)' },
  { label: 'RTMP', color: 'var(--neon-green)' },
  { label: 'SRT', color: 'var(--neon-amber)' },
];

export default function PollWidget({ title = 'Preferred Streaming Protocol?', options = DEFAULT_OPTIONS }: Props) {
  const [votes, setVotes] = useState<number[]>(() => options.map(() => 0));
  const [voted, setVoted] = useState<number | null>(null);

  const total = votes.reduce((a, b) => a + b, 0);

  const castVote = (idx: number) => {
    if (voted !== null) return;
    setVoted(idx);
    setVotes((prev) => prev.map((v, i) => (i === idx ? v + 1 : v)));
  };

  // Simulated background votes
  const simulateVote = useCallback(() => {
    setVotes((prev) => {
      const i = Math.floor(Math.random() * prev.length);
      return prev.map((v, j) => (j === i ? v + 1 : v));
    });
  }, []);

  useEffect(() => {
    const id = setInterval(simulateVote, 3000 + Math.random() * 4000);
    return () => clearInterval(id);
  }, [simulateVote]);

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const pct = total > 0 ? (votes[i] / total) * 100 : 0;
          return (
            <button
              key={opt.label}
              onClick={() => castVote(i)}
              disabled={voted !== null}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold" style={{ color: voted === i ? opt.color : 'var(--text-primary)' }}>
                  {opt.label}
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  {pct.toFixed(0)}% ({votes[i]})
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, background: opt.color, opacity: voted === i ? 1 : 0.6 }}
                />
              </div>
            </button>
          );
        })}
      </div>
      {voted !== null && (
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          You voted for {options[voted].label}
        </p>
      )}
    </div>
  );
}
