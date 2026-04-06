# StreamLab — Real-Time Streaming Workshop Demo

Workshop W-4 demo environment for **"Building Real-Time Streaming Apps: From Protocols to Plugins"** (GameJam 2026).

A fully dockerized setup that runs a live streaming server (MediaMTX) and an interactive dashboard showing protocol comparisons, real-time stats, and interactive features — all powered by real API data.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [OBS Studio](https://obsproject.com/download)

## Quick Start

```bash
# 1. Start everything
docker compose up -d

# 2. Configure OBS
#    Settings → Stream:
#      Service:    Custom
#      Server:     rtmp://localhost:1935
#      Stream Key: live
#
#    Settings → Output → Advanced → Streaming:
#      Video Encoder: x264
#      Profile:       baseline   ← IMPORTANT: disables B-frames for WebRTC
#      Keyframe:      2

# 3. Click "Start Streaming" in OBS

# 4. Open the dashboard
open http://localhost:3000
```

## URLs

| URL | What |
|-----|------|
| http://localhost:3000 | Interactive dashboard |
| http://localhost:8889/live | WebRTC stream (<1s latency) |
| http://localhost:8888/live | HLS stream (~6s latency) |
| `rtsp://localhost:8554/live` | RTSP stream (open in VLC) |
| `srt://localhost:8890?streamid=read:live` | SRT stream (open in VLC) |
| http://localhost:9997/v3/paths/list | MediaMTX REST API |

## API Endpoints

```bash
# List active streams
curl http://localhost:9997/v3/paths/list

# List WebRTC sessions
curl http://localhost:9997/v3/webrtcsessions/list

# List HLS muxers
curl http://localhost:9997/v3/hlsmuxers/list

# List RTMP connections
curl http://localhost:9997/v3/rtmpconns/list

# List RTSP connections
curl http://localhost:9997/v3/rtspconns/list

# List SRT connections
curl http://localhost:9997/v3/srtconns/list
```

## Why Baseline Profile?

WebRTC cannot decode H.264 streams with B-frames. B-frames reference **future** frames, which contradicts WebRTC's real-time, frame-by-frame delivery. Setting OBS to `baseline` profile disables B-frames entirely.

- **HLS** works with any profile (segments are pre-buffered)
- **WebRTC** requires `baseline` (no B-frames)

## Architecture

```
OBS Studio ──RTMP──→ MediaMTX ──WebRTC──→ Browser (sub-second)
                        │
                        ├──HLS─────→ Browser (~6s delay)
                        ├──RTSP────→ VLC
                        └──SRT─────→ VLC
```

MediaMTX automatically converts the single RTMP ingest into all output protocols. No transcoding configuration needed.

## Project Structure

```
├── docker-compose.yml    # MediaMTX + demo nginx containers
├── mediamtx.yml          # MediaMTX config (API enabled)
├── demo/
│   ├── Dockerfile        # nginx:alpine serving static HTML
│   ├── index.html        # Main dashboard (real-time stats, polls, chat)
│   ├── overlay.html      # Stream overlay demo
│   └── latency-compare.html  # WebRTC vs HLS side-by-side
```

## Stopping

```bash
docker compose down
```
