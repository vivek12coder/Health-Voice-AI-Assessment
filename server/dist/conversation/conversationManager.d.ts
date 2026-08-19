/**
 * Process a user's transcript turn and generate an AI response.
 * This is the core conversation orchestrator.
 */
export declare function processUserTurn(sessionId: string, userTranscript: string): Promise<string>;
