// ─── In-Memory Session Store ─────────────────────────────────────────────────
const sessions = new Map();
/**
 * Create a new conversation session.
 */
export function createSession(sessionId, language = "en-IN") {
    const state = {
        sessionId,
        questionsAsked: [],
        messages: [],
        status: "active",
        language: language,
        createdAt: Date.now(),
    };
    sessions.set(sessionId, state);
    console.log(`[State] Session created: ${sessionId}`);
    return state;
}
/**
 * Get an existing session.
 */
export function getSession(sessionId) {
    return sessions.get(sessionId);
}
/**
 * Update session with partial data.
 */
export function updateSession(sessionId, update) {
    const session = sessions.get(sessionId);
    if (!session)
        return undefined;
    const updated = { ...session, ...update };
    sessions.set(sessionId, updated);
    return updated;
}
/**
 * Add a message to the session's conversation history.
 */
export function addMessage(sessionId, role, content) {
    const session = sessions.get(sessionId);
    if (!session)
        return;
    session.messages.push({
        role,
        content,
        timestamp: Date.now(),
    });
}
/**
 * Delete a session (cleanup after report generation).
 */
export function deleteSession(sessionId) {
    sessions.delete(sessionId);
    console.log(`[State] Session deleted: ${sessionId}`);
}
/**
 * Get all active session IDs (for debugging).
 */
export function getActiveSessions() {
    return Array.from(sessions.keys());
}
