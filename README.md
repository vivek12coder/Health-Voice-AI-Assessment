# Health Voice AI — Conversational Health Screening Agent

> **Developed by Vivek**

An AI-powered conversational voice health screening web application. Users have a natural, hands-free voice dialogue with an AI health screening assistant that asks questions one at a time, detects speech and pauses automatically using client-side Voice Activity Detection (VAD), and produces a structured clinical health report at the end.

---

## 🌟 Key Features

- 🗣️ **Hands-Free Conversational Voice Mode** — Click **Start Call** once and talk naturally like a phone call; no need to repeatedly hold/press buttons.
- 🎙️ **Real-Time Voice Activity Detection (VAD)** — In-browser RMS energy analysis automatically detects when speech begins and ends.
- ⏱️ **Configurable Silence Detection** — Tolerates natural short pauses (~1.2s sustained silence threshold triggers turn finalization).
- 🔊 **High-Fidelity 16kHz PCM WAV Audio** — Native uncompressed 16kHz mono WAV recording for 100% reliable transcription with Sarvam STT.
- 🔇 **Acoustic Echo Prevention** — Automatically disables VAD listening during AI voice playback to avoid false recording triggers from speaker feedback.
- 🌊 **Dynamic Live Visualizer** — Real-time waveform reactive to microphone volume (emerald during speech, cyan in listening, purple during AI playback).
- 🤖 **Adaptive Health Screening (Sarvam LLM)** — Collects patient name, main concern, duration, severity, and related symptoms without repeating questions.
- 🇮🇳 **Bilingual Support (English & Hindi)** — Built-in language selector supporting `en-IN` and `hi-IN`.
- 📋 **Structured Clinical Health Report** — Extracts structured health summary, severity indicators, and follow-up guidance upon call completion.

---

## 🔄 Conversation Flow

```text
               ┌──────────────────────────────┐
               │    User clicks START CALL    │
               └──────────────┬───────────────┘
                              │
               ┌──────────────▼───────────────┐
               │      AI Generates Greeting   │
               │   (Spoken aloud via TTS)     │
               └──────────────┬───────────────┘
                              │ AI finishes speaking
               ┌──────────────▼───────────────┐
         ┌────►│   🟢 Listening Automatically  │
         │     └──────────────┬───────────────┘
         │                    │ User speaks naturally
         │     ┌──────────────▼───────────────┐
         │     │     Speech Start Detected    │
         │     │   (16kHz PCM Audio Captured) │
         │     └──────────────┬───────────────┘
         │                    │ User pauses (1.2s sustained silence)
         │     ┌──────────────▼───────────────┐
         │     │   Speech Finalized & Sent    │
         │     └──────────────┬───────────────┘
         │                    │
         │     ┌──────────────▼───────────────┐
         │     │   🟡 Processing (STT + LLM)  │
         │     └──────────────┬───────────────┘
         │                    │
         │     ┌──────────────▼───────────────┐
         │     │  🟣 AI Speaks Follow-up (TTS)│
         │     └──────────────┬───────────────┘
         │                    │ AI playback finishes
         └────────────────────┘
                              │ User clicks END CALL
               ┌──────────────▼───────────────┐
               │   Structured Health Report   │
               └──────────────────────────────┘
```

---

## 🏗️ Architecture & Tech Stack

```text
Browser (React + TypeScript + Vite)
    │
    ├── VAD & Silence Detector (vad.ts)
    ├── 16kHz PCM Audio Recorder & WAV Encoder (audioRecorder.ts)
    ├── Centralized State Machine (useVoiceCall.ts)
    ├── Live Canvas Waveform Visualizer (AudioVisualizer.tsx)
    └── WebSocket Client (useWebSocket.ts)
    │
    ▼ WebSocket (ws://localhost:5000/ws)
    │
Node.js + Express Backend
    │
    ├── Session & Conversation Manager (conversationManager.ts)
    ├── Speech-to-Text  → Sarvam STT (saaras:v3)
    ├── Conversation     → Sarvam LLM (sarvam-105b-conversations / sarvam-m4)
    ├── Text-to-Speech   → Sarvam TTS (bulbul:v3)
    └── Report Generator (reportGenerator.ts)
    │
    ▼
Structured Clinical Health Report
```

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Modern dark-mode UI with glassmorphism |
| **Audio Engine** | Web Audio API | RMS energy meter, 16kHz PCM resampling, WAV encoder |
| **Backend** | Node.js, TypeScript, Express | Session-based conversational orchestration |
| **Transport** | WebSocket (`ws`) | Real-time bidirectional event streaming |
| **STT** | Sarvam AI (`saaras:v3`) | Indian accent & language-optimized Speech-to-Text |
| **LLM** | Sarvam AI (`sarvam-105b-conversations`) | Empathetic, concise clinical intake dialogue |
| **TTS** | Sarvam AI (`bulbul:v3`) | Natural conversational Indian voice playback |

---

## 📋 Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Sarvam AI API key** with access to STT, LLM, and TTS endpoints

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Health-Voice-AI-Assessment.git
cd Health-Voice-AI-Assessment
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and provide your Sarvam API subscription key:  

```env
SARVAM_API_KEY=your_sarvam_api_key_here "sk_jj12gw9k_9vebtclLlPhIBlMbH4T0gKRo"
PORT=5000
CLIENT_URL=http://localhost:5173
```

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Run the application

```bash
npm run dev
```

This concurrently starts:
- **Backend server**: `http://localhost:5000` (WebSocket: `ws://localhost:5000/ws`)
- **Vite React client**: `http://localhost:5173`

### 5. Open in browser

Navigate to [http://localhost:5173](http://localhost:5173).

---

## 🎯 How to Use

1. **Select Language**: Choose between **English (India)** or **हिन्दी (Hindi)** on the start screen.
2. **Start Call**: Click **Start Call** once. Microphone permissions will be requested once upfront.
3. **Listen to AI**: The AI assistant introduces itself and asks for your name.
4. **Speak Naturally**: When the AI finishes speaking, the indicator turns to 🟢 `Listening — speak naturally`. Answer the question and simply pause when you are done.
5. **Hands-Free Dialogue**: The system automatically detects your pause, transcribes your speech, generates the AI response, and plays the voice back.
6. **End Call**: Click **End Call** when finished to receive your structured clinical health report.
7. **Start New Call**: Review your report and click **Start New Call** to begin a fresh session without reloading.

---

## ⚙️ Voice Activity Detection (VAD) Configuration

All VAD parameters are centralized in [`client/src/services/vad.ts`](client/src/services/vad.ts):

```typescript
export const DEFAULT_VAD_CONFIG = {
  speechThreshold: 0.022,        // RMS volume threshold to trigger speech start
  silenceDurationMs: 1200,       // Sustained silence duration to finalize turn
  minSpeechDurationMs: 300,      // Minimum speech duration to filter noise/clicks
  maxUtteranceDurationMs: 30000, // Maximum allowed utterance before auto-submit
  noSpeechPromptMs: 12000,       // Duration of quiet before prompting user
};
```

---

## 📁 Project Structure

```text
Health-Voice-AI-Assessment/
├── client/                          # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/              # UI Components
│   │   │   ├── AudioVisualizer.tsx  # Dynamic real-time waveform canvas
│   │   │   ├── CallControls.tsx     # Hands-free status orb & End Call button
│   │   │   ├── CallScreen.tsx       # Active call screen orchestrator
│   │   │   ├── Conversation.tsx     # Message bubbles & typing indicators
│   │   │   ├── HealthReport.tsx     # Clinical report with severity bars
│   │   │   └── StatusIndicator.tsx  # Live conversational status badge
│   │   ├── hooks/
│   │   │   ├── useVoiceCall.ts      # Central voice conversation state machine
│   │   │   └── useWebSocket.ts      # WebSocket connection & event listener
│   │   ├── services/
│   │   │   ├── audioRecorder.ts     # 16kHz PCM audio recorder & WAV encoder
│   │   │   └── vad.ts               # Web Audio RMS VAD & silence detector
│   │   ├── types/                   # TypeScript interfaces (CallState, Report, etc.)
│   │   ├── App.tsx                  # Root state router (Idle -> Call -> Report)
│   │   ├── index.css                # Global design system & theme tokens
│   │   └── main.tsx                 # React application entry
│   └── package.json
├── server/                          # Node.js + Express Backend
│   ├── src/
│   │   ├── config/                  # Environment & API key validation
│   │   ├── conversation/            # Prompts, session state, conversation orchestrator
│   │   │   ├── conversationManager.ts
│   │   │   ├── prompts.ts
│   │   │   └── state.ts
│   │   ├── services/                # Sarvam AI integrations & report extractor
│   │   │   ├── reportGenerator.ts
│   │   │   ├── sarvamLlm.ts
│   │   │   ├── sarvamStt.ts
│   │   │   └── sarvamTts.ts
│   │   ├── types/                   # Backend TypeScript interfaces
│   │   ├── websocket/               # WebSocket event handlers
│   │   │   └── voiceSocket.ts
│   │   └── index.ts                 # Express + WebSocket server entry
│   └── package.json
├── .env.example                     # Environment variables template
├── PLAN.md                          # Initial project specification
└── README.md                        # Project documentation
```

---

## 🔒 Security & Medical Disclaimer

- **API Key Protection**: The Sarvam AI API subscription key is stored securely in backend environment variables and is never exposed to the client browser.
- **Medical Disclaimer**: This application is an automated screening assistant designed for intake demonstration and triage assessments. It does not provide medical diagnoses or treatment prescriptions.

---

## 👨‍💻 Author & Developer

**Developed by Vivek**

Built with modern Web Audio APIs, React 19, TypeScript, Express, and Sarvam AI voice services.

---

## 📄 License

MIT