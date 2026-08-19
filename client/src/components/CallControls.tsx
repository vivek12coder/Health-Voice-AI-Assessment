import type { CallState } from "../types";
import "./CallControls.css";

interface CallControlsProps {
  callState: CallState;
  isAiSpeaking: boolean;
  isUserSpeaking?: boolean;
  onEndCall: () => void;
  onManualSubmit?: () => void;
}

export function CallControls({
  callState,
  isAiSpeaking,
  isUserSpeaking = false,
  onEndCall,
  onManualSubmit,
}: CallControlsProps) {
  const isListening = callState === "listening";
  const isProcessing = callState === "processing";
  const isConnecting = callState === "connecting";

  return (
    <div className="call-controls">
      {/* Central Visual Live Status Orb */}
      <div
        className={`call-orb ${
          isUserSpeaking
            ? "orb-user-speaking"
            : isAiSpeaking
            ? "orb-ai-speaking"
            : isListening
            ? "orb-listening"
            : isProcessing
            ? "orb-processing"
            : ""
        }`}
        onClick={isUserSpeaking && onManualSubmit ? onManualSubmit : undefined}
        title={
          isUserSpeaking
            ? "Speaking detected (Click to send immediately)"
            : isListening
            ? "Listening..."
            : isAiSpeaking
            ? "AI is speaking..."
            : "Processing..."
        }
      >
        {isProcessing ? (
          <div className="orb-spinner" />
        ) : isAiSpeaking ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        ) : isUserSpeaking ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}

        {/* Dynamic Glow Rings */}
        {isUserSpeaking && <div className="orb-pulse-ring-speaking" />}
        {isListening && !isUserSpeaking && <div className="orb-pulse-ring-listening" />}
        {isAiSpeaking && <div className="orb-pulse-ring-ai" />}
      </div>

      {/* Primary End Call Action */}
      <div className="call-actions">
        <button
          className="btn-end-call"
          onClick={onEndCall}
          disabled={isConnecting}
          title="End Call and Generate Health Report"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
          <span>End Call</span>
        </button>

        {isUserSpeaking && onManualSubmit && (
          <button
            className="btn-done-speaking"
            onClick={onManualSubmit}
            title="Finish speaking immediately"
          >
            <span>Done Speaking ✓</span>
          </button>
        )}
      </div>

      {/* Helper Guidance */}
      <div className="controls-hint">
        {isAiSpeaking
          ? "AI is speaking... listening will resume automatically"
          : isUserSpeaking
          ? "Speaking detected — pause naturally when you're done"
          : isProcessing
          ? "Processing your response with Sarvam AI..."
          : "Automatic mode active — speak naturally whenever you're ready"}
      </div>
    </div>
  );
}
