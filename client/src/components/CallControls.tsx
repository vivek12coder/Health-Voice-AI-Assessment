import type { CallState } from "../types";
import "./CallControls.css";

interface CallControlsProps {
  callState: CallState;
  isAiSpeaking: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onEndCall: () => void;
}

export function CallControls({
  callState,
  isAiSpeaking,
  onStartRecording,
  onStopRecording,
  onEndCall,
}: CallControlsProps) {
  const isRecording = callState === "recording";
  const isProcessing = callState === "processing";
  const canRecord = callState === "active" && !isAiSpeaking;

  return (
    <div className="call-controls">
      <button
        className="btn-end-call"
        onClick={onEndCall}
        disabled={isProcessing}
        title="End Call"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
          <line x1="23" y1="1" x2="1" y2="23" />
        </svg>
        <span>End</span>
      </button>

      <button
        className={`btn-mic ${isRecording ? "recording" : ""} ${isProcessing ? "processing" : ""}`}
        onMouseDown={canRecord ? onStartRecording : undefined}
        onMouseUp={isRecording ? onStopRecording : undefined}
        onMouseLeave={isRecording ? onStopRecording : undefined}
        onTouchStart={canRecord ? onStartRecording : undefined}
        onTouchEnd={isRecording ? onStopRecording : undefined}
        disabled={isProcessing || isAiSpeaking}
        title={isRecording ? "Release to send" : isProcessing ? "Processing..." : isAiSpeaking ? "AI is speaking..." : "Hold to speak"}
      >
        {isProcessing ? (
          <div className="mic-spinner" />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
        {isRecording && (
          <div className="mic-pulse-ring" />
        )}
      </button>

      <div className="mic-hint">
        {isRecording
          ? "Release to send"
          : isProcessing
            ? "Processing..."
            : isAiSpeaking
              ? "AI is speaking..."
              : "Hold to speak"}
      </div>
    </div>
  );
}
