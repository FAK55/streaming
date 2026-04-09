---
title: Welcome & Context
duration: 15
---

::hero
# Building Real-Time Streaming Apps
## From Protocols to Plugins
- GameJam Hackathon 2026 — Workshop W-4
- Asharqia Chamber, Dammam
- Week of 12–16 April 2026

:::notes
SAY: Welcome everyone, glad you're here. This is Workshop W-4 — real-time streaming, end to end.
KEY: By the end of this session you'll have a concrete architecture plan for your hackathon project.
NEXT: Let's start with why streaming matters for what you're building.

::framework
# The Streaming Ecosystem — Three Tiers
- **Infrastructure**: The pipes nobody sees — encoders, media servers, CDNs. OBS, MediaMTX, Akamai built this. You don't need to.
- **Platform**: Twitch, YouTube Live, Kick. They built ingestion at scale, monetization, discovery. You don't need to rebuild that either.
- **Innovation Layer**: Overlays, interactive features, analytics dashboards, viewer engagement tools. This is where YOU build. This is what wins hackathons.

:::notes
KEY: The three-tier framing is the core mental model for the whole workshop. Infrastructure → Platform → Innovation.
SAY: The hackathon isn't asking you to build a CDN. It's asking you what you build ON TOP of one.
ASK: Quick show of hands — who assumed they'd need to build a streaming server from scratch?
NEXT: Let me show you exactly what that assumption costs you.

::comparison
# What This Workshop Is NOT
BEFORE: Building everything from scratch — custom protocols, custom servers, weeks of infrastructure work before you write a single feature. Most teams never get past "stream works" before time runs out.
AFTER: Using MediaMTX as your foundation — one Docker command, 15-minute setup, all your time goes to the feature that makes your project unique and impressive.
INSIGHT: The hackathon winners won't be the team that built the best server. They'll be the team that built the best experience ON TOP of one.

:::notes
KEY: This framing is the most important thing in the workshop. Repeat it.
SAY: I've seen teams spend 40 of 48 hackathon hours on infrastructure. They never ship a feature.
WARN: Let this land. Pause after the insight before moving on.
NEXT: So what DO you walk away with today?

::bullets
# What You'll Walk Away With
- A clear mental model of the streaming pipeline — end to end, no black boxes
- Protocol literacy: know which protocol to use and exactly why, for your specific use case
- A live working demo running on this laptop — protocols, overlays, interactive elements
- MediaMTX running locally with multi-protocol output in under 15 minutes
- A concrete architecture plan for your hackathon streaming project

:::notes
SAY: These are the five things. By the time we break, you'll have all five.
KEY: "No black boxes" — participants should leave being able to explain every hop the stream takes.
NEXT: Here's the shape of the day.

::richText
# Workshop Preview
## What happens in the next 3 hours

You'll see a live stream running end to end on this laptop — OBS pushing via RTMP, MediaMTX converting protocols automatically, WebRTC and HLS playing simultaneously in two browser tabs, and an interactive overlay with polls, viewer counts, and a live chat feed layered on top.

> By the halfway mark: live streaming pipeline running. By the end: you pitch your hackathon streaming architecture to the room.

## No laptops required for any activity

Every activity today is a discussion, debate, or rapid-fire game. Mental engagement, zero setup friction. Save your energy for the hackathon.

:::notes
SAY: The demo is the centerpiece. Everything before it is context. Everything after it is application.
KEY: Set expectations — this is participatory. I'll call on teams.
NEXT: But first — let me hear from you.

::prompt
# What streaming feature are you imagining for your hackathon project?
> Shout it out — one sentence per team. Don't overthink it.
- Live poll overlay synced to esports match events
- AI-powered highlight clipper that detects big moments
- Audience-controlled camera angle switching during tournaments
- Real-time player stats dashboard overlaid on a live broadcast

:::notes
ASK: Go around the room. Every team gets 10 seconds. Just the idea, not the implementation.
KEY: Listen for scope problems — teams that want to build the server, not the feature.
WARN: Actually wait for responses. Write down what they say — reference their ideas later in the workshop.
NEXT: Perfect. Keep those ideas in your head as we build the foundation.

---
title: Streaming Protocols & Architecture
duration: 50
---

::framework
# The End-to-End Streaming Pipeline
- **Capture**: Camera, screen, or game produces raw uncompressed video. At 1080p30, that's ~3 Gbps. OBS handles this step.
- **Encode**: Compress raw video with H.264 (or H.265/AV1). Shrinks 3 Gbps to 3–6 Mbps. OBS handles this too.
- **Ingest**: Push the encoded stream to a server via RTMP — this is the "upload" leg. OBS pushes, the server receives.
- **Media Server**: Receives the RTMP stream, converts it to multiple protocols, routes to viewers. MediaMTX handles this.
- **Distribute**: Deliver stream segments or frames to viewers. In production, CDNs do this. For hackathons, the server handles it directly.
- **Playback**: The viewer's player decodes and renders. Different protocols deliver differently — this is where latency is born.

:::notes
KEY: Six stages. Students should be able to name them in order by end of section.
SAY: Walk through each card left to right. Keep it brisk — we'll go deep on each in a moment.
DATA: Raw 1080p30 video = ~3 Gbps. H.264 at 4 Mbps is a 750x compression ratio.
NEXT: Before we go deep on protocols, here's a mental model that makes everything click.

::prompt
# How much delay is there between a streamer doing something on camera and a Twitch viewer seeing it?
> Call it out — your gut number. Seconds? Milliseconds?
- About 1 second — it feels almost live
- 3–5 seconds — noticeable but bearable
- 10+ seconds — significant delay
- Real-time, basically zero

:::notes
ASK: Let 4-5 people answer before revealing. The spread of answers is the point.
KEY: Standard HLS on Twitch is 6–30 seconds. Most people guess 1-2 seconds. That gap explains everything.
SAY: "The person who said 30 seconds is probably a developer. The person who said 1 second is probably a viewer." — different people experience the same delay differently.
NEXT: Now you understand WHY protocols exist. Let's meet them.

::bullets
# RTMP (Real-Time Messaging Protocol)
- Built by Macromedia in the Flash era. Still the global standard for getting video from an encoder to a server in 2026.
- Every encoder speaks it: OBS, FFmpeg, hardware capture cards, mobile streaming apps — RTMP out of the box.
- Latency: 1–3 seconds from encoder to server. Fast and reliable over TCP.
- **Critical**: NOT for browser playback. Flash is dead. RTMP is exclusively the language encoders use to PUSH streams to servers.
- In the demo today: OBS pushes to `rtmp://localhost:1935/live`. MediaMTX receives it and immediately makes it available over every other protocol.
- Think of RTMP as the "loading dock" — goods come IN via RTMP, leave via HLS/WebRTC/RTSP.

:::notes
KEY: RTMP = ingest only. Students sometimes try to play RTMP in a browser. It won't work.
SAY: "If your project needs OBS support — every streamer already has OBS — RTMP is how you get that stream."
DATA: RTMP was created in 2002. It's 24 years old and still dominates encoder-to-server ingest.
NEXT: From the server outward, viewers use something completely different.

::bullets
# HLS (HTTP Live Streaming)
- The server chops the stream into small `.ts` segment files (2–6 seconds each) and writes a `.m3u8` playlist
- The player downloads the playlist, fetches segments one by one, and buffers 2–3 before playback starts
- That buffering is why latency is **6–30 seconds** — it's the price of universal compatibility
- It's just HTTP file downloads — every CDN, every browser, every device handles it out of the box
- Used by YouTube, Netflix, Twitch VOD, and every major platform for large-scale delivery

:::notes
KEY: HLS = passive, large-scale, high-latency. WebRTC = interactive, sub-second. Those are the two ends.
DATA: HLS was created by Apple in 2009. It became the industry standard by 2015.
NEXT: LL-HLS closes the gap a bit — quick mention before we get to WebRTC.

::bullets
# LL-HLS (Low-Latency HTTP Live Streaming)
- Apple's Low-Latency HLS extension pushes latency down to 2–5 seconds using partial segments and preload hints
- Broader device support than WebRTC, lower latency than standard HLS
- Good choice when sub-second isn't required but 30 seconds is too much — watch parties, semi-interactive features
- MediaMTX supports LL-HLS out of the box — same playback URL, lower latency automatically
- Most hackathon projects: choose WebRTC (interactive) or standard HLS (broad compat). LL-HLS is the considered middle option.

:::notes
KEY: LL-HLS exists so teams don't feel forced into a binary choice.
SAY: "If your feature needs lower latency than HLS but you're worried about WebRTC complexity — LL-HLS is your answer."
NEXT: Now the protocol that actually changes what features are possible.

::bullets
# WebRTC (Web Real-Time Communication)
- Built by Google for browser-to-browser video calls — sub-second latency, under 200ms typical
- Sends each frame individually over UDP the instant it's captured — no batching, no buffering, no waiting
- WHIP (ingest) and WHEP (playback) are the HTTP-based signaling standards — MediaMTX supports both natively
- Connections are stateful — each viewer is a persistent connection, but at hackathon scale this is irrelevant
- The only protocol where a viewer can react to what's happening right now — required for polls, predictions, and live interaction

:::notes
KEY: WebRTC isn't just "faster HLS" — it's a different architecture that enables a different category of features.
SAY: "If a viewer clicks a poll and the result should influence what happens on screen in the next second — WebRTC is the only option."
DATA: WebRTC latency in LAN conditions: 50–150ms. Over internet: 200–500ms. Both are effectively real-time for human interaction.
NEXT: Let me make the HLS vs WebRTC difference visceral.

::comparison
# Segments vs. Frames — The Latency Explained
BEFORE: HLS is like sending letters. Collect frames for 2–6 seconds, bundle them into a segment, send the segment, wait for the player to buffer 2 more segments. The viewer is reading a letter that was written 6–30 seconds ago.
AFTER: WebRTC is like a phone call. Each frame is transmitted the instant it's captured, sent over UDP, decoded immediately. The viewer sees what's happening right now — sub-second.
INSIGHT: This isn't just a technical difference — it determines what features are POSSIBLE. You cannot run a live poll, a prediction game, or an audience-triggered event with a 30-second delay. Protocol choice is a product decision.

:::notes
KEY: "Protocol choice is a product decision" — this line is the core insight. Say it slowly.
SAY: Let the comparison sit for a moment before adding the insight.
WARN: Don't rush the insight. This is the most important conceptual moment of the section.
NEXT: Two more protocols — quick reference, skip unless your use case demands them.

::framework
# RTSP & SRT
- **RTSP (Real-Time Streaming Protocol)**: IP camera and surveillance standard. Efficient on local networks, no browser support — plays in VLC or dedicated players. Only relevant if your project involves local camera feeds or hardware integrations.
- **SRT (Secure Reliable Transport)**: Built by Haivision for reliable ingest over unreliable networks. Handles packet loss and jitter — useful if a remote caster needs to send a feed over bad Wi-Fi or a cross-city link. Ingest only, not for playback.
- **For most hackathon projects**: Skip both. RTMP for ingest, WebRTC or HLS for delivery. If you think you need RTSP or SRT, come find me during the break.

:::notes
SAY: "I'm mentioning these so you're not confused if you see them in MediaMTX's config or docs. Most of you won't need them."
KEY: Don't let RTSP and SRT eat time. Quick pass, move on.
NEXT: Let me give you the decision framework as a visual.

::matrix
# Protocol Selection Matrix
X: Latency Requirement (Relaxed → Strict)
Y: Browser Playback Needed (No → Yes)
TL: RTSP
- Surveillance cameras
- LAN playback in VLC
- Local hardware integrations
TR: SRT
- Reliable remote ingest
- Casting over bad networks
- Professional production links
BL: HLS / LL-HLS
- Massive scale passive viewing
- CDN delivery
- Works on every device
BR: WebRTC
- Interactive features
- Sub-second polls and predictions
- Your hackathon sweet spot

:::notes
KEY: Bottom-right is where almost every hackathon project lives. WebRTC, browser-based, low-latency.
SAY: "Pick your quadrant based on what your feature needs, not what sounds impressive."
ASK: "Looking at this matrix — where does your hackathon idea live? Which quadrant?" Let 2-3 teams answer.
NEXT: Now let's talk about where to draw the line on latency.

::spectrum
# Latency Is a Feature Decision
- Too Relaxed (broad): HLS at 6–30 seconds. Fine for passive viewing — tournament replays, watch parties, VODs. Completely breaks interactive features. A poll result shows up after the play already ended.
- The Sweet Spot (right): WebRTC at <1 second, or LL-HLS at 2–5 seconds. Enables real-time interaction. Practical for hackathon prototypes with LAN or low-latency internet.
- Too Narrow (narrow): WebRTC-only with no fallback loses viewers on older devices, can't leverage CDN caching, and creates scaling complexity you don't need for a demo. Choose based on use case, not ambition.

:::notes
KEY: "Choose your latency based on what you're building, not what's technically impressive."
SAY: Walk through all three marks left to right. Explain what breaks at each extreme.
NEXT: Now that you know the protocols — where do YOU build?

::framework
# Where Hackathon Teams Add Value
- **Interaction Layer** ★ (Most hackathon-friendly): HTML/CSS/JS overlays on top of a video player. Polls, predictions, audience participation, chat widgets, second-screen experiences. No streaming knowledge required — just web dev.
- **Analytics Layer**: Viewer engagement tracking, stream health monitoring, attention heatmaps, content performance dashboards. Consumes MediaMTX's REST API and your own event data.
- **Processing Layer**: Real-time data overlays (player stats, live scores), AI features (auto-highlight detection, speech-to-text subtitles). Requires compute — scope carefully.
- **Ingest Layer**: Multi-source switching, automated camera selection for esports, scene detection. Orchestrates what goes INTO the server.
- **Delivery Layer**: Custom players with embedded interactive features, adaptive bitrate controls, branded viewing experiences.

:::notes
KEY: Most teams should pick the interaction layer. It's the most tractable, most impressive, and maps directly to the demo they're about to see.
SAY: "Twitch Extensions are pure interaction layer. YouTube Live overlays are pure interaction layer. The biggest companies in streaming invest heavily in this exact layer."
ASK: "Which layer does your hackathon idea live at?" — quick gut check before activity.
NEXT: One more thing before the activity — the core message of the whole workshop.

::framework
# The Overlay Architecture — How It Works
- **Video Layer**: WebRTC stream from MediaMTX plays in a standard HTML `<video>` element. This is your canvas — the streaming infrastructure ends here.
- **Overlay Layer**: HTML/CSS elements positioned absolutely on top of the video. The stream has no idea these exist. Completely decoupled.
- **Data Layer**: JavaScript updating polls, chat feeds, viewer counts. Connects to any backend — WebSocket, REST API, Firebase. The stream is just one data source among many.
- **Interaction Layer**: User clicks trigger JS functions — voting, chat input, reactions. All standard web development. No streaming knowledge required.

:::notes
KEY: This is the same architecture as Twitch Extensions and every major esports broadcast overlay. Video underneath, web layer on top.
SAY: "You will see this running live in the demo. Keep this diagram in your head when you watch the overlay."
NEXT: And critically — the protocol you choose for the video layer determines what the overlay can DO.

::comparison
# Protocol Choice Changes What Your Feature Can Do
BEFORE: HLS delivery — viewer is 6–30 seconds behind. Your overlay renders fine. The poll widget appears. But the viewer is voting on a round that already ended 10 seconds ago. The interaction is broken, not the code.
AFTER: WebRTC delivery — viewer is under 1 second behind. Poll appears at the right moment. Viewer votes. Result influences what happens next. Real-time participation is physically possible.
INSIGHT: The overlay code is identical in both cases. The protocol choice is what makes the feature work or not. This is a product decision disguised as a technical one.

:::notes
KEY: Same overlay, different protocol, completely different user experience. This is the core insight before the demo.
SAY: "You'll see both cases live — I'll switch protocol mid-demo and you'll feel the difference."
NEXT: This architecture has a name you've already heard.

::bullets
# This Is How Twitch Extensions Work
- Twitch Extensions are sandboxed HTML/JS apps running in iframes, overlaid on the video player
- They communicate via a JavaScript SDK but never touch the video stream itself — video underneath, extension on top
- What you're building this hackathon is exactly this: a stream URL as the canvas, your web code as the layer on top
- The streaming infrastructure is invisible to your code — you just consume a URL
- If your hackathon project were good enough, you could submit it as a Twitch Extension. Same architecture.

:::notes
KEY: Grounding this in Twitch validates the approach — it's not a toy pattern, it's what the biggest platform in streaming uses in production.
SAY: "You're not inventing something new. You're building what the industry already built — just on your own infrastructure."
NEXT: One more thing before the activity.

::richText
# Your Hackathon Project Should NOT Be a Streaming Server
## MediaMTX gives you this for free

One Docker command. Zero configuration for basic use. Automatic protocol conversion — push RTMP in, get HLS, WebRTC, RTSP, and SRT out simultaneously. REST API on port 9997 to query active streams, viewer counts, and stream metadata. Recording to disk. Authentication hooks. All of it.

> An HTML page that consumes a WebRTC stream and layers interactive elements on top is a complete, competitive, impressive hackathon project. That's it. That's the bar.

## The one-liner on MediaMTX

Zero-dependency media server written in Go. Single binary or Docker image. Handles all protocol conversion automatically. `docker run --rm -it --network=host bluenviron/mediamtx:latest` — running in 10 seconds.

:::notes
KEY: This is the "unlock" slide. Some students are still thinking about building infrastructure. This closes that door.
SAY: "I want to show you a live version of this before we go further. But first — activity."
WARN: Don't rush past this. Let people sit with "one HTML page is a complete project."
NEXT: Time for an activity to lock in everything you just learned.

::prompt
# Feature or Fantasy?
> I'll describe a hackathon streaming idea. Your team votes: 👍 buildable in 48 hours using MediaMTX + custom code, or 👎 pure fantasy? Best instincts win.
- Thumbs up = shipped with MediaMTX as your foundation
- Thumbs down = fantasy — wrong scope, wrong assumptions, or impossible in the time
- After each vote I'll reveal the answer and explain the WHY

:::notes
ASK: "Is everyone clear on the rules? Thumbs up = buildable, thumbs down = fantasy. Teams vote simultaneously — no peeking at each other."
SAY: "The goal isn't to get every answer right. It's to understand the reasoning behind each one."
KEY: This activity is about calibrating scope instincts before the hackathon, not about trivia.
WARN: Keep energy high. Move through scenarios at a pace that maintains momentum.
NEXT: Scenario one — go.

::steps
# Feature or Fantasy? — The Scenarios
1. A browser overlay showing live poll results on a WebRTC stream → BUILDABLE. HTML/JS on a WHEP stream. This is exactly what the demo's overlay.html does.
2. A custom video codec that compresses game footage 10x better than H.264 → FANTASY. Codec development takes years and PhD-level expertise. H.264 already exists and is free.
3. An esports dashboard pulling live match stats from an API and displaying as a stream overlay → BUILDABLE. WebRTC stream + fetch() to a stats API + DOM manipulation. Classic interaction layer.
4. Real-time AI that detects highlights in a live stream and clips them automatically → RISKY FANTASY. Real-time ML inference on raw video is computationally brutal. Cloud API might work but scope is dangerous for 48 hours.
5. A multi-stream viewer showing 4 tournament cameras — viewer picks which to watch → BUILDABLE. Four WebRTC iframes from MediaMTX on different stream paths. Layout code only.
6. Build your own CDN to deliver to 100,000 concurrent viewers → FANTASY. CDN infrastructure is massive distributed systems engineering. Use MediaMTX for demo scale; actual CDN is post-hackathon.
7. A "predict the play" feature where viewers vote before each round and see results live → BUILDABLE. WebRTC (<1s latency) + simple voting backend + results overlay. Perfect hackathon scope.
8. Re-streaming from your server to Twitch, YouTube, and Kick simultaneously → BUILDABLE. MediaMTX supports RTMP push to multiple destinations out of the box. Configuration, not custom code. (pause)

:::notes
KEY: The pattern is: uses MediaMTX as foundation = buildable. Replaces MediaMTX = fantasy.
SAY: After each reveal, give the one-sentence "why" — connect it back to the protocol or extension layer.
WARN: Don't let any single scenario become a debate. Quick reveal, quick explanation, next.
NEXT: Discussion — what surprised you?

::prompt
# Which scenarios surprised you? What's the pattern?
> 2–3 teams share. What separates buildable from fantasy?
- Was it the protocol choice that made something possible?
- Was it the scope of what already exists vs. what needs to be built?
- Was it the difference between using a tool and replacing a tool?

:::notes
ASK: Actually wait for responses. Guide toward "the line is about knowing what your tools handle for you."
KEY: The insight: scope awareness is a technical skill. Knowing what MediaMTX gives you for free is as important as knowing how to code.
NEXT: Let's put the rule on a slide before we move to the demo.

::bullets
# The Buildable vs. Fantasy Rule
- If your idea USES a streaming server as a foundation → probably buildable
- If your idea IS a streaming server → fantasy for a hackathon
- What MediaMTX gives you for free: protocol conversion, multi-protocol output, REST API, recording, authentication hooks
- Build everything else. The feature. The interaction. The experience. The thing that makes a viewer lean forward.
- Scope down to one feature, executed well. One impressive thing beats five half-built things every time.

:::notes
KEY: Read the first two bullets slowly and clearly. This is the rule they take home.
SAY: "Screenshot this slide. Refer to it when scope creep hits you at 2am on hackathon day."
NEXT: Alright — let's see all of this running live.

---
title: Live Demo
duration: 50
---

::hero
# Live Demo
## 38 minutes. Screen share. No slides until the overlay.
- Server → OBS → Multi-protocol playback → REST API → Latency comparison → Interactive overlay

:::notes
SAY: "Everything I've described — you're about to watch it happen live."
WARN: Switch to screen share now. Come back to slides only for the overlay architecture slide.
KEY: Don't rush. 38 minutes is plenty of time — let moments land, take questions as you go.

::richText
# Activity 2 — "You're the CTO"
## The scenario

Your esports startup just signed a deal to broadcast a 3-day tournament next week. Expected peak: 5,000 concurrent viewers. You have 2 developers, a MediaMTX server, OBS Studio, and 7 days. The tournament sponsor wants ONE interactive feature visible on the broadcast.

> **Option A**: A live prediction game — viewers guess round outcomes before each match, results shown in real time on the stream.
> **Option B**: A real-time stats overlay — pulls player performance data from a game API and displays it during the broadcast.
> **Option C**: A viewer-controlled camera switcher — 3 camera angles, viewers vote on which angle to show next.

:::notes
SAY: "Read all three carefully. You can't pick more than one. You have 5 minutes as a team."
KEY: Every option is defensible — that's intentional. The point is reasoning through trade-offs, not finding the "right" answer.
WARN: Circulate while teams discuss. Listen for flawed reasoning to challenge during share-out.
NEXT: Decision time — write your answers.

::steps
# You're the CTO — Decision Process
1. Which feature do you pick? (A, B, or C) — and you can only pick one
2. Which delivery protocol and why? (WebRTC / HLS / LL-HLS — and justify it for your feature)
3. What's the single biggest technical risk to shipping it in 7 days?
4. Write your answers on paper — you'll defend them to the room in 60 seconds

:::notes
WARN: Keep teams on the clock. 5 minutes is tight by design — real decisions have time pressure.
SAY: "If you spend 4 minutes debating which option and 1 minute on the protocol question, you're going to struggle with the defense."
KEY: The protocol justification is the most revealing answer — it shows whether they absorbed the theory section.
NEXT: Time to defend.

::prompt
# CTOs, stand up. 60 seconds to defend your choice.
> 3–4 teams present. I'll challenge each one.
- "You picked the prediction game — what if your voting backend crashes mid-tournament with 5,000 viewers watching?"
- "You picked the camera switcher — can a viewer's weak laptop handle 3 simultaneous WebRTC streams?"
- "You picked the stats overlay — what if the game API has a 10-second update delay?"

:::notes
ASK: Actively challenge. There's no single right answer — make them defend the trade-offs.
KEY: The goal is to experience the feeling of thinking through technical decisions under pressure. That feeling is what hackathon day feels like.
WARN: Keep each defense to 60 seconds. Cut them off gently if they go long.
NEXT: Let's capture the lessons.

::bullets
# "You're the CTO" — Key Lessons
- Every feature choice has a protocol implication — interactive prediction requires WebRTC; a stats display could work with HLS
- Every protocol choice has a trade-off — WebRTC gives you sub-second latency and stateful connection complexity
- The biggest hackathon risk isn't technical skill — it's scope. Feature A might be achievable, B might be a stretch, C might require 3 days of WebRTC connection management
- MediaMTX handles the hard part — ingest, conversion, multi-protocol delivery. Your 7 days are for the feature layer
- Defend your choices with protocol reasoning — "I chose WebRTC because my feature requires viewers to react within 1 second" is a real answer

:::notes
KEY: "Scope is the biggest risk" — underline this before moving on.
SAY: Reference specific answers teams gave. "One team said X — here's how I'd think about that."
NEXT: You've earned a break.

---
title: Break
duration: 15
---

::prompt
# 15-Minute Break
> Grab coffee, stretch. Come ask questions about the demo or your project architecture. Back in 15.
- Questions about the demo setup? Come find me
- Questions about your specific hackathon architecture? Let's sketch it out
- Want to see the overlay code? Open overlay.html in a text editor
- Questions about MediaMTX config? Check the docs at mediamtx.io

:::notes
WARN: Actually take 15 minutes. Don't start early — teams need mental reset time.
SAY: "If your team has a specific use case you want to talk through, come up now. This is the best time."
KEY: Use break conversations to gauge where teams are — any confused teams need more attention in Section 5.
NEXT: Quick reference card — tell them to photograph this.

::canvas
# Quick Reference Card — Photograph This
- **Start MediaMTX**: `docker run --rm -it --network=host bluenviron/mediamtx:latest` or `docker compose up`
- **Default Ports**: 1935 RTMP ingest · 8554 RTSP · 8888 HLS · 8889 WebRTC · 8890 SRT · 9997 REST API
- **OBS Settings**: Service → Custom, Server → `rtmp://localhost:1935/live`, Stream Key → `live`
- **Test Without OBS**: `ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f flv rtmp://localhost:1935/test`
- **Check Active Streams**: `curl http://localhost:9997/v3/paths/list`
- **WebRTC Play URL**: `http://localhost:8889/live` (browser, no plugin needed)
- **HLS Play URL**: `http://localhost:8888/live` (browser, works everywhere)
- **Protocol Summary**: RTMP = ingest from encoders · WebRTC = sub-second interactive · HLS = broad scale passive · LL-HLS = middle ground

:::notes
SAY: "Take a photo of this slide. This is everything you need to stand up a streaming environment on hackathon day."
KEY: The ffmpeg test command is critical — not everyone will have OBS available when they first set up.
NEXT: Advanced topics — lighter content, practical reference for hackathon week.

---
title: Advanced Topics & Q&A
duration: 25
---

::bullets
# Authentication & Access Control
- MediaMTX supports built-in username/password credentials configured in `mediamtx.yml` — set `authMethod: internal` and define users per path
- External webhook auth: MediaMTX calls your HTTP endpoint with stream credentials before allowing publish or playback. Your server returns 200 (allow) or 401 (deny).
- Path-level permissions: different credentials for publishers vs. readers, per stream path
- If you're building a paid or multi-tenant streaming feature — configure auth at the server level, not in your application. It's already built.
- Practical setup: `authInternalUsers` list in config, or point `authHTTPAddress` at your auth endpoint. Done.

:::notes
SAY: "If your hackathon project has any kind of access control — gated streams, team-specific feeds — don't build it in your app layer. Configure it in MediaMTX."
KEY: Most hackathon projects won't need auth, but teams building multi-user or paid features should know this exists.
NEXT: Recording — for teams building highlight or VOD features.

::bullets
# Recording & Playback — Built In
- MediaMTX can record every live stream to disk automatically — no additional tools required
- Formats: fMP4 (fragmented MP4, best for VOD) or MPEG-TS (compatible with most video tools)
- Configure in `mediamtx.yml`: set `record: yes`, `recordPath`, and `recordFormat` per path
- Example: `recordPath: /recordings/%path/%Y-%m-%d_%H-%M-%S-%f` — automatic timestamped filenames
- Recorded files are standard video — serve with any HTTP server, process with FFmpeg, or upload to S3
- For highlight systems: record the stream, then use FFmpeg to clip segments from the recorded file by timestamp

:::notes
SAY: "If your team is building a highlight system or replay feature — the recording is already handled. Configure it in MediaMTX, serve the files from any static host."
KEY: The timestamp-based clip workflow: record → query API for event timestamp → `ffmpeg -ss [timestamp] -t 30 -i recording.mp4 highlight.mp4`
NEXT: The one gap in MediaMTX — transcoding.

::comparison
# MediaMTX vs. OvenMediaEngine — When to Consider Alternatives
BEFORE: MediaMTX has no built-in transcoder. If your viewer has a slow connection and can't handle 6Mbps H.264, they're stuck. You'd need to run FFmpeg manually as an external transcoder to produce multiple quality renditions for adaptive bitrate.
AFTER: OvenMediaEngine (OME) has a built-in transcoder, native ABR for WebRTC and LL-HLS, and OvenPlayer — a dedicated WebRTC-first video player. More complex setup, but end-to-end ABR out of the box.
INSIGHT: For hackathon demos with a known LAN or controlled network environment, MediaMTX is perfect. For a production deployment where viewer bandwidth varies widely, evaluate OvenMediaEngine.

:::notes
SAY: "Don't switch to OvenMediaEngine for the hackathon unless you have a specific ABR requirement. The setup complexity isn't worth it for a demo environment."
KEY: MediaMTX for hackathon. OvenMediaEngine for considering post-hackathon if ABR becomes critical.
NEXT: Scaling — don't worry about it yet, but know the path.

::bullets
# Scaling Beyond the Hackathon
- MediaMTX on one machine handles demo scale perfectly — dozens to low hundreds of concurrent viewers with no issues
- For production scale, the path is well-defined: origin-edge clustering (OvenMediaEngine supports this natively), CDN integration for HLS delivery at massive scale
- WebRTC at scale uses SFU (Selective Forwarding Unit) architecture — the SFU receives one publisher stream and forwards to thousands of subscribers without each subscriber connecting directly to the origin
- Popular WebRTC SFUs: LiveKit (easiest developer experience), mediasoup, Janus Gateway
- The message: prove the concept first. Scale is a solvable, well-understood engineering problem. A great idea that doesn't scale beats a scaled system with no idea.

:::notes
SAY: "I'm telling you this so you're not worried about scale during the hackathon. The question 'but can it scale?' is the wrong question for day one."
KEY: "Prove the concept first" is the takeaway.
NEXT: One more reference point — the architecture your overlays are already following.

::prompt
# Open Q&A — What Questions Do You Have?
> Protocols, the demo, your project architecture, MediaMTX, anything. 5–8 minutes.
- Who's planning to use WebRTC for delivery? Why?
- Who's going HLS? What's making sub-second latency unnecessary for you?
- Any teams still unsure which extension layer their idea lives at?

:::notes
ASK: If no questions come up, use the seeded questions above. They almost always generate debate.
SAY: Real questions get real answers. If I don't know, I'll say so and point you to the right resource.
WARN: Keep answers tight — 60-90 seconds max per question. Don't let one question eat the whole segment.
NEXT: Final section — your toolkit and your pitch.

---
title: Toolkit Reference & Close
duration: 25
---

::canvas
# Streaming Toolkit Quick Reference
- **Start MediaMTX**: `docker compose up` (with compose file) or `docker run --rm -it --network=host bluenviron/mediamtx:latest`
- **Default Ports**: 1935 RTMP ingest · 8554 RTSP · 8888 HLS · 8889 WebRTC · 8890 SRT · 9997 REST API
- **OBS Ingest**: Service → Custom · Server → `rtmp://localhost:1935/live` · Stream Key → `live`
- **Protocol Cheat Sheet**: RTMP = ingest from encoders · WebRTC = interactive sub-second · HLS = broad compatibility · LL-HLS = middle ground
- **API Check**: `curl http://localhost:9997/v3/paths/list`
- **FFmpeg Test Stream**: `ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f flv rtmp://localhost:1935/test`
- **WebRTC Playback**: `http://localhost:8889/[path]` · **HLS Playback**: `http://localhost:8888/[path]`
- **WHIP Ingest (browser)**: POST to `http://localhost:8889/[path]/whip` · **WHEP Playback**: GET `http://localhost:8889/[path]/whep`

:::notes
SAY: "Photograph this. This is your day-one setup card. Everything you need to have a working stream in under 15 minutes."
KEY: WHIP/WHEP URLs are listed here for teams using browser-based publishing — some hackathon teams won't have OBS.
NEXT: Protocol decision flowchart — use this when you're stuck.

::steps
# Protocol Decision Flowchart
1. Does your feature require the viewer to react within 2 seconds? YES → WebRTC. NO → continue.
2. Do you need to support every device and browser, including older ones? YES → HLS. NO → continue.
3. Do you want lower latency than HLS but broader support than pure WebRTC? YES → LL-HLS.
4. Is your ingest source OBS or FFmpeg? → RTMP for ingest. (Almost always the answer.)
5. Is your ingest source a web browser (screen share, webcam in browser)? → WHIP (WebRTC ingest over HTTP). MediaMTX supports this natively.

:::notes
SAY: "Walk through this tree for your hackathon project. Most teams will land at either WebRTC or LL-HLS for delivery and RTMP for ingest."
KEY: WHIP for browser-based ingest is worth calling out — teams building browser-first streaming tools need this.
NEXT: Activity 3 — your pitch.

::prompt
# 30-Second Pitch — Activity Rules
> Every team stands up and pitches your hackathon streaming idea. 30 seconds. You MUST include three things:
- (1) Your delivery protocol and WHY you chose it
- (2) Which of the five extension layers your innovation lives at
- (3) One thing you are explicitly NOT building — what does MediaMTX handle for you?
- If you can't name all three, you're not ready yet. Knowing that NOW is more valuable than finding out on hackathon day.

:::notes
KEY: The "what you're NOT building" requirement is the most important part. It forces scope clarity.
SAY: "This isn't a judgment. It's a diagnostic. If you can't answer question 3, you haven't finished defining your project scope."
WARN: Be kind but firm in feedback. The goal is to help, not to embarrass.
NEXT: Who's first?

::prompt
# Who's first? 30 seconds on the clock. Go.
> Facilitator gives 1-sentence feedback after each pitch.
- "Strong scope — WebRTC is the right call, I think that's buildable."
- "That sounds more like an HLS use case — do you really need sub-second latency for that feature?"
- "What does MediaMTX handle for you there? I want to make sure you're not rebuilding what you get for free."
- "Tight scope — I think that's shippable in 48 hours. Good instinct."

:::notes
ASK: Actually put teams on the clock. 30 seconds is the constraint — enforce it gently.
KEY: The facilitator feedback is the most valuable output of the entire workshop. Make it specific and actionable.
WARN: If a team's scope is clearly too large, say it directly but constructively: "That's a 2-week project. Which part is the hackathon version?"
NEXT: Takeaways, then close.

::bullets
# Key Takeaways
- The streaming pipeline: Capture → Encode → Ingest → Media Server → Distribute → Playback. Every hop has a name.
- Protocol choice is a product decision: WebRTC for interaction and sub-second response, HLS for scale and broad compatibility, LL-HLS for the middle ground. Justify it with your feature's requirements.
- MediaMTX gives you multi-protocol streaming with one Docker command — don't rebuild what you get for free. Your time is for the feature.
- Your hackathon project lives at the extension layer: HTML/CSS/JS on top of a live stream. The stream is the canvas, your code is the painting.
- Scope is the #1 hackathon risk. Build one feature well. One impressive, polished, working feature beats five half-built ones every time.

:::notes
KEY: Read these five points slowly. They're the five things participants should be able to say to a teammate tomorrow.
SAY: "If you forget everything else from today, remember these five. Write them on a sticky note. Put it on your laptop."
NEXT: Close.

::hero
# You Have the Tools.
## You have the pipeline. You have the protocols.
## Now go build something people want to watch — and interact with.
- See you at the hackathon.
- github.com/bluenviron/mediamtx
- GameJam Hackathon 2026 · Asharqia Chamber · Dammam

:::notes
SAY: End with energy. Don't trail off. "See you at the hackathon" is the last thing they hear.
KEY: Leave the repo URL visible on screen so teams can photograph it.
WARN: Don't add more content after this. End here. The slide is the period at the end of the sentence.
