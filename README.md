# AI Tutor Live (V0.1)

Production-quality V0.1 Live AI Tutor web application powered by **Google Gemini Multimodal Live API** (`models/gemini-3.8-live`) with bidirectional, low-latency streaming voice conversation and instant barge-in interruption.

---

## 🌟 Key Features

1. **Native Gemini Multimodal Live API (`models/gemini-3.8-live`)**:
   - Direct full-duplex persistent WebSocket connection via Google Generative Service `BidiGenerateContent`.
   - Real-time 16kHz 16-bit Mono Linear PCM audio streaming from student microphone to Gemini.
   - Streamed 24kHz PCM audio playback from Gemini directly to the student's browser.
   - Low-latency conversational response with natural voice preset (`Aoede`).

2. **Native Barge-In / Interruption Handling**:
   - When the student speaks while the teacher is speaking, Gemini detects user speech and sends an `interrupted: true` event.
   - The application immediately terminates scheduled audio buffers and resets the playback timeline, allowing the student to interrupt naturally without speaking over each other.

3. **High-End Minimalist Educational UI**:
   - Polished aesthetic combining Google Meet and Apple/Linear design principles.
   - Large circular Teacher Avatar with audio-reactive multi-ring pulse reflecting live volume.
   - Top status bar: Live 1-on-1 Class indicator, real-time connection status pill (`Connecting`, `Connected`, `Listening`, `Teacher speaking`, `Muted`, `Disconnected`).
   - Floating call control bar: Mic mute/unmute (`M`), End call (`Esc`).
   - Clean, non-intrusive floating live transcript.
   - Graceful error modal with "Try Again" recovery.

4. **Security & Production Ephemeral Token Ready**:
   - Single configuration point in `.env.local` (`GEMINI_API_KEY`, `NEXT_PUBLIC_GEMINI_MODEL`).
   - The backend `/api/session` endpoint provides a clean abstraction layer, making it trivial to swap the development API key with a backend-generated ephemeral token.
   - `.env*.local` is strictly excluded in `.gitignore`.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24.21.0)
- **Browser**: Modern Chromium (Chrome, Edge, Brave) or Firefox with microphone permissions enabled.

### 2. Environment Configuration
Create or edit `.env.local` at the root of the project:
```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_GEMINI_MODEL=models/gemini-3.8-live
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Application

#### Development Mode:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Build & Start:
```bash
npm run build
npm run start
```

---

## 🎧 Classroom Experience Workflow

1. Open `http://localhost:3000`.
2. View the initial welcome screen (**Start Live Class**). No microphone permission is requested before clicking.
3. Click **Start Live Class**.
4. The browser prompts for microphone access &rarr; click **Allow**.
5. The session connects via WebSocket to Google's Gemini Live servers and sends the tutor persona setup payload.
6. The status updates to **Connected** then **Listening**.
7. Speak into the microphone. Gemini streams audio responses back in real time.
8. Interrupt the teacher anytime by speaking &rarr; the teacher stops immediately and listens.
9. Click the microphone icon or press `M` to mute/unmute.
10. Click **End Class** or press `Escape` to close the session and return to the home screen.

---

## 📁 Architecture Overview

```
src/
├── app/
│   ├── api/
│   │   └── session/
│   │       └── route.ts         # Secure backend session endpoint (ready for ephemeral tokens)
│   ├── globals.css              # Apple/Linear dark canvas, typography, ambient gradients
│   ├── layout.tsx               # Root layout & responsive viewport metadata
│   └── page.tsx                 # Master classroom page (Idle state, Active call stage, Error handling)
├── components/
│   ├── TeacherAvatar.tsx        # High-end circular avatar with live audio-reactive pulse rings
│   ├── CallControls.tsx         # Floating bottom control bar (Mic mute/unmute, End call, audio meters)
│   ├── ConnectionStatus.tsx     # Top bar status indicators (Connected, Listening, Speaking, etc.)
│   ├── LiveTranscript.tsx       # Minimalist floating recent transcript
│   └── ErrorModal.tsx           # Friendly user-facing error dialog with recovery
├── hooks/
│   └── useGeminiLive.ts         # Master hook coordinating audio streaming, playback, WebSocket, and state
├── services/
│   ├── audioStreamer.ts         # Microphone capture & 16kHz PCM downsampler
│   ├── audioPlayer.ts           # Web Audio API 24kHz PCM gapless streaming player with instant barge-in clearing
│   └── geminiWebSocket.ts       # Gemini Multimodal Live API WebSocket client
└── types/
    └── liveSession.ts           # Strict TypeScript contracts for session & connection states
```

---

## 🔒 Security & Upgrade to Production Ephemeral Tokens

In production:
1. Replace `GEMINI_API_KEY` pass-through in `src/app/api/session/route.ts` with Google's Ephemeral Token API call (`client.tokens.create(...)`).
2. Client code remains completely unchanged, as it consumes `{ apiKey: ephemeralToken, model, ... }`.
