---
title: Welcome & Context
duration: 15
---

::hero
# Building Real-Time Streaming Apps
## From Protocols to Plugins
- GameJam Hackathon 2026 — Workshop W-4
- Asharqia Chamber, Dammam
- April 2026

:::notes
SAY: Welcome everyone. Over the next 3 hours you'll go from zero streaming knowledge to having a concrete architecture for your hackathon project.
KEY: This is hands-on and practical — everything connects to what you'll build during the hackathon.
NEXT: Let's start by understanding where we fit in the streaming world.

::framework
# The Streaming Ecosystem
- **Infrastructure**: Media servers, codecs, transport protocols — the plumbing that moves video from A to B. Someone already built this.
- **Platforms**: Twitch, YouTube Live, Kick — they packaged infrastructure into products with audiences. They built this.
- **Innovation Layer**: Extensions, overlays, interactive features, analytics tools — the experiences built ON TOP of streams. This is where YOU build.

:::notes
KEY: You are not building infrastructure. You are building at the innovation layer — on top of tools that already exist.
SAY: Twitch didn't build TCP. YouTube didn't invent video codecs. They built experiences on top of existing infrastructure. That's exactly what you'll do.
DATA: Twitch has over 9 million active streamers — the infrastructure is solved. The opportunity is in what you build on top.
NEXT: Let me be very specific about what this workshop is and isn't.

::comparison
# What This Workshop Is NOT vs. What It IS
BEFORE: Build a streaming platform from scratch — custom protocols, custom servers, weeks of infrastructure work before you write a single feature line of code.
AFTER: Use MediaMTX as your foundation — one Docker command, 15-minute setup, all your energy goes to the feature that makes your project unique.
INSIGHT: Hackathon winners don't reinvent the wheel. They build the most interesting thing on top of one.

:::notes
KEY: This framing should stick for the entire workshop — they are NOT infrastructure engineers today.
SAY: If you leave here thinking you need to build a media server, I've failed. You need to build what goes ON TOP of one.
NEXT: Here's what you'll actually walk away with.

::bullets
# What You'll Walk Away With
- A mental model of how live streaming works end-to-end — from camera to viewer
- The ability to choose the right streaming protocol for your hackathon feature
- A live demo you can replicate in 15 minutes on your own laptop
- A concrete streaming architecture plan for your hackathon project
- A take-home toolkit reference card with every command you need

:::notes
KEY: These are real deliverables, not vague "awareness" outcomes.
SAY: By the halfway point, you'll see a live stream with interactive overlays running on this laptop. By the end, you'll pitch your own streaming project to the room.
NEXT: Here's the roadmap for our 3 hours together.

::steps
# Workshop Roadmap
1. Streaming protocols and architecture — how the pipeline works and which protocol to use (50 min)
2. Live demo — a working streaming pipeline built from scratch, on this laptop (50 min)
3. Break (15 min)
4. Advanced topics and Q&A — authentication, recording, scaling (25 min)
5. Your hackathon plan — toolkit reference, scoping canvas, and 30-second pitches (25 min)

:::notes
SAY: Two big blocks before the break — theory then demo. Two shorter blocks after — advanced topics then your turn to plan.
KEY: The demo is the centerpiece. Everything before it builds up to it, everything after it builds on it.
WARN: Don't rush through this slide — let them see the shape of the session so they can pace themselves mentally.
NEXT: Before we dive in, I want to hear from you.

::prompt
# What streaming feature are you imagining for your hackathon project?
> Shout it out — one phrase. No wrong answers.
- Live poll overlay for esports
- AI-powered highlight clipper
- Audience-controlled camera switching
- Real-time player stats dashboard
- Interactive viewer predictions

:::notes
ASK: Read the question, then point at tables one by one. "Table 1, what are you thinking?"
WARN: Actually wait for answers. This tells you what the room cares about — adapt your emphasis accordingly.
KEY: If most teams say "overlays" or "interactive features," you know to spend extra time on WebRTC and the extension layer.
SAY: Great — keep those ideas in your head. By the end of this session you'll know exactly how to build them.
NEXT: Let's start with how streaming actually works under the hood.

---
title: Streaming Protocols & Architecture
duration: 50
---

::framework
# The Streaming Pipeline
- **Capture**: Camera, screen capture, or game feed produces raw video and audio. OBS Studio handles this.
- **Encode**: Raw frames compressed using H.264 codec — shrinks data from gigabits to megabits. OBS handles this too.
- **Ingest**: Encoded stream pushed to a media server using a protocol like RTMP. This is the "upload" leg.
- **Media Server**: Receives the stream, converts between protocols, routes to viewers. MediaMTX handles this.
- **Distribute**: Stream delivered to viewers via their chosen protocol. CDNs do this at scale; MediaMTX does it for prototypes.
- **Playback**: Viewer's browser or player decodes and renders the video. Different protocols deliver differently.

:::notes
KEY: This six-stage pipeline is the mental model for EVERYTHING else in the workshop. Every protocol, every tool, every feature maps to one of these stages.
SAY: OBS handles the first two stages. MediaMTX handles the middle two. Your hackathon project lives between distribute and playback — the last mile.
NEXT: Let me make this more concrete with an analogy.

::richText
# Think of It Like a Postal System
## The analogy that makes streaming click

Someone writes a letter (capture). They put it in an envelope (encode). They drop it at the post office (ingest). The post office sorts and routes it to the right destination (media server). Mail trucks deliver it (distribute). Someone opens and reads it (playback).

> The interesting question isn't how the post office works — it's what's IN the letter and what the reader does with it. That's your hackathon project.

## Different delivery methods
Regular mail takes days. A courier takes hours. A phone call is instant. Each has different cost, reliability, and speed trade-offs. Streaming protocols are exactly the same — different methods of delivering video with different latency and compatibility trade-offs.

:::notes
KEY: This analogy maps directly to the protocol deep-dives coming next — HLS is "regular mail," WebRTC is "a phone call."
SAY: Keep this postal analogy in mind. When we talk about HLS chopping video into segments, think envelopes. When we talk about WebRTC sending frames instantly, think phone call.
NEXT: So here's my question for you before we go deeper.

::prompt
# How much delay do you think there is between a streamer doing something on camera and a Twitch viewer seeing it?
> Quick gut check — shout out a number in seconds.
- Less than 1 second?
- 2-3 seconds?
- 5+ seconds?
- 10+ seconds?

:::notes
ASK: Read the question. Point at someone. "What's your guess?" Get 3-4 answers from the room.
SAY: Most people guess 1-2 seconds. The real answer for standard HLS delivery is 6 to 30 seconds. That's not a bug — it's how the protocol works. Let me show you why.
KEY: This surprise creates genuine curiosity for the protocol deep-dive that follows.
WARN: Actually let them guess before revealing the answer. The surprise is the hook.
NEXT: Let's understand why, starting with the protocol that gets streams TO the server.

::bullets
# RTMP — The Universal Ingest Protocol
## How streams get FROM the broadcaster TO the server
- Built by Macromedia in the Flash era — still the de facto ingest standard today
- Every encoder speaks RTMP: OBS Studio, FFmpeg, hardware encoders, streaming apps
- Latency: 1-3 seconds from broadcaster to server
- NOT for browser playback — Flash is dead. Browsers can't play RTMP anymore
- RTMP is now exclusively the language encoders use to PUSH streams to servers
- In our demo: OBS pushes to rtmp://localhost:1935/live

:::notes
KEY: RTMP is ingest only. It gets the stream to the server. It does NOT deliver to viewers. This distinction matters.
SAY: Think of RTMP as the loading dock at the post office. It's how packages arrive. But you don't pick up your mail at the loading dock — you need a different system for delivery.
DATA: Over 90% of all live streams on Twitch, YouTube, and Facebook are ingested via RTMP.
NEXT: Now let's look at how streams get FROM the server TO viewers — starting with the most compatible option.

::richText
# HLS — The Most Compatible Delivery Protocol
## Created by Apple. Works everywhere. But there's a catch.

HLS stands for HTTP Live Streaming. The server chops the live video into small .ts segment files — typically 2 to 6 seconds each — and writes a playlist file (.m3u8). The player downloads the playlist, then downloads and plays segments one by one in sequence.

> Because the player must download and buffer 2-3 complete segments before it can start playing, latency is 6 to 30 seconds. That's not a bug — it's the fundamental architecture.

## The trade-off
HLS works in every browser, every device, every CDN on earth. It's just HTTP file downloads. No special protocols, no firewall issues, no compatibility problems. That's why Netflix, YouTube, and every major platform use it for large-scale delivery. But the latency makes real-time interaction impossible.

## LL-HLS — Apple's improvement
Low-Latency HLS uses partial segments and server push to reduce latency to 2-5 seconds. A middle ground — better than HLS, broader support than WebRTC. Needs modern player support.

:::notes
KEY: HLS = maximum compatibility, maximum latency. The segment-based architecture is WHY it's both everywhere and slow.
SAY: Remember the postal analogy? HLS is regular mail. You collect sentences into a page, put the page in an envelope, mail it. The reader waits for the full envelope before reading. That batching is the latency.
DATA: HLS accounts for over 70% of all video streaming traffic on the internet.
NEXT: Now let's look at the opposite end of the spectrum — the protocol that makes interaction possible.

::richText
# WebRTC — The Protocol That Enables Interaction
## Originally built for video calls. Now the gold standard for interactive streaming.

WebRTC sends video frames individually over UDP — like a video call. No batching into segments. No waiting for envelopes. Each frame is transmitted the instant it's encoded and the browser renders it immediately.

> Latency: under 1 second. This is what makes live polls, predictions, chat-driven gameplay, and audience participation actually work.

## WHIP and WHEP — the new standards
WHIP (WebRTC-HTTP Ingestion Protocol) lets you publish a stream via WebRTC. WHEP (WebRTC-HTTP Egress Protocol) lets you play one back. Both use simple HTTP signaling — no complex handshake servers. MediaMTX supports both out of the box.

## The trade-off
Every WebRTC connection is stateful — the server maintains a live session per viewer. This makes it harder to scale to massive audiences compared to HLS (which is just file downloads). May need TURN/STUN servers for NAT traversal in production.

:::notes
KEY: WebRTC = sub-second latency = real-time interaction is possible. If a team's feature requires the viewer to REACT to the stream, WebRTC is mandatory.
SAY: WebRTC is the phone call in our postal analogy. Each word transmitted instantly. No envelopes, no batching, no waiting.
DATA: WebRTC is supported natively in Chrome, Firefox, Safari, and Edge — no plugins needed.
NEXT: Let me put these two side by side so the difference really clicks.

::comparison
# HLS vs. WebRTC — Segments vs. Frames
BEFORE: HLS chops video into 2-6 second segment files. The player downloads a playlist, then downloads segments one by one. Must buffer 2-3 segments before playing. Result: 6-30 seconds of latency. Like sending letters — collect, batch, mail, wait.
AFTER: WebRTC sends each frame individually over UDP the instant it's encoded. The browser decodes and renders immediately. Result: under 1 second of latency. Like a phone call — each word arrives as it's spoken.
INSIGHT: This isn't just a speed difference — it determines what features are possible. A live poll with a 30-second delay means viewers are voting on something that already happened.

:::notes
KEY: This is the single most important technical concept in the workshop. Everything about protocol choice flows from this.
SAY: Let them read both sides. Then say: "If you're building anything interactive — polls, predictions, audience participation — and your viewers are 30 seconds behind, your feature is broken by design."
NEXT: Two more protocols to mention briefly, then we'll look at how to choose.

::bullets
# RTSP and SRT — Niche But Useful
## Protocols most hackathon teams can skip unless their use case demands them
- RTSP (Real-Time Streaming Protocol): the IP camera and surveillance world's protocol. Very efficient over LAN/UDP. No browser support — needs VLC or FFplay. Use it if you're streaming from security cameras or on a local network.
- SRT (Secure Reliable Transport): built by Haivision for reliable ingest over unreliable networks. Handles packet loss, jitter, and encryption automatically. Use it if a remote caster needs to send a feed over bad Wi-Fi or across cities.
- Both are ingest/LAN-focused — neither works in browsers
- The two protocols 90% of hackathon teams need: RTMP for ingest, WebRTC or HLS for delivery

:::notes
KEY: Don't dwell here. RTSP and SRT are "good to know they exist" protocols for this audience.
SAY: Unless you're pulling feeds from IP cameras or dealing with terrible network conditions, you can ignore these for the hackathon. Focus on RTMP in, WebRTC or HLS out.
NEXT: So how do you actually choose the right protocol? Let me give you a decision tool.

::matrix
# Protocol Selection: Choose Your Weapon
X: Latency Requirement (Relaxed → Strict)
Y: Browser Support Needed (No → Yes)
TL: RTSP
- Surveillance and LAN streaming
- Efficient over UDP
- Use VLC or FFplay to view
TR: SRT
- Reliable remote ingest
- Survives bad Wi-Fi and packet loss
- No browser playback
BL: HLS / LL-HLS
- Works in every browser and device
- CDN-friendly, scales massively
- 2-30 second latency
BR: WebRTC (WHEP)
- Sub-second latency in browsers
- Essential for interactive features
- The sweet spot for hackathon projects

:::notes
KEY: Bottom-right is where most hackathon teams should land. WebRTC in the browser with sub-second latency.
SAY: Point at each quadrant. "If you need browser playback and low latency — bottom right, WebRTC. If you need maximum compatibility and scale — bottom left, HLS. Top row is for specialized ingest scenarios."
ASK: Based on your hackathon idea, which quadrant are you in? Quick show of hands for each.
NEXT: But protocol choice isn't just about technology — it's about what your feature needs.

::spectrum
# Latency Is a Feature Decision
- Too Much Latency (broad): HLS at 6-30 seconds. Fine for passive viewing — watching a tournament replay, large-scale broadcast. Completely breaks interactive features. Polls show stale results. Predictions arrive after the outcome. Chat feels disconnected from the action.
- The Sweet Spot (right): WebRTC at under 1 second or LL-HLS at 2-5 seconds. Enables real-time interaction while remaining practical for hackathon scope. Viewers react to what's happening NOW, not what happened 10 seconds ago.
- Over-Optimized (narrow): Obsessing over sub-50ms latency when your feature only needs 2-second responsiveness. Adds engineering complexity for zero user benefit. WebRTC's sub-second is more than enough for any hackathon interactive feature.

:::notes
KEY: This is the #1 takeaway from the protocol section — latency is a PRODUCT decision, not just a technical one.
SAY: Don't default to whatever protocol is easiest. Ask: does my feature need the viewer to react within 2 seconds? If yes, WebRTC. If no, HLS is simpler and more scalable.
ASK: Think about your hackathon project — does your feature break with a 6-second delay? That's your answer.
NEXT: Now that you know the protocols, let me show you where in the pipeline your hackathon project actually lives.

::framework
# Where Hackathon Teams Add Value
- **Interaction Layer**: Overlays, polls, predictions, chat widgets, audience participation, second-screen experiences. HTML/CSS/JS layered on the video player. The most hackathon-friendly layer — this is where 80% of winning projects will live.
- **Analytics Layer**: Viewer engagement tracking, stream health monitoring, attention heatmaps, content performance dashboards. Pull data from the API, visualize it.
- **Processing Layer**: Real-time data overlays showing player stats or live scores, AI features like auto-highlight detection or speech-to-text subtitles. Higher complexity, higher wow factor.
- **Ingest Layer**: Multi-source switching, automated camera selection for esports broadcasts, scene detection. Requires control over the OBS/encoder side.
- **Delivery Layer**: Custom players with interactive features, adaptive bitrate tuning, multi-quality options. Requires deeper streaming knowledge.

:::notes
KEY: The interaction layer is the most accessible and the most impactful for hackathon projects. HTML on top of a stream.
SAY: Walk through each layer. Spend the most time on Interaction. "A poll overlay on a live esports stream? That's interaction layer. A dashboard showing viewer engagement? Analytics layer. Both are completely buildable in 48 hours."
ASK: Which layer does your hackathon idea fit? Raise your hand when I say your layer.
NEXT: And here's the tool that makes all of this possible without building infrastructure.

::richText
# MediaMTX: Your Hackathon Foundation
## One command. Zero configuration. Every protocol.

MediaMTX is a zero-dependency media server written in Go. You run one Docker command and it gives you a multi-protocol streaming server that accepts RTMP, RTSP, SRT, and WebRTC ingest — and automatically converts to every output protocol simultaneously.

> Your hackathon project should NOT be a streaming server. MediaMTX handles ingest, protocol conversion, and delivery with one Docker command. Your job is to build something interesting at one of the five extension layers — most likely the interaction layer.

## What you get for free
Automatic protocol conversion. REST API for monitoring and control on port 9997. Recording to disk. Authentication hooks. WebRTC WHIP/WHEP support. All with zero configuration for basic use. An HTML page that consumes a WebRTC stream and layers interactive elements on top is a complete, competitive hackathon project.

:::notes
KEY: MediaMTX replaces months of infrastructure work. It's the foundation, not the project.
SAY: "You will not write a single line of media server code during this hackathon. MediaMTX does that. You will write the code that makes the EXPERIENCE interesting."
DATA: MediaMTX has 13,000+ GitHub stars and supports H.264, H.265, VP8, VP9, AV1, Opus, and AAC codecs out of the box.
NEXT: Now let's test whether you actually absorbed all of this. Time for a game.

::prompt
# Feature or Fantasy?
> I'll describe a hackathon feature idea. Your team votes: buildable in 48 hours or pure fantasy? Thumbs up for buildable. Thumbs down for fantasy. No middle ground — commit to your answer.
- Trust your instincts
- We'll see who has the best scope radar

:::notes
SAY: "We're going to play a game. I read a feature idea. You and your team have 10 seconds to decide. Thumbs up — you could build this in a hackathon weekend. Thumbs down — it's fantasy. Ready?"
KEY: This activity immediately tests whether the protocol theory stuck. The fun is in the disagreements.
WARN: Keep energy high. This should feel like a game, not a quiz. Move fast between scenarios.
NEXT: Here we go — first scenario.

::steps
# The Scenarios
1. "A browser overlay that shows live poll results on top of a WebRTC stream" → BUILDABLE. HTML/JS overlay on a WHEP stream. This is exactly what our demo does.
2. "A custom video codec that compresses game footage 10x better than H.264" → FANTASY. Codec development takes years and PhD-level expertise.
3. "An esports dashboard pulling live stats from a game API and overlaying them on the broadcast" → BUILDABLE. WebRTC stream + fetch() calls + DOM updates. Achievable.
4. "Real-time AI that watches the stream and auto-clips highlights instantly" → FANTASY for a hackathon. Real-time ML on video is computationally extreme.
5. "A multi-cam viewer — 4 tournament cameras, viewer clicks to switch" → BUILDABLE. Four WebRTC iframes, simple layout JS.
6. "Building your own CDN for 100,000 concurrent viewers" → FANTASY. CDN infrastructure is massive engineering.
7. "A 'predict the play' game — viewers vote before each round, see results live" → BUILDABLE. WebRTC + voting backend + overlay. Perfect hackathon scope.
8. "Re-streaming to Twitch, YouTube, and Kick simultaneously" → BUILDABLE. MediaMTX supports RTMP push to multiple destinations. Configuration, not code.

:::notes
KEY: Pause after EACH scenario. Wait for thumbs. Reveal the answer. Explain WHY in one sentence, tied to a protocol or scope concept.
SAY: For disagreements, ask a thumbs-up and a thumbs-down person to defend their position. That's where the best learning happens.
WARN: Don't rush. The pauses between scenarios ARE the activity. Spend 60-90 seconds per scenario.
NEXT: So what's the pattern here?

::prompt
# Which ones surprised you? What makes something buildable vs. fantasy?
> Discuss at your table for 30 seconds, then share.
- What was the pattern?
- What role did scope play?
- What role did "knowing your tools" play?

:::notes
ASK: "Table 3, which scenario surprised your team the most?" Get 2-3 responses.
KEY: Guide them to the answer: the line between buildable and fantasy is almost always about SCOPE — knowing what tools handle for you vs. what you'd build from scratch.
SAY: "The re-streaming one surprises most people. It sounds hard but it's literally a config change in MediaMTX. The AI highlights one sounds easy but it's months of ML engineering. Knowing your tools is the difference."
NEXT: Now let me PROVE everything I just told you. Live demo time.

::bullets
# The Buildable vs. Fantasy Rule
## The pattern behind every scenario
- If your idea USES a streaming server as a foundation → probably buildable
- If your idea IS a streaming server → fantasy for a hackathon
- Know what MediaMTX gives you for free: protocol conversion, multi-protocol output, REST API, recording
- The teams that win hackathons aren't the best coders — they're the best scopers
- Build one feature well, not five features badly

:::notes
KEY: "Best scopers, not best coders" — this should become a mantra for their hackathon prep.
SAY: "Every 'fantasy' scenario we just saw was fantasy because it tried to rebuild something that already exists. Every 'buildable' one succeeded because it built ON TOP of existing tools."
NEXT: Alright — enough theory. Let me show you a real streaming pipeline, live, from zero. Demo time.

---
title: Live Demo + You're the CTO
duration: 50
---

::hero
# Live Demo
## From Zero to Interactive Streaming in 15 Minutes
- One Docker command
- One OBS stream
- Six protocols simultaneously
- Interactive overlays on top

:::notes
SAY: "Everything I've told you about protocols, pipelines, and extension layers — you're about to see it working live on this laptop. No slides. No mockups. Real streams."
KEY: Build excitement. This is the moment the theory becomes real.
NEXT: Step one — start the server.

::steps
# Step 1: Start the Media Server
1. Run one command: docker compose up
2. MediaMTX starts and logs every port it's listening on
3. RTMP ready on port 1935 — waiting for OBS to push a stream
4. RTSP ready on port 8554 — for VLC and IP camera playback
5. HLS ready on port 8888 — for browser playback, any device
6. WebRTC ready on port 8889 — for sub-second interactive playback
7. SRT ready on port 8890 — for reliable remote ingest
8. REST API ready on port 9997 — for programmatic control

:::notes
KEY: "One command. Eight endpoints. Zero configuration." That's the headline.
SAY: "Watch the terminal. Every line that says 'listener opened' is a protocol ready to receive or deliver streams. We didn't write a config file. We didn't install dependencies. One command."
WARN: Make sure Docker is already running before the workshop. Test this the night before.
NEXT: Now let's give it something to stream.

::steps
# Step 2: Publish from OBS Studio
1. Open OBS Studio — already configured with a camera or screen capture
2. Go to Settings → Stream
3. Set Service to "Custom"
4. Set Server to rtmp://localhost:1935/live
5. Leave Stream Key as "live"
6. Click "Start Streaming"
7. Watch the MediaMTX terminal — it confirms the stream is received

:::notes
SAY: "OBS is now encoding your camera feed with H.264 and pushing it via RTMP to our MediaMTX server. That's the Capture → Encode → Ingest part of the pipeline happening in real-time."
KEY: Point at the MediaMTX log output when it says the stream is connected. That's the proof.
WARN: Have OBS pre-configured before the workshop. Don't fiddle with settings live — it kills momentum.
NEXT: Here's where it gets interesting — one input, many outputs.

::richText
# Step 3: One Stream, Three Protocols, Simultaneously
## Automatic protocol conversion in action

Open three windows side by side. Same stream, three different protocols, zero configuration:

> RTSP in VLC: rtsp://localhost:8554/live — "This is how IP cameras and surveillance systems consume streams."

> HLS in browser: http://localhost:8888/live — "This is what Netflix, YouTube, and every major platform uses for large-scale delivery."

> WebRTC in browser: http://localhost:8889/live — "Sub-second latency. This is what makes interactive features possible. Notice it loads almost instantly."

## What just happened
One RTMP input from OBS. MediaMTX automatically converted it to RTSP, HLS, and WebRTC simultaneously. No transcoding configuration. No protocol bridges. No code. This automatic conversion is what makes MediaMTX a "media router."

:::notes
KEY: The visual of three windows showing the same stream over different protocols is the most powerful moment in the demo.
SAY: "Same camera. Same server. Three completely different delivery methods. The HLS one took a few seconds to start because it needed to buffer segments. The WebRTC one was nearly instant. Remember why?"
ASK: "Can anyone tell me why the HLS player took longer to start?" — reinforces the segments vs. frames concept.
NEXT: Let's see what we can do programmatically.

::bullets
# Step 4: Query the REST API
## Everything is programmable
- List active streams: curl http://localhost:9997/v3/paths/list
- Show HLS sessions: curl http://localhost:9997/v3/hlsmuxers/list
- Show RTSP connections: curl http://localhost:9997/v3/rtspconns/list
- Show WebRTC sessions: curl http://localhost:9997/v3/webrtcsessions/list
- Your hackathon app can call these endpoints to check if a stream is live, count viewers, or get metadata

:::notes
SAY: "Run the first curl command. Show the JSON output. Every stream, every connection, every session — queryable via HTTP. Your hackathon app can use this API to build dashboards, trigger events when streams go live, or monitor stream health."
KEY: The API turns MediaMTX from a black box into a programmable platform. Teams building analytics or monitoring features will use this heavily.
NEXT: Now for the moment that makes the latency trade-off visceral.

::richText
# Step 5: Latency Comparison — See the Difference
## Same stream. Same server. Different protocols. Feel the delay.

Opening latency-compare.html — a side-by-side view of WebRTC and HLS playing the exact same live stream simultaneously.

> Watch the clock in the OBS scene. The WebRTC player shows it in real-time — under 1 second of delay. The HLS player is approximately 6 seconds behind. Count the gap yourself.

## Why this matters for your hackathon
If you build a live poll on the WebRTC stream, viewers vote on what's happening RIGHT NOW. If you build the same poll on the HLS stream, viewers are voting on something that already happened 6 seconds ago. The prediction game is over before the HLS viewer even sees the question. Protocol choice is a product decision.

:::notes
KEY: Let the demo speak for itself. The visible gap between the two players is more persuasive than any slide.
SAY: "Count with me. One... two... three... four... five... six. That's the gap. Now imagine running a live prediction game on the right side. The round is over before the viewer sees the prompt."
WARN: Make sure there's a visible moving element in the OBS scene — a clock, a timer, or wave your hand. Static scenes don't show latency.
NEXT: Let that sink in for a moment.

::prompt
# Can you see the delay? Count the seconds.
> This is the difference between a viewer WATCHING a stream and a viewer PARTICIPATING in it.
- WebRTC: the viewer is IN the moment
- HLS: the viewer is watching a replay of 6 seconds ago
- Every interactive feature you build depends on this choice

:::notes
SAY: Let the room sit with this for 15 seconds. Don't rush. The silence is powerful after the demo.
KEY: This visual proof is what they'll remember. Not the slides — this moment.
NEXT: Now let me show you what you can BUILD on top of this.

::richText
# Step 6: Interactive Overlay Demo
## This is where YOUR hackathon project lives

Opening overlay.html — a full-screen WebRTC player with HTML/CSS/JS overlays layered on top:

> A pulsing "LIVE" badge. A viewer count. A live poll with animated progress bars — "Who will win this round?" A simulated chat feed with messages appearing in real-time. A player stats bar showing uptime, latency, and current protocol. And a protocol switcher that toggles between WebRTC and HLS.

## The key insight
The video stream is untouched. MediaMTX handles all of that. Everything you see on top — the poll, the chat, the stats, the badges — is pure HTML, CSS, and JavaScript positioned over the video element. The stream doesn't know about the overlays. The overlays consume the stream. This separation is the architecture.

:::notes
KEY: "The stream doesn't know about the overlays" — this is the core architectural insight. Repeat it.
SAY: "Click the poll. Watch the bars animate. Send a chat message. All of this is standard web development — HTML, CSS, JavaScript. The hard part — getting the video here — is already done by MediaMTX. Your hackathon project IS the stuff on top."
WARN: Click on things. Interact with the overlay live. Don't just show it statically.
NEXT: Let me show you the architecture behind this.

::framework
# The Overlay Architecture
- **Video Layer**: WebRTC stream from MediaMTX via an iframe or video element. Handles all streaming infrastructure — codec, transport, buffering. You don't touch this.
- **Overlay Layer**: HTML/CSS elements positioned absolutely over the video. Uses pointer-events: none so most clicks pass through, with pointer-events: auto on interactive elements.
- **Data Layer**: JavaScript that fetches data and updates the DOM — poll results, chat messages, viewer counts, player stats. Could connect to any backend API.
- **Interaction Layer**: Click handlers, form inputs, WebSocket connections — the code that lets viewers DO things. Vote in polls, send chat messages, trigger events.

:::notes
KEY: This is the same architecture as Twitch Extensions, YouTube Live overlays, and every esports broadcast widget.
SAY: "Four layers. You get the video layer for free from MediaMTX. The overlay layer is CSS positioning. The data and interaction layers are where YOUR code lives. Standard web development on top of a live stream."
NEXT: Now watch what happens when I switch protocols live.

::richText
# Step 7: The Protocol Switch Moment
## Feel the difference in your gut

Clicking the protocol switcher in the overlay from WebRTC to HLS. Watch what happens.

> The video reloads. There's a loading delay. Then the stream resumes — but now it's 6 seconds behind. The poll is still real-time. The chat is still real-time. But the VIDEO is showing the past.

## What this means
If this were a live prediction game, the round would already be over by the time the HLS viewer sees the question. The overlays work perfectly — they're just HTML. But the viewer experience is fundamentally broken because the video and the interaction are out of sync. Protocol choice isn't just technical — it's a product decision that determines whether your feature works or fails.

:::notes
KEY: This is the "aha" moment. The overlays still work but the experience is broken because the video is delayed.
SAY: "The poll is still live. The chat is still live. But the person watching through HLS is voting on something they haven't seen yet. This is why protocol choice matters for interactive features."
NEXT: Alright — you've seen a complete streaming pipeline. Now let me hear what ideas this sparked.

::prompt
# What interactive features could you layer on this stream?
> Quick brainstorm — what would you build on top of what you just saw?
- Countdown timers
- Viewer-controlled camera angles
- Live betting odds
- Real-time player statistics
- Audience-triggered sound effects
- Crowd-sourced commentary

:::notes
ASK: "Based on what you just saw — what would you build? Shout out ideas." Collect 4-5 from the room.
SAY: React to each idea — "That's interaction layer, WebRTC for sure." / "That could work with HLS actually, since it's not latency-sensitive."
KEY: This bridges the demo into the activity. They're already thinking about their own projects.
NEXT: Let me recap what you just saw, then we're going to put you in the hot seat.

::steps
# What You Just Saw: Recap
1. Started a multi-protocol streaming server with one Docker command
2. Published a live stream from OBS Studio via RTMP
3. Watched the same stream over RTSP, HLS, and WebRTC simultaneously
4. Queried the server's REST API programmatically
5. Compared HLS latency (~6 seconds) vs. WebRTC latency (<1 second) side by side
6. Saw interactive HTML/CSS/JS overlays on top of a live WebRTC stream
7. Switched protocols live and felt the latency break the experience

:::notes
KEY: This entire setup took under 15 minutes. That's the point — their hackathon starts at step 8, not step 1.
SAY: "From zero to interactive streaming in 15 minutes. Your hackathon team can replicate everything you just saw on day one. Every remaining hour goes to building YOUR feature."
DATA: Total infrastructure code written: zero lines. Total configuration files edited: zero.
NEXT: Now it's your turn to make some decisions. Let's play a game.

::richText
# You're the CTO
## A role-play decision game

Here's your scenario:

> Your esports startup just signed a deal to broadcast a 3-day tournament starting next week. Expected peak: 5,000 concurrent viewers. You have 2 developers, a MediaMTX server, OBS Studio, and 7 days. The tournament sponsor wants ONE interactive feature visible on the broadcast.

## Your three options
**Option A — Live Prediction Game**: Viewers guess round outcomes before each match. Results shown in real-time on the stream overlay. Requires a voting backend and real-time result display.

**Option B — Real-Time Stats Overlay**: Pull player performance data from the game's API and display it as a dynamic overlay during the broadcast. Requires API integration and data visualization.

**Option C — Viewer-Controlled Camera Switcher**: 3 camera angles on the tournament. Viewers vote on which angle the broadcast shows. Requires multi-stream management and a voting mechanism.

:::notes
SAY: "You're the CTO. 2 developers, 7 days, one shot. The sponsor is watching. Which feature do you ship?"
KEY: All three are buildable — the question is trade-offs, risk, and protocol choice.
WARN: Give them a full 5 minutes to discuss. Don't rush this. The conversation at the tables IS the activity.
NEXT: Let them discuss, then we do the share-out.

::steps
# CTO Decision Time
1. Read the three options with your team (1 min)
2. Pick ONE feature — A, B, or C (1 min)
3. Decide which delivery protocol and why (1 min)
4. Identify the single biggest risk to shipping in 7 days (1 min)
5. Prepare to defend your choice to the room (1 min)

:::notes
SAY: "5 minutes. I'm timing you. Pick one feature, one protocol, one risk. Write it down. You WILL present."
WARN: Walk the room while teams discuss. Listen for misconceptions you can address during the share-out.
KEY: The constraint of choosing ONE feature forces them to think about scope — the most important hackathon skill.
NEXT: Time's up. Let's hear your decisions.

::prompt
# CTOs — stand up. 60 seconds to defend your choice.
> Which feature? Which protocol? What's the biggest risk?
- Be specific
- Be honest about trade-offs
- Prepare to be challenged

:::notes
ASK: Pick 3-4 teams. After each presentation, challenge them: "You picked the prediction game — what happens if your voting backend crashes mid-tournament?" / "You picked the camera switcher — can a viewer's laptop handle 3 concurrent WebRTC streams?" / "You picked the stats overlay — what if the game API has a 10-second response time?"
SAY: "There's no single right answer. The point is that every choice has trade-offs. Thinking through those trade-offs BEFORE the hackathon is the skill that separates good teams from great ones."
WARN: Keep it fun and fast. This is a debate, not an exam. Celebrate bold choices.
NEXT: Great decisions. Now let's take a break before we go deeper.

::bullets
# CTO Debrief: What We Learned
## The lessons behind every choice
- Every feature choice has a protocol implication — predictions need WebRTC, stats overlay might work with LL-HLS
- Every protocol choice has a scale and complexity trade-off
- The biggest hackathon risk is never technical skill — it's scope
- MediaMTX handles the hard part so you can focus entirely on the feature
- The best answer was always the one with the clearest "what we're NOT building" statement

:::notes
KEY: "The best answer had the clearest 'not building' statement" — this is the scoping mindset they need for the hackathon.
SAY: "Notice how every team that struggled to answer was trying to do too much. The teams with crisp answers knew exactly what was in scope and what wasn't."
NEXT: Let's take 15 minutes. Grab coffee. Come ask me questions. We'll come back for advanced topics and your hackathon planning.

---
title: Break
duration: 15
---

::prompt
# 15-Minute Break
> Stretch, grab coffee, come ask questions about the demo or your hackathon project. We come back for advanced topics and your 30-second pitch.
- The demo machine is still running — come play with it
- Questions about your specific project? Now's the time

:::notes
SAY: "The demo is still live. Come up and click around. Switch protocols. Open the API. If you have questions about YOUR specific project, grab me during the break."
WARN: Leave the demo running on the projector during the break. Curious people will come up and explore.
NEXT: When we come back — advanced topics, your toolkit reference, and you'll pitch your hackathon idea.

::canvas
# Quick Reference — Photograph This
- **Start Server**: docker compose up (or docker run --rm -it --network=host bluenviron/mediamtx:latest)
- **OBS Settings**: Service: Custom / Server: rtmp://localhost:1935/live / Stream Key: live
- **Watch via HLS**: http://localhost:8888/live (any browser, ~6s delay)
- **Watch via WebRTC**: http://localhost:8889/live (Chrome/Firefox, <1s delay)
- **Watch via RTSP**: rtsp://localhost:8554/live (open in VLC)
- **REST API**: curl http://localhost:9997/v3/paths/list
- **Test Stream (no OBS)**: ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f flv rtmp://localhost:1935/test

:::notes
SAY: "Take a photo of this slide. These are the commands you'll need on hackathon day."
KEY: This is the most practical slide in the entire workshop. Make sure everyone photographs it.
WARN: Keep this slide up during the entire break.

---
title: Advanced Topics & Q&A
duration: 25
---

::bullets
# Authentication & Access Control
## Restricting who can publish or view streams
- MediaMTX supports internal username/password credentials in mediamtx.yml
- External HTTP authentication webhooks — your app decides who gets access
- Publish authentication: control who can push streams to the server
- Read authentication: control who can watch streams — useful for paid or private broadcasts
- For the hackathon: skip auth unless your feature specifically requires access control

:::notes
KEY: Auth is a "nice to have" for hackathon projects. Mention it so they know it exists, don't deep-dive.
SAY: "If your hackathon project involves paid streams or private rooms, you'll configure auth. Otherwise, skip it and focus on your feature."
NEXT: Another feature you might need — recording.

::bullets
# Recording & Playback
## Saving live streams for later
- MediaMTX records live streams to disk in fMP4 or MPEG-TS format
- Configure in mediamtx.yml: set the record path and format
- Useful for: highlight systems, replay features, VOD after a live event, clip generation
- Recordings are standard video files — process them with FFmpeg, serve them via any web server
- Combined with the REST API, you can trigger recordings programmatically

:::notes
KEY: Recording is simple to enable and opens up a whole category of hackathon projects — highlights, replays, clips.
SAY: "If your project involves any kind of 'watch it again' feature — highlights, best-of clips, post-match replays — recording is one config line in MediaMTX."
NEXT: What about video quality and multiple resolutions?

::comparison
# Transcoding & Adaptive Bitrate
BEFORE: MediaMTX does NOT have built-in transcoding. It routes streams between protocols without re-encoding. If you need multiple quality renditions (1080p, 720p, 480p), you must use FFmpeg as an external transcoder.
AFTER: OvenMediaEngine (OME) has a built-in transcoder with adaptive bitrate support for both WebRTC and LL-HLS. It generates multiple quality renditions from a single ingest automatically. It also includes OvenPlayer — a dedicated JavaScript player.
INSIGHT: For the hackathon, MediaMTX is simpler and faster to set up. Use OME only if adaptive bitrate is core to your feature. Don't add complexity you don't need.

:::notes
KEY: MediaMTX for simplicity, OvenMediaEngine for production features. Most hackathon teams should stick with MediaMTX.
SAY: "If someone asks 'can my viewer choose 720p vs 1080p?' — that's transcoding. MediaMTX can't do it alone. OME can. But for a hackathon prototype, one quality level is perfectly fine."
NEXT: What about when your project needs to handle thousands of viewers?

::richText
# Scaling Beyond the Hackathon
## Your prototype doesn't need to handle 100K viewers. But here's how it would.

For the hackathon, MediaMTX on one machine handles your demo audience perfectly. Don't optimize for scale during a 48-hour sprint — prove the concept first.

> When you're ready to scale: Origin-Edge clustering separates ingest (origin server) from delivery (edge servers). OvenMediaEngine supports this natively. For HLS delivery at massive scale, put a CDN (CloudFront, Akamai) in front of the server — HLS is just HTTP files, CDNs are built for this.

## The scaling cheat sheet
WebRTC scales harder than HLS because every connection is stateful. For large WebRTC audiences, look into SFU (Selective Forwarding Unit) architecture — the server forwards packets without decoding them. For HLS, just add a CDN. For the hackathon: don't worry about any of this.

:::notes
KEY: "Prove the concept first, scale later." This is permission to NOT over-engineer during the hackathon.
SAY: "If a judge asks 'how does this scale?' — you say 'Origin-Edge clustering for the server, CDN for HLS delivery, SFU for WebRTC.' You don't need to build it. You need to know the answer."
NEXT: One more reference point before Q&A — how the pros do it.

::richText
# The Twitch Extension Model
## How the industry separates streams from interactivity

Twitch Extensions are sandboxed HTML/JS apps running inside iframes, overlaid on the video player. They communicate via a JavaScript Helper SDK but never touch the video stream itself.

> This is exactly the architecture of our overlay.html demo: video underneath, interactive web content on top. The stream and the extension are completely independent. The extension reads data and renders UI — it never encodes, decodes, or modifies video.

## Why this matters for you
If you're building interactive overlays, study how Twitch Extensions separate concerns. Your hackathon project follows the same pattern: MediaMTX handles the stream, your HTML/CSS/JS handles the experience. The cleaner this separation, the easier your project is to build, debug, and demo.

:::notes
KEY: Twitch Extensions are the real-world proof that this architecture works at scale — millions of viewers, thousands of extensions.
SAY: "Twitch didn't give extension developers access to the video pipeline. They gave them an iframe on top and a data API. Your hackathon project works the same way."
NEXT: What questions do you have?

::prompt
# Open Q&A
> What questions do you have? About protocols, the demo, your hackathon project, MediaMTX — anything.
- Protocol choices for your specific idea?
- Technical feasibility questions?
- How to get started on hackathon day?
- Anything from today that didn't click?

:::notes
ASK: "Who has a question? About anything — protocols, the demo, your specific hackathon idea."
WARN: If no hands go up, seed it: "Who's planning to use WebRTC? Who's going HLS? Tell me why." or "What's the riskiest part of your hackathon project right now?"
SAY: Spend 5-8 minutes here. Answer concisely. If a question is too specific to one team, offer to chat during or after the next section.
NEXT: Let's move to your hackathon planning — toolkit, scoping, and your 30-second pitch.

---
title: Toolkit & Hackathon Planning
duration: 25
---

::canvas
# Streaming Toolkit Quick Reference
- **MediaMTX Docker**: docker compose up — or — docker run --rm -it --network=host bluenviron/mediamtx:latest
- **Default Ports**: 1935 (RTMP ingest) / 8554 (RTSP) / 8888 (HLS) / 8889 (WebRTC) / 9997 (REST API)
- **OBS Ingest**: Service: Custom / Server: rtmp://localhost:1935/live / Key: live
- **Protocol Cheat Sheet**: RTMP for ingest → WebRTC for interactive playback → HLS for passive broad compatibility → LL-HLS for middle ground
- **API Check**: curl http://localhost:9997/v3/paths/list — lists all active streams and sessions
- **Test Without OBS**: ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f flv rtmp://localhost:1935/test

:::notes
SAY: "This is your hackathon day-one cheat sheet. Photograph it. Pin it. Tape it to your monitor. You should be streaming within 15 minutes of the hackathon starting."
KEY: This is the most actionable slide in the deck. Every command is copy-paste ready.
WARN: Make sure everyone has time to photograph this. Pause for 30 seconds.
NEXT: Now let's talk about how to pick the right protocol for YOUR project.

::steps
# Protocol Decision Tree
1. Does your feature require the viewer to react within 2 seconds of a live event? → Yes: WebRTC (WHEP). No: continue.
2. Do you need to support every device and browser, including old ones? → Yes: HLS. No: continue.
3. Do you want lower latency than HLS but broader support than WebRTC? → LL-HLS.
4. Is your ingest source OBS Studio or FFmpeg? → RTMP for ingest. This is almost always the answer.
5. Is your ingest source a web browser (no OBS)? → WHIP (WebRTC ingest via MediaMTX).

:::notes
KEY: Most hackathon teams will land on "RTMP in from OBS, WebRTC out to the browser." That's the default stack.
SAY: "Walk through this tree with your hackathon idea in mind. Most of you will end up at step 1: yes, I need interactivity, therefore WebRTC. That's the right answer for most hackathon streaming projects."
NEXT: Now let's make sure you leave here with a concrete plan — not just protocol knowledge.

::canvas
# Streaming Concept Scoping Canvas
- **Project Name**: Your team's hackathon project title
- **Streaming Concept**: One-sentence description of your streaming feature
- **Ingest Protocol**: How does the stream get into the system? RTMP from OBS? WebRTC from browser? SRT from a remote source?
- **Delivery Protocol**: How does the viewer receive the stream? WebRTC for interactive? HLS for broad compatibility? LL-HLS for middle ground?
- **Innovation Layer**: Where in the pipeline is your team adding value? Interaction, analytics, processing, ingest, or delivery?
- **Media Server**: What does MediaMTX handle for you? What's NOT your problem?
- **Latency Requirement**: Does your feature need sub-second latency? If yes, WebRTC is mandatory.
- **Feasibility Cut**: One feature you're explicitly saving for post-hackathon. What's out of scope?

:::notes
SAY: "Photograph this canvas. Fill it out with your team before the hackathon starts. If you can answer all eight fields, your project is scoped. If you can't, you need to simplify."
KEY: The most important field is "Feasibility Cut" — what you're NOT building. Teams that can't answer this will over-scope.
WARN: Don't have them fill this in now — the 30-second pitch will force them to answer the key questions verbally.
NEXT: Speaking of which — it's pitch time.

::prompt
# 30-Second Pitch
> Every team stands up and pitches their hackathon streaming idea in 30 seconds. You MUST include three things:
- Your delivery protocol and WHY you chose it
- Which of the five extension layers your innovation lives at
- One thing you're explicitly NOT building — what does MediaMTX handle for you?

:::notes
SAY: "If you can't name all three in 30 seconds, you're not ready — and knowing that NOW is more valuable than finding out on hackathon day."
KEY: This is the most valuable activity in the workshop. It forces crystallization and gives teams immediate expert feedback.
WARN: Hold them to 30 seconds. Use a timer. The constraint is the point — if you can't explain it in 30 seconds, you don't understand it well enough yet.
ASK: "Who's first? Volunteers get gentler feedback. Teams I cold-call get harder questions."
NEXT: Give feedback after each pitch.

::richText
# Pitch Feedback Guide
## What the facilitator listens for

After each 30-second pitch, give one sentence of feedback:

> "Strong scope — WebRTC is the right call for real-time predictions." / "That sounds more like an HLS use case — do your viewers actually need sub-second latency?" / "What does MediaMTX handle for you? Make sure you're not rebuilding protocol conversion." / "Tight scope, I think that ships in 48 hours." / "That's ambitious — what would you cut if you're behind on day two?"

## The pattern to reinforce
The best pitches clearly separated what MediaMTX handles (infrastructure) from what the team builds (innovation). The weakest pitches described building infrastructure that already exists. Point this out every time.

:::notes
SAY: "After all the pitches, summarize: The strongest pitches had three things in common — a clear protocol choice tied to a feature requirement, a specific innovation layer, and a confident 'MediaMTX handles X so we don't have to.'"
KEY: The feedback is as valuable as the pitch itself. Be specific and actionable.
WARN: Keep the pace fast. 30 seconds per pitch, 15 seconds of feedback. Hit as many teams as time allows.
NEXT: Let's wrap up with the key takeaways.

::bullets
# Key Takeaways
## What to remember when you walk out that door
- The streaming pipeline: Capture → Encode → Ingest → Server → Distribute → Playback
- Protocol choice is a product decision: WebRTC for interaction (<1s), HLS for scale (6-30s), LL-HLS for the middle ground
- MediaMTX gives you multi-protocol streaming with one Docker command — don't rebuild what you get for free
- Your hackathon project lives at the extension layer — HTML/CSS/JS on top of a live stream
- Scope is the #1 hackathon risk — build one feature well, not five features badly
- You have the toolkit reference, the scoping canvas, and the decision tree — use them on day one

:::notes
KEY: These six bullets are the workshop distilled. If they remember nothing else, these six points will carry them through the hackathon.
SAY: "If you only remember one thing: your job is not to build a streaming server. Your job is to build the most interesting experience ON TOP of one. MediaMTX is your foundation. Build up, not down."
NEXT: One final slide.

::hero
# You Have the Tools. You Have the Pipeline. You Have the Protocols.
## Now go build something people want to watch — and interact with.
- See you at the hackathon
- Questions? Find me after the session
- Good luck, and scope wisely

:::notes
SAY: "Thank you all. You came in knowing nothing about streaming protocols. You're leaving with a working mental model, a toolkit, and a plan. Go build something amazing. And remember — one Docker command, then build the interesting stuff."
KEY: End on energy. This is the send-off to the hackathon.
