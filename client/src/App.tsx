import { useVoiceCall } from "./hooks/useVoiceCall";
import { CallScreen } from "./components/CallScreen";
import { HealthReport } from "./components/HealthReport";
import "./App.css";

function App() {
  const {
    callState,
    messages,
    report,
    error,
    isAiSpeaking,
    startCall,
    startRecording,
    stopRecording,
    endCall,
    newCall,
  } = useVoiceCall();

  // ─── Idle Screen ─────────────────────────────────────────────────────────

  if (callState === "idle") {
    return (
      <div className="app">
        <div className="idle-screen">
          <div className="idle-bg-glow" />

          <div className="idle-content">
            <div className="idle-logo">
              <div className="idle-logo-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
            </div>

            <h1 className="idle-title">
              Health Voice
              <span className="idle-title-accent"> AI</span>
            </h1>

            <p className="idle-description">
              Have a voice conversation with our AI health screening assistant.
              Answer a few questions about your health, and receive a structured
              screening report at the end.
            </p>

            <div className="idle-features">
              <div className="feature">
                <span className="feature-icon">🎙️</span>
                <span>Voice-powered</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🤖</span>
                <span>AI-driven screening</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📋</span>
                <span>Structured report</span>
              </div>
            </div>

            <button className="btn-start-call" onClick={() => startCall()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2z" />
              </svg>
              Start Call
            </button>

            <p className="idle-hint">
              Push-to-talk — hold the microphone button to speak
            </p>
          </div>

          <footer className="idle-footer">
            <p>
              ⚕️ This is a health screening tool, not a medical diagnosis.
            </p>
          </footer>
        </div>
      </div>
    );
  }

  // ─── Report Screen ───────────────────────────────────────────────────────

  if (callState === "report" && report) {
    return (
      <div className="app">
        <HealthReport report={report} onNewCall={newCall} />
      </div>
    );
  }

  // ─── Active Call Screen ──────────────────────────────────────────────────

  return (
    <div className="app">
      <CallScreen
        callState={callState}
        messages={messages}
        isAiSpeaking={isAiSpeaking}
        error={error}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onEndCall={endCall}
      />
    </div>
  );
}

export default App;
