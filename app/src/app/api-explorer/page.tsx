'use client';

import { useServerHost } from '@/lib/ServerHostContext';
import { useState, useEffect, useRef, useCallback } from 'react';

interface TabDef {
  label: string;
  endpoint: string;
}

const TABS: TabDef[] = [
  { label: 'Paths (Active Streams)', endpoint: '/v3/paths/list' },
  { label: 'RTMP Connections', endpoint: '/v3/rtmpconns/list' },
  { label: 'HLS Muxers', endpoint: '/v3/hlsmuxers/list' },
  { label: 'WebRTC Sessions', endpoint: '/v3/webrtcsessions/list' },
  { label: 'RTSP Connections', endpoint: '/v3/rtspconns/list' },
  { label: 'SRT Connections', endpoint: '/v3/srtconns/list' },
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightJson(jsonStr: string): string {
  let str = escapeHtml(jsonStr);
  // Keys
  str = str.replace(
    /(")((?:\\.|[^"\\])*)(")\s*:/g,
    '<span class="jk">"$2"</span>:'
  );
  // String values after colon
  str = str.replace(
    /:\s*(")((?:\\.|[^"\\])*)(")/g,
    ': <span class="js">"$2"</span>'
  );
  // Strings in arrays
  str = str.replace(
    /([\[,]\s*)(")((?:\\.|[^"\\])*)(")/g,
    '$1<span class="js">"$3"</span>'
  );
  // Numbers
  str = str.replace(
    /:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)([\s,\n\r\]}])/g,
    ': <span class="jn">$1</span>$2'
  );
  // Booleans
  str = str.replace(
    /:\s*(true|false)([\s,\n\r\]}])/g,
    ': <span class="jb">$1</span>$2'
  );
  // Null
  str = str.replace(
    /:\s*(null)([\s,\n\r\]}])/g,
    ': <span class="jl">$1</span>$2'
  );
  return str;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || isNaN(bytes) || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

export default function ApiExplorerPage() {
  const { host } = useServerHost();
  const apiBase = `http://${host}:9997`;

  const [activeTab, setActiveTab] = useState(0);
  const [jsonHtml, setJsonHtml] = useState('Loading...');
  const [rawJson, setRawJson] = useState('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isError, setIsError] = useState(false);
  const [copied, setCopied] = useState(false);

  const [statStreams, setStatStreams] = useState<string>('--');
  const [statInbound, setStatInbound] = useState<string>('--');
  const [statOutbound, setStatOutbound] = useState<string>('--');
  const [statReaders, setStatReaders] = useState<string>('--');

  const endpointRef = useRef(TABS[0].endpoint);

  const updateStats = useCallback((data: Record<string, unknown>) => {
    const items = (Array.isArray((data as { items?: unknown[] }).items)
      ? (data as { items: Record<string, unknown>[] }).items
      : []) as Record<string, unknown>[];
    const count = items.length;
    let inbound = 0;
    let outbound = 0;
    let readers = 0;

    for (const item of items) {
      if (typeof item.bytesReceived === 'number') inbound += item.bytesReceived;
      if (typeof item.bytesSent === 'number') outbound += item.bytesSent;
      if (Array.isArray(item.readers)) readers += item.readers.length;
    }

    setStatStreams(String(count));
    setStatInbound(formatBytes(inbound));
    setStatOutbound(formatBytes(outbound));
    setStatReaders(String(readers));
  }, []);

  const fetchPathsForStats = useCallback(() => {
    fetch(`${apiBase}/v3/paths/list`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('not ok');
      })
      .then((data: Record<string, unknown>) => updateStats(data))
      .catch(() => {});
  }, [apiBase, updateStats]);

  const fetchEndpoint = useCallback(() => {
    const endpoint = endpointRef.current;
    const url = apiBase + endpoint;
    const t0 = performance.now();

    fetch(url)
      .then((res) => {
        const elapsed = Math.round(performance.now() - t0);
        setStatusCode(res.status);
        setResponseTime(elapsed);
        setIsError(res.status < 200 || res.status >= 300);

        return res.json().then((data: Record<string, unknown>) => {
          const raw = JSON.stringify(data, null, 2);
          setRawJson(raw);
          setJsonHtml(highlightJson(raw));

          if (endpoint === '/v3/paths/list') {
            updateStats(data);
          } else {
            fetchPathsForStats();
          }
        });
      })
      .catch(() => {
        setIsError(true);
        setStatusCode(null);
        setResponseTime(null);
        setRawJson('');
        setJsonHtml('');
      });
  }, [apiBase, updateStats, fetchPathsForStats]);

  // Auto-refresh every 2s
  useEffect(() => {
    endpointRef.current = TABS[activeTab].endpoint;
    fetchEndpoint();
    const interval = setInterval(fetchEndpoint, 2000);
    return () => clearInterval(interval);
  }, [activeTab, fetchEndpoint]);

  const copyJson = useCallback(() => {
    if (!rawJson) return;
    navigator.clipboard.writeText(rawJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [rawJson]);

  const displayedUrl = apiBase + TABS[activeTab].endpoint;

  return (
    <div className="px-5 py-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold mb-1">
        <span className="text-[var(--neon-cyan)]">API</span> Explorer
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-5 flex items-center gap-2">
        Live MediaMTX REST API responses -- everything is programmable.
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--neon-green)] shadow-[0_0_4px_var(--neon-green)] animate-pulse" />
        Auto-refreshing every 2s
      </p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TABS.map((tab, i) => (
          <button
            key={tab.endpoint}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-md text-[13px] font-semibold border transition-all cursor-pointer select-none ${
              i === activeTab
                ? 'text-[#0f0f0f] bg-[var(--neon-cyan)] border-[var(--neon-cyan)]'
                : 'text-[#888] bg-[var(--bg-card)] border-[#2a2a2a] hover:text-white hover:border-[#444]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* JSON Panel */}
      <div className="bg-[var(--bg-secondary)] border border-[#2a2a2a] rounded-[10px] overflow-hidden mb-5">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-card)] border-b border-[#2a2a2a] text-[13px] gap-3 flex-wrap">
          <div className="font-mono text-xs text-[var(--neon-cyan)] flex-1 min-w-[200px]">
            <span className="text-[var(--neon-green)] font-bold mr-1.5">GET</span>
            {displayedUrl}
          </div>
          <div className="flex gap-3.5 items-center text-xs text-[var(--text-muted)]">
            {statusCode !== null ? (
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  statusCode >= 200 && statusCode < 300
                    ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]'
                    : 'bg-red-500/20 text-red-500'
                }`}
              >
                {statusCode}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-red-500/20 text-red-500">
                ERR
              </span>
            )}
            <span className="text-[var(--neon-amber)]">
              {responseTime !== null ? `${responseTime} ms` : '-- ms'}
            </span>
            <button
              onClick={copyJson}
              className={`px-3 py-1 rounded text-[11px] font-semibold border cursor-pointer transition-all ${
                copied
                  ? 'text-[var(--neon-green)] border-[var(--neon-green)]'
                  : 'bg-[#2a2a2a] text-[#888] border-[#3a3a3a] hover:text-white hover:border-[#555]'
              }`}
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-auto max-h-[55vh]">
          {isError && !jsonHtml ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_red] animate-pulse" />
              <div className="text-red-500 text-[15px] font-semibold">
                MediaMTX API unreachable at {host}:9997
              </div>
              <div className="text-[#666] text-[13px]">
                Make sure MediaMTX is running and the API is enabled on port 9997.
              </div>
            </div>
          ) : (
            <pre
              className="font-mono text-[13px] leading-relaxed text-[#ccc] whitespace-pre tab-2"
              dangerouslySetInnerHTML={{ __html: jsonHtml }}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Streams', value: statStreams, color: 'text-[var(--neon-cyan)]' },
          { label: 'Total Inbound', value: statInbound, color: 'text-[var(--neon-green)]' },
          { label: 'Total Outbound', value: statOutbound, color: 'text-[var(--neon-amber)]' },
          { label: 'Connected Readers', value: statReaders, color: 'text-[var(--neon-magenta)]' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--bg-secondary)] border border-[#2a2a2a] rounded-[10px] p-4 text-center hover:border-[#444] transition-colors"
          >
            <div className="text-[11px] uppercase tracking-[1px] text-[#666] mb-1.5">
              {stat.label}
            </div>
            <div className={`text-[28px] font-bold font-mono ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Syntax highlight styles */}
      <style>{`
        .jk { color: var(--neon-cyan); }
        .js { color: var(--neon-green); }
        .jn { color: var(--neon-amber); }
        .jb { color: var(--neon-magenta); }
        .jl { color: #666; }
      `}</style>
    </div>
  );
}
