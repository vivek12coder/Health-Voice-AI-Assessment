import { Conversation } from "./Conversation";
import { CallControls } from "./CallControls";
import { AudioVisualizer } from "./AudioVisualizer";
import { StatusIndicator } from "./StatusIndicator";
import type { CallState, ChatMessage } from "../types";
import "./CallScreen.css";

interface CallScreenProps {
  callState: CallState;
  messages: ChatMessage[];
  isAiSpeaking: boolean;
  isUserSpeaking?: boolean;
  audioLevel?: number;
  promptNotice?: string | null;
  error: string | null;
  onEndCall: () => void;
  onManualSubmit?: () => void;
}

export function CallScreen({
  callState,
  messages,
  isAiSpeaking,
  isUserSpeaking = false,
  audioLevel = 0,
  promptNotice,
  error,
  onEndCall,
  onManualSubmit,
}: CallScreenProps) {
  const isProcessing = callState === "processing" || callState === "connecting";
  const isListening = callState === "listening";

  return (
    <div className="call-screen">
      <div className="call-header">
        <div className="call-header-left">
          <div className="call-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4" />
              <path d="M3 9h18M3 15h18" />
            </svg>
          </div>
          <div>
            <h2 className="call-title">
              Health Screening <span className="call-title-dev">• by Vivek</span>
            </h2>
            <StatusIndicator
              callState={callState}
              isAiSpeaking={isAiSpeaking}
              isUserSpeaking={isUserSpeaking}
              error={error}
              promptNotice={promptNotice}
            />
          </div>
        </div>
      </div>

      <Conversation messages={messages} isProcessing={isProcessing} />

      <AudioVisualizer
        isListening={isListening}
        isUserSpeaking={isUserSpeaking}
        isAiSpeaking={isAiSpeaking}
        audioLevel={audioLevel}
      />

      <CallControls
        callState={callState}
        isAiSpeaking={isAiSpeaking}
        isUserSpeaking={isUserSpeaking}
        onEndCall={onEndCall}
        onManualSubmit={onManualSubmit}
      />
    </div>
  );
}
