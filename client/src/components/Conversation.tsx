import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import "./Conversation.css";

interface ConversationProps {
  messages: ChatMessage[];
  isProcessing: boolean;
}

export function Conversation({ messages, isProcessing }: ConversationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  if (messages.length === 0 && !isProcessing) {
    return (
      <div className="conversation" ref={containerRef}>
        <div className="conversation-empty">
          <div className="conversation-empty-icon">💬</div>
          <p>Your conversation will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation" ref={containerRef}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message message-${msg.role}`}
        >
          <div className="message-avatar">
            {msg.role === "assistant" ? "🤖" : "👤"}
          </div>
          <div className="message-bubble">
            <p>{msg.content}</p>
            <span className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      ))}
      {isProcessing && (
        <div className="message message-assistant">
          <div className="message-avatar">🤖</div>
          <div className="message-bubble typing">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
