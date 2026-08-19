# Health Voice AI Assessment — Implementation Plan

## 1. Assessment Goal

Build a web application where a user can have a live voice conversation with an AI health-screening agent.

The application should:

- Start and end a voice call.
- Let the AI greet the user and conduct a basic health-screening conversation.
- Ask questions one at a time and adapt follow-up questions based on the user's answers.
- Support Hindi or English at minimum.
- Use a real-time-oriented transport such as WebSockets.
- Use a speech-to-text (STT) → LLM → text-to-speech (TTS) pipeline.
- Maintain conversation state so the AI does not repeat questions or lose context.
- Generate a structured health report when the call ends.
- Handle short/incomplete calls gracefully.
- Handle common failures such as silence, unclear audio, or API failures.

The assessment explicitly states that a turn-based / push-to-talk style implementation is acceptable; perfect full-duplex low-latency voice is not required.

## 2. Agreed Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Browser microphone/audio APIs

### Backend

- Node.js
- TypeScript
- Express or a lightweight Node HTTP server
- WebSocket support

### AI Provider

Use Sarvam as the primary AI provider to keep the integration simple and to support Indian-language voice use cases.

Expected services:

- Sarvam Speech-to-Text
- Sarvam Chat / LLM
- Sarvam Text-to-Speech

Only the backend should hold the Sarvam API key = "sk_jj12gw9k_9vebtclLlPhIBlMbH4T0gKRo". 

### Transport

- WebSocket between React and Node.js for call/session events and audio-related messaging.
- HTTP endpoints can be used for simple health checks or report retrieval where useful.

## 3. High-Level Architecture

```text
                    ┌──────────────────────┐
                    │      React App       │
                    │                      │
                    │  Start Call          │
                    │  Record / PTT        │
                    │  End Call            │
                    │  Conversation UI     │
                    │  Health Report       │
                    └──────────┬───────────┘
                               │
                         WebSocket / HTTP
                               │
                    ┌──────────▼───────────┐
                    │   Node.js + TS       │
                    │                      │
                    │ Conversation Manager │
                    │ Session State        │
                    │ Error Handling       │
                    └───────┬───┬───┬──────┘
                            │   │   │
                 ┌──────────┘   │   └──────────┐
                 ▼              ▼              ▼
            Sarvam STT     Sarvam Chat     Sarvam TTS
                 │              │              │
                 └──────────────┼──────────────┘
                                │
                         AI Response Audio
                                │
                                ▼
                            Browser
```

## 4. Core Conversation Flow

### Start Call

1. User clicks `Start Call`.
2. Frontend creates/opens a WebSocket session.
3. Backend creates a conversation state object.
4. AI generates a greeting.
5. Greeting is converted to audio with TTS.
6. Browser plays the AI greeting.

### User Turn

1. User presses/holds the microphone or starts a recording turn.
2. Browser captures microphone audio.
3. Audio is sent to the Node.js backend.
4. Backend sends the audio to STT.
5. STT returns a transcript.
6. Conversation Manager updates the state.
7. LLM receives the conversation context/state.
8. LLM chooses an appropriate next question or follow-up.
9. TTS converts the AI response to audio.
10. Backend sends the response audio to the browser.
11. Browser plays the response.
12. Repeat until the user ends the call.

### End Call

1. User clicks `End Call`.
2. Backend marks the session as completed.
3. Conversation history and collected information are passed to the report generator.
4. A structured health report is produced.
5. Frontend displays the report.

## 5. Conversation State

Do not rely only on the raw LLM conversation history. Keep an explicit structured state.

Example:

```ts
type ConversationState = {
  sessionId: string;

  patientName?: string;
  mainConcern?: string;
  duration?: string;
  severity?: string;
  relatedSymptoms?: string[];

  currentQuestion?: string;
  questionsAsked: string[];

  messages: Message[];

  status: "active" | "completed";
};
```

The state should allow the agent to remember:

- What has already been asked.
- What the user has already answered.
- Which health-screening fields have been collected.
- What information is still missing.
- What follow-up question is appropriate next.

## 6. Suggested Screening Topics

The basic screening conversation should cover, where possible:

1. Name
2. Main health concern / primary symptom
3. Duration
4. Severity
5. Other related symptoms
6. A sensible follow-up question when an answer is vague or incomplete

The agent should not force every question if the conversation naturally provides enough context or if the user ends the call early.

## 7. LLM Behavior

The LLM should behave like a basic intake/screening conversational agent, not as a doctor providing a diagnosis.

The system prompt should instruct it to:

- Ask one question at a time.
- Use information already collected.
- Avoid repeating answered questions.
- Ask concise follow-ups when answers are vague.
- Keep the conversation focused on basic intake information.
- Never invent information about the user.
- Handle incomplete answers naturally.
- Clearly separate collected information from unknown information.
- Avoid presenting the screening as a confirmed medical diagnosis.

## 8. Structured Report

When the call ends, generate a structured object rather than displaying a raw transcript.

Example:

```json
{
  "patientName": "Rahul",
  "mainConcern": "Headache",
  "symptoms": [
    "Headache",
    "Mild dizziness"
  ],
  "duration": "3 days",
  "severity": "6/10",
  "followUp": "Consider medical evaluation if symptoms persist or worsen"
}
```

The frontend should render the report as a clean summary containing:

- Patient name
- Main concern
- Key symptoms
- Duration
- Severity
- Follow-up / flagged information
- Completion status when information is incomplete

## 9. Incomplete Call Handling

The report must remain useful even if the user ends the call after only one exchange.

Example:

```text
Information Collected

Name: Rahul
Main concern: Not provided
Duration: Not provided
Severity: Not provided

Status: Screening incomplete
```

Do not fabricate missing information.

## 10. Failure Handling

### Empty or useless STT result

If STT returns no useful transcript:

```text
Sorry, I couldn't hear that clearly. Could you please repeat?
```

The call should continue instead of crashing.

### API failure

If STT, LLM, or TTS fails:

- Catch the error.
- Log useful server-side information.
- Show a friendly user-facing message.
- Retry where safe.
- Keep the session alive where possible.

### Silence

If the user provides no speech:

- Ask the user to speak/repeat.
- Avoid adding empty turns to the conversation history.

### Invalid structured response

If the LLM returns malformed report data:

- Validate the response.
- Fall back to known conversation state.
- Mark unavailable fields as `Not provided`.

## 11. Project Structure

```text
health-voice-agent/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CallScreen.tsx
│   │   │   ├── CallControls.tsx
│   │   │   ├── Conversation.tsx
│   │   │   ├── AudioVisualizer.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   └── HealthReport.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useVoiceCall.ts
│   │   │   └── useWebSocket.ts
│   │   │
│   │   ├── services/
│   │   │   └── api.ts
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── call.ts
│   │   │   └── report.ts
│   │   │
│   │   ├── websocket/
│   │   │   └── voiceSocket.ts
│   │   │
│   │   ├── services/
│   │   │   ├── sarvamStt.ts
│   │   │   ├── sarvamLlm.ts
│   │   │   ├── sarvamTts.ts
│   │   │   └── reportGenerator.ts
│   │   │
│   │   ├── conversation/
│   │   │   ├── conversationManager.ts
│   │   │   ├── prompts.ts
│   │   │   └── state.ts
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   └── package.json
│
├── .env.example
├── .gitignore
├── README.md
├── package.json
└── tsconfig.json
```

## 12. Environment Variables

Keep secrets only on the backend.

```env
SARVAM_API_KEY=your_api_key_here
PORT=5000
CLIENT_URL=http://localhost:5173
```

Never commit real API keys to GitHub.

The repository should contain `.env.example`, while the real `.env` file must be ignored by Git.

## 13. Implementation Phases

### Phase 1 — Project Setup

- Create React + TypeScript client.
- Create Node.js + TypeScript server.
- Configure scripts and TypeScript.
- Add environment variable handling.
- Add basic health-check endpoint.

### Phase 2 — Sarvam Integration

- Add Sarvam dependency or API client.
- Verify authentication.
- Implement small isolated tests for STT.
- Implement small isolated tests for LLM/chat.
- Implement small isolated tests for TTS.

### Phase 3 — Text Conversation First

Before adding audio, make sure the conversation logic works with text.

Build:

```text
User text
  ↓
Conversation Manager
  ↓
LLM
  ↓
AI text response
```

Validate that the AI:

- Remembers answers.
- Does not repeat questions.
- Asks reasonable follow-ups.
- Stops naturally when enough information is collected.

### Phase 4 — Speech-to-Text

- Capture microphone audio in React.
- Send audio to backend.
- Integrate Sarvam STT.
- Return transcript to the conversation manager.

### Phase 5 — Text-to-Speech

- Send AI response to Sarvam TTS.
- Receive generated audio.
- Return/play audio in browser.

### Phase 6 — End-to-End Voice Call

Connect the complete pipeline:

```text
Microphone
   ↓
STT
   ↓
Conversation Manager
   ↓
LLM
   ↓
TTS
   ↓
Speaker
```

### Phase 7 — Conversation State Hardening

- Prevent repeated questions.
- Track collected fields.
- Handle vague answers.
- Handle user interruptions between turns.
- Handle early termination.

### Phase 8 — Health Report

- Build structured report schema.
- Generate report from the conversation.
- Validate the response.
- Render report UI.

### Phase 9 — Failure Handling

Test:

- Silence.
- Empty STT.
- Bad/unclear STT.
- Failed LLM call.
- Failed TTS call.
- User ending call immediately.
- User ending after one answer.
- Long/verbose answers.

### Phase 10 — Assessment Polish

- Improve UI.
- Add clear call states.
- Add loading/processing indicators.
- Make errors understandable.
- Add README screenshots/demo notes.
- Clean unused code.
- Verify environment setup from a fresh clone.

## 14. UI Requirements

Minimum screens/states:

### Idle

- Application title.
- Short explanation.
- `Start Call` button.

### Active Call

- Call status.
- AI speaking indicator.
- Listening/recording indicator.
- Microphone control.
- `End Call` button.
- Conversation transcript/status area.

### Processing

- Show that the response/report is being generated.

### Report

- Structured health report.
- Clear completion status.
- Option to start a new call.

## 15. WebSocket Message Design

Use a small, explicit event protocol.

Example client/server events:

```text
start_call
call_started
aio_message
start_recording
stop_recording
transcript
processing
ai_response
ai_audio
error
end_call
report_ready
```

Exact naming can be adjusted during implementation, but message types should stay explicit and easy to debug.

## 16. Security Basics

- Never expose `SARVAM_API_KEY` to the frontend.
- Never commit `.env`.
- Validate WebSocket messages.
- Limit accepted audio/file sizes where applicable.
- Do not log sensitive API keys.
- Avoid unnecessary storage of health information.
- Clear in-memory session state when a call is complete, unless persistence is specifically needed.

## 17. Testing Checklist

### Functional

- [ ] Start Call works.
- [ ] AI greeting plays.
- [ ] User speech is transcribed.
- [ ] AI responds with relevant follow-up.
- [ ] TTS audio plays.
- [ ] Conversation continues for multiple turns.
- [ ] End Call works.
- [ ] Report appears after call.

### Conversation

- [ ] AI remembers the user's name.
- [ ] AI remembers the main symptom.
- [ ] AI remembers duration.
- [ ] AI remembers severity.
- [ ] AI does not repeat answered questions.
- [ ] AI handles vague answers.

### Failure Handling

- [ ] Empty speech does not crash the app.
- [ ] STT failure is handled.
- [ ] LLM failure is handled.
- [ ] TTS failure is handled.
- [ ] User can end a call early.
- [ ] Incomplete report does not contain fabricated information.

### Submission

- [ ] GitHub repository is public.
- [ ] README contains setup instructions.
- [ ] README lists required environment variables.
- [ ] README explains the chosen AI services.
- [ ] `.env` is not committed.
- [ ] Fresh-clone setup has been tested.
- [ ] Project runs successfully.

## 18. Nice-to-Have Features

Only add these after all must-have requirements work:

- Automatic language detection.
- Mid-call language switching.
- Barge-in while AI is speaking.
- Better silence detection.
- Background-noise handling.
- Streaming audio improvements.
- Better visual audio feedback.

Do not sacrifice the core call functionality for optional features.

## 19. Definition of Done

The project is ready for submission when a reviewer can clone the public repository, configure the documented environment variable, start the app, click `Start Call`, have a genuine voice conversation with the AI, click `End Call`, and receive a useful structured health report.

The core priority is reliability and clarity rather than production-level polish.

## 20. Assessment Strategy

Prioritize work in this order:

1. Working voice call.
2. Correct STT → LLM → TTS pipeline.
3. Conversation state and adaptive follow-ups.
4. Failure handling.
5. Structured report quality.
6. UI polish.
7. Optional features.

This matches the assessment's stated evaluation priorities: a working call, pipeline architecture, conversation state, failure handling, and report quality.

## 21. Source Requirements from the Assessment

The assessment states:

- JavaScript/TypeScript throughout, with React for frontend and Node.js for backend.
- AI tools are allowed.
- A real-time-oriented transport is required; recording the entire call and uploading it only at the end is not the intended solution.
- A turn-based / push-to-talk flow is explicitly acceptable.
- The AI must maintain conversation state and adapt to the user's answers.
- The app must produce a structured health report after the call.
- Short/incomplete calls must be handled gracefully.
- The submission must include a public GitHub repository and README setup instructions.
- The submission deadline is 48 hours from receiving the assessment.
