import type { ConversationState, Message } from "../types/index.js";
/**
 * Create a new conversation session.
 */
export declare function createSession(sessionId: string, language?: string): ConversationState;
/**
 * Get an existing session.
 */
export declare function getSession(sessionId: string): ConversationState | undefined;
/**
 * Update session with partial data.
 */
export declare function updateSession(sessionId: string, update: Partial<ConversationState>): ConversationState | undefined;
/**
 * Add a message to the session's conversation history.
 */
export declare function addMessage(sessionId: string, role: Message["role"], content: string): void;
/**
 * Delete a session (cleanup after report generation).
 */
export declare function deleteSession(sessionId: string): void;
/**
 * Get all active session IDs (for debugging).
 */
export declare function getActiveSessions(): string[];
