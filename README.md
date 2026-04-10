# StreamLab — Real-Time Streaming Workshop Demo

Interactive demo environment for **"Building Real-Time Streaming Apps: From Protocols to Plugins"** — Workshop W-4, GameJam Hackathon 2026.

A fully dockerized setup running a live streaming server (MediaMTX), a Next.js dashboard with real-time stats, interactive overlays with WebSocket-powered chat and polls, browser-based WHIP ingest, and a live API explorer.

---

## Prerequisites

### 1. Docker

Install Docker Engine or Docker Desktop for your platform:

| Platform | Guide |
|----------|-------|
| **Windows** | https://docs.docker.com/desktop/install/windows-install/ |
| **macOS** | https://docs.docker.com/desktop/install/mac-install/ |

After installing, open Docker Desktop and make sure it's running. Then verify:

```bash
docker --version
docker compose version
```

### 2. OBS Studio

Download and install OBS Studio:

| Platform | Guide |
|----------|-------|
| **Windows** | https://obsproject.com/download#windows |
| **macOS** | https://obsproject.com/download#mac |

---

## Quick Start

### Step 1: Start the services

```bash
git clone https://github.com/FAK55/streaming.git
cd streaming
docker compose up -d
```

This starts two containers:
- **mediamtx** — streaming server (ports 1935, 8554, 8888, 8889, 8890, 9997)
- **streamlab** — Next.js app + WebSocket chat server (ports 3000, 4000)

### Step 2: Configure OBS

Open OBS Studio and configure the stream settings:

**Settings → Stream:**

| Field | Value |
|-------|-------|
| Service | Custom |
| Server | `rtmp://localhost:1935` |
| Stream Key | `live` |

**Settings → Output → Advanced → Streaming:**

| Field | Value | Why |
|-------|-------|-----|
| Video Encoder | x264 | Software encoder, works everywhere |
| Keyframe Interval | `2` | HLS needs keyframes every 2s for proper segment cutting |
| x264 Options | `bframes=0` | WebRTC cannot decode H.264 with B-frames |

> **Alternative to x264 Options:** Set Profile to `Baseline` instead — this also disables B-frames.

### Step 3: Add a source and start streaming

1. In OBS, click **+** under Sources
2. Select **Screen Capture** (or **Video Capture Device** for webcam)
3. Click **Start Streaming**

### Step 4: Open the dashboard

```
http://localhost:3000
```

---

## Demo Pages

| Page | URL | Description |
|------|-----|-------------|
| **Dashboard** | http://localhost:3000 | Latency comparison (WebRTC vs HLS side by side), live stream stats from API, protocol reference grouped by use case |
| **Overlay** | http://localhost:3000/overlay | Stream player with real-time WebSocket chat, live poll, protocol switcher, WS traffic inspector |
| **WHIP Ingest** | http://localhost:3000/whip | Publish a stream from your browser (webcam/screen) — no OBS needed |
| **API Explorer** | http://localhost:3000/api-explorer | Live JSON viewer for all MediaMTX REST API endpoints with syntax highlighting |

---

## Streaming URLs

Once a stream is published to the `live` path:

| Protocol | URL | Latency | How to open |
|----------|-----|---------|-------------|
| **WebRTC** | http://localhost:8889/live | < 1 second | Browser (Chrome/Firefox) |
| **HLS** | http://localhost:8888/live | ~6 seconds | Any browser |
| **RTSP** | `rtsp://localhost:8554/live` | ~1 second | VLC or FFplay |
| **SRT** | `srt://localhost:8890?streamid=read:live` | ~1 second | VLC or FFplay |

---

## API Endpoints

MediaMTX exposes a REST API on port 9997:

```bash
# List active streams
curl http://localhost:9997/v3/paths/list

# List RTMP connections (publishers)
curl http://localhost:9997/v3/rtmpconns/list

# List WebRTC sessions (viewers)
curl http://localhost:9997/v3/webrtcsessions/list

# List HLS muxers
curl http://localhost:9997/v3/hlsmuxers/list

# List RTSP connections
curl http://localhost:9997/v3/rtspconns/list

# List SRT connections
curl http://localhost:9997/v3/srtconns/list
```

---

## Architecture

```
                          ┌─────────────────────────────────────────┐
                          │              MediaMTX                    │
OBS Studio ──RTMP:1935──► │  Automatic Protocol Conversion          │
                          │                                         │
Browser ──WHIP:8889────► │  RTMP in ──► WebRTC out (sub-second)    │
                          │              HLS out (~6s delay)        │
                          │              RTSP out                    │
                          │              SRT out                     │
                          │                                         │
                          │  REST API :9997 (monitoring + control)  │
                          └─────────────────────────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
              WebRTC :8889           HLS :8888              RTSP :8554
              (< 1 second)           (~6 seconds)           (~1 second)
                    │                      │                      │
                    ▼                      ▼                      ▼
               Browser                Browser                   VLC


                          ┌─────────────────────────────────────────┐
                          │           Next.js App :3000              │
                          │                                         │
                          │  Dashboard  ──► Stream stats + protocols │
                          │  Overlay    ──► Chat + Poll + Player     │
                          │  WHIP       ──► Browser ingest           │
                          │  API        ──► Live JSON explorer       │
                          └─────────────────────────────────────────┘
                                           │
                                    WebSocket :4000
                                    (chat + polls)
```

---

## Ingest Methods

### RTMP (from OBS)

Standard encoder-to-server protocol. Every streaming app supports it.

```
Server:     rtmp://localhost:1935
Stream Key: live
```

### WHIP (from browser)

WebRTC-based ingest — publish directly from a browser with no software.

1. Open http://localhost:3000/whip
2. Select Camera or Screen Share
3. Click **Go Live**
4. The stream is now available at `http://localhost:8889/browser`

---

## WebSocket Chat + Polls

The overlay page features real-time WebSocket-powered chat and polls. The WebSocket server runs on port 4000.

- **Chat**: Messages broadcast to all connected clients instantly
- **Polls**: Votes sync across all clients in real-time
- **History**: Last 50 messages persist in memory (cleared on container restart)
- **WS Debug Panel**: Click the WS button on the overlay to see raw WebSocket traffic

### How it works

```
Browser A (sends message) ──ws://host:4000──► Chat Server ──broadcast──► Browser B
                                                                       ──► Browser C
                                                                       ──► Browser A
```

---

## Why Baseline Profile / No B-frames?

WebRTC delivers video frame-by-frame in real-time. B-frames reference **future** frames (frames that haven't arrived yet), which breaks this model.

| Protocol | B-frames | Why |
|----------|----------|-----|
| **HLS** | Works fine | Segments are pre-buffered, so future frames are available |
| **WebRTC** | Breaks | Frames arrive one at a time — can't reference the future |

Fix: Set `bframes=0` in OBS x264 options, or use the `Baseline` profile.

---

## Server Configuration

The MediaMTX config is at `config/mediamtx.yml`. Key settings:

```yaml
hlsVariant: lowLatency      # LL-HLS for 2-5s latency instead of 6-30s
hlsSegmentDuration: 2s      # Requires OBS keyframe interval = 2
webrtcAdditionalHosts:       # Add your LAN IP for stable WebRTC ICE
  - '127.0.0.1'
  - '192.168.x.x'           # Replace with your actual IP
```

Find your IP: `hostname -I | awk '{print $1}'`

---

## Project Structure

```
streaming/
├── docker-compose.yml          # MediaMTX + Next.js app containers
├── config/
│   └── mediamtx.yml            # MediaMTX streaming server config
├── app/
│   ├── Dockerfile              # Multi-stage build (standalone output)
│   ├── chat-server.js          # WebSocket server for chat + polls
│   ├── next.config.ts          # Standalone output mode
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx      # Root layout (nav, server host context)
│       │   ├── globals.css     # Dark theme, shared styles
│       │   ├── page.tsx        # Dashboard
│       │   ├── overlay/
│       │   │   └── page.tsx    # Interactive overlay
│       │   ├── whip/
│       │   │   └── page.tsx    # Browser WHIP ingest
│       │   └── api-explorer/
│       │       └── page.tsx    # API explorer
│       ├── components/
│       │   ├── NavBar.tsx      # Shared navigation + server config
│       │   ├── ChatFeed.tsx    # WebSocket chat component
│       │   ├── StreamPlayer.tsx # WHEP + HLS video player
│       │   ├── PollWidget.tsx  # Interactive poll
│       │   └── StatsBar.tsx    # Stream stats bar
│       └── lib/
│           ├── ServerHostContext.tsx  # Server host React context
│           └── useWebSocket.ts       # WebSocket hook (chat + polls + traffic)
```

---

## Accessing from Other Devices

To let workshop attendees access the demo from their phones/laptops on the same network:

1. Find your IP: `hostname -I | awk '{print $1}'`
2. Add it to `config/mediamtx.yml` under `webrtcAdditionalHosts`
3. Restart: `docker compose restart mediamtx`
4. Attendees open: `http://YOUR_IP:3000`
5. Set the server host in the top-right input of the dashboard to `YOUR_IP`

---

## Stopping

```bash
docker compose down
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| WebRTC not showing video | Check OBS: set `bframes=0` or Baseline profile. Check MediaMTX logs: `docker logs mediamtx` |
| HLS very slow (30s+ delay) | Set OBS Keyframe Interval to `2`. Check `hlsVariant: lowLatency` in config/mediamtx.yml |
| WebRTC drops after a few seconds | Add your LAN IP to `webrtcAdditionalHosts` in config/mediamtx.yml and restart |
| Port 3000 already in use | Kill the process: `lsof -i:3000 -t \| xargs kill -9` then retry |
| Chat not connecting | Check port 4000 is mapped: `docker ps`. Check server host setting in the dashboard |
| WHIP ingest fails | Check browser allows camera/screen. Check MediaMTX is running on port 8889 |
