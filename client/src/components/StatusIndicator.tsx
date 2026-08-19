import type { CallState } from "../types";
import "./StatusIndicator.css";

interface StatusIndicatorProps {
  callState: CallState;
  isAiSpeaking: boolean;
  error: string | null;
}

export function StatusIndicator({
  callState,
  isAiSpeaking,
  error,
}: StatusIndicatorProps) {
  if (error) {
    return (
      <div className="status-indicator status-error">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  if (isAiSpeaking) {
    return (
      <div className="status-indicator status-speaking">
        <div className="speaking-bars">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <span>AI is speaking...</span>
      </div>
    );
  }

  switch (callState) {
    case "connecting":
      return (
        <div className="status-indicator status-connecting">
          <div className="connecting-dots">
            <span></span><span></span><span></span>
          </div>
          <span>Connecting...</span>
        </div>
      );

    case "recording":
      return (
        <div className="status-indicator status-recording">
          <div className="rec-dot" />
          <span>Listening...</span>
        </div>
      );

    case "processing":
      return (
        <div className="status-indicator status-processing">
          <div className="processing-spinner" />
          <span>Processing...</span>
        </div>
      );

    case "active":
      return (
        <div className="status-indicator status-active">
          <div className="active-dot" />
          <span>Call active — Hold mic to speak</span>
        </div>
      );

    default:
      return null;
  }
}
