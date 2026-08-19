# Health Voice AI Assessment

A web application for AI-powered voice health screening conversations. Users have a real-time voice conversation with an AI health screening assistant that asks questions one at a time, adapts follow-ups based on answers, and generates a structured health report at the end.

## Features

- 🎙️ **Push-to-talk voice interface** — Hold the mic button to speak, release to send
- 🤖 **AI-powered screening** — Adaptive questioning using Sarvam AI's LLM
- 🔊 **Voice responses** — AI speaks back using text-to-speech
- 📋 **Structured health report** — Generated automatically when the call ends
- 🌐 **Hindi & English support** — Works with Indian language speech
- ⚡ **Real-time WebSocket transport** — Low-latency communication between client and server
- 🛡️ **Robust error handling** — Graceful handling of silence, API failures, and incomplete calls

## Architecture

```
Browser (React + TypeScript)
    │
    ├── Push-to-talk microphone capture
    ├── WebSocket connection
    └── Audio playback
    │
    ▼ WebSocket
    │
Node.js Server (Express + WS)
    │
    ├── Speech-to-Text  → Sarvam STT (saaras:v3)
    ├── Conversation     → Sarvam LLM (sarvam-m4)
    └── Text-to-Speech   → Sarvam TTS (bulbul:v3)
    │
    ▼
Structured Health Report
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, TypeScript, Express |
| Transport | WebSocket (ws) |
| STT | Sarvam AI — saaras:v3 |
| LLM | Sarvam AI — sarvam-m4 |
| TTS | Sarvam AI — bulbul:v3 |

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- A **Sarvam AI API key** with access to STT, LLM, and TTS services

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Health-Voice-AI-Assessment.git
cd Health-Voice-AI-Assessment
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your Sarvam API key:

```env
SARVAM_API_KEY=your_sarvam_api_key_here
PORT=5000
CLIENT_URL=http://localhost:5173
```

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Start the application

```bash
npm run dev
```

This starts both the backend server (port 5000) and the React dev server (port 5173) concurrently.

### 5. Open in browser

Navigate to [http://localhost:5173](http://localhost:5173)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SARVAM_API_KEY` | Sarvam AI API subscription key | *required* |
| `PORT` | Backend server port | `5000` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |

## Usage

1. Click **Start Call** to begin a health screening session
2. The AI assistant will greet you and ask for your name
3. **Hold the microphone button** to speak, **release** to send your response
4. The AI will ask follow-up questions about your health concern
5. Click **End Call** when finished
6. Review your structured health screening report

## AI Services (Sarvam AI)

This application uses [Sarvam AI](https://sarvam.ai) as the primary AI provider, chosen for its strong support for Indian languages:

- **Speech-to-Text (saaras:v3)**: Transcribes audio input, supporting Hindi, English, and other Indian languages
- **Chat/LLM (sarvam-m4)**: Powers the conversational screening logic with OpenAI-compatible chat completions
- **Text-to-Speech (bulbul:v3)**: Generates natural-sounding voice responses

All API calls are made server-side only. The API key is never exposed to the frontend.

## Project Structure

```
Health-Voice-AI-Assessment/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/             # useWebSocket, useVoiceCall
│   │   ├── services/          # HTTP API client
│   │   ├── types/             # TypeScript types
│   │   ├── App.tsx            # Main app with state routing
│   │   └── main.tsx           # Entry point
│   └── package.json
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── config/            # Environment config
│   │   ├── conversation/      # State, prompts, manager
│   │   ├── services/          # Sarvam STT/LLM/TTS, report gen
│   │   ├── websocket/         # Voice WebSocket handler
│   │   ├── types/             # TypeScript types
│   │   └── index.ts           # Express server entry
│   └── package.json
├── .env.example               # Environment template
├── PLAN.md                    # Implementation plan
└── README.md                  # This file
```

## License

MIT