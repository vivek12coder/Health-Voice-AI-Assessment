import type { ConversationState, Message } from "../types/index.js";

// ─── In-Memory Session Store ─────────────────────────────────────────────────

const sessions = new Map<string, ConversationState>();

/**
 * Create a new conversation session.
 */
export function createSession(
  sessionId: string,
  language: string = "en-IN"
): ConversationState {
  const state: ConversationState = {
    sessionId,
    questionsAsked: [],
    messages: [],
    status: "active",
    language: language as "en-IN" | "hi-IN",
    createdAt: Date.now(),
  };
  sessions.set(sessionId, state);
  console.log(`[State] Session created: ${sessionId}`);
  return state;
}

/**
 * Get an existing session.
 */
export function getSession(sessionId: string): ConversationState | undefined {
  return sessions.get(sessionId);
}

/**
 * Update session with partial data.
 */
export function updateSession(
  sessionId: string,
  update: Partial<ConversationState>
): ConversationState | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const updated = { ...session, ...update };
  sessions.set(sessionId, updated);
  return updated;
}

/**
 * Add a message to the session's conversation history.
 */
export function addMessage(
  sessionId: string,
  role: Message["role"],
  content: string
): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
}

/**
 * Delete a session (cleanup after report generation).
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
  console.log(`[State] Session deleted: ${sessionId}`);
}

/**
 * Get all active session IDs (for debugging).
 */
export function getActiveSessions(): string[] {
  return Array.from(sessions.keys());
}
