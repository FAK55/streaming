const { WebSocketServer, WebSocket } = require('ws');

const port = parseInt(process.env.CHAT_PORT || '4000', 10);
const wss = new WebSocketServer({ port });
const clients = new Set();
const chatHistory = [];
const MAX_HISTORY = 50;

// Named polls — each poll has its own vote state
const polls = {
  protocol: { webrtc: 0, hls: 0, rtmp: 0, srt: 0 },
  match: { a: 0, b: 0, c: 0 },
};

function broadcast(data) {
  for (const c of clients) {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send chat history
  for (const msg of chatHistory) {
    ws.send(msg);
  }

  // Send all poll states
  for (const [name, votes] of Object.entries(polls)) {
    ws.send(JSON.stringify({ type: 'poll', poll: name, votes }));
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'vote' && msg.poll && msg.option && polls[msg.poll] && msg.option in polls[msg.poll]) {
        polls[msg.poll][msg.option]++;
        broadcast(JSON.stringify({ type: 'poll', poll: msg.poll, votes: polls[msg.poll] }));
      } else if (msg.nick && msg.text) {
        const data = JSON.stringify({ type: 'chat', nick: msg.nick, color: msg.color, text: msg.text, timestamp: Date.now() });
        chatHistory.push(data);
        if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
        broadcast(data);
      }
    } catch {}
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

console.log(`> Chat + Poll WebSocket server on ws://0.0.0.0:${port}`);
