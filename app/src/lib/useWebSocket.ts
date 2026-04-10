'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatMessage {
  nick: string;
  color: string;
  text: string;
  timestamp: number;
}

export interface WsTrafficEntry {
  dir: 'in' | 'out';
  data: string;
  time: number;
}

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [polls, setPolls] = useState<Record<string, Record<string, number>>>({});
  const [connected, setConnected] = useState(false);
  const [traffic, setTraffic] = useState<WsTrafficEntry[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const logTraffic = useCallback((dir: 'in' | 'out', data: string) => {
    setTraffic(prev => [...prev.slice(-30), { dir, data, time: Date.now() }]);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => setConnected(true);

      ws.onmessage = (e) => {
        logTraffic('in', e.data);
        try {
          const data = JSON.parse(e.data);

          if (data.type === 'poll' && data.poll) {
            setPolls(prev => ({ ...prev, [data.poll]: data.votes }));
          } else if (data.type === 'chat' && data.nick !== 'System') {
            setMessages(prev => [...prev, { nick: data.nick, color: data.color, text: data.text, timestamp: data.timestamp }].slice(-50));
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();

      wsRef.current = ws;
    } catch {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [url, logTraffic]);

  useEffect(() => {
    setMessages([]);
    setPolls({});
    setTraffic([]);
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendMessage = useCallback((nick: string, color: string, text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ nick, color, text, timestamp: Date.now() });
      logTraffic('out', payload);
      wsRef.current.send(payload);
    }
  }, [logTraffic]);

  const sendVote = useCallback((poll: string, option: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ type: 'vote', poll, option });
      logTraffic('out', payload);
      wsRef.current.send(payload);
    }
  }, [logTraffic]);

  return { messages, polls, connected, traffic, sendMessage, sendVote };
}
