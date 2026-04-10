import { createServer } from 'http';
import { parse } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';

// Load the standalone Next.js server handler
const nextServer = require(path.join(__dirname, '..', '.next', 'standalone', 'node_modules', 'next', 'dist', 'server', 'next-server')).default;

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

// This approach doesn't work well with standalone. Let's use a simpler pattern.
// We'll run the WebSocket server on a separate port alongside the standalone server.

const wss = new WebSocketServer({ port: 4000 });
const clients = new Set<WebSocket>();

const broadcast = (data: string) => {
  for (const c of clients) {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  }
};

const sendCount = () => {
  broadcast(JSON.stringify({
    nick: 'System', color: '#888', text: `${clients.size} viewer(s) connected`, timestamp: Date.now(),
  }));
};

wss.on('connection', (ws) => {
  clients.add(ws);
  sendCount();

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.nick && msg.text) broadcast(JSON.stringify({ ...msg, timestamp: Date.now() }));
    } catch {}
  });

  ws.on('close', () => {
    clients.delete(ws);
    sendCount();
  });
});

console.log(`> WebSocket chat server on ws://localhost:4000/`);
