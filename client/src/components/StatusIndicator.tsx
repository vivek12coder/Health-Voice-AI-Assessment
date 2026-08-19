import type { CallState } from "../types";
import "./StatusIndicator.css";

interface StatusIndicatorProps {
  callState: CallState;
  isAiSpeaking: boolean;
  isUserSpeaking?: boolean;
  error: string | null;
  promptNotice?: string | null;
}

export function StatusIndicator({
  callState,
  isAiSpeaking,
  isUserSpeaking = false,
  error,
  promptNotice,
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

  if (promptNotice && callState === "listening" && !isUserSpeaking) {
    return (
      <div className="status-indicator status-prompt">
        <span className="prompt-icon">💡</span>
        <span>{promptNotice}</span>
      </div>
    );
  }

  if (isAiSpeaking || callState === "ai-speaking") {
    return (
      <div className="status-indicator status-speaking">
        <div className="speaking-bars">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <span>AI is speaking...</span>
      </div>
    );
  }

  if (isUserSpeaking) {
    return (
      <div className="status-indicator status-user-speaking">
        <div className="user-speaking-wave">
          <span></span><span></span><span></span>
        </div>
        <span>Speaking... (pause when done)</span>
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
          <span>Connecting to assistant...</span>
        </div>
      );

    case "listening":
      return (
        <div className="status-indicator status-listening">
          <div className="listening-dot" />
          <span>Listening — speak naturally</span>
        </div>
      );

    case "processing":
      return (
        <div className="status-indicator status-processing">
          <div className="processing-spinner" />
          <span>Processing your response...</span>
        </div>
      );

    default:
      return null;
  }
}
