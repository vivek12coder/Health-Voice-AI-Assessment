import type { HealthReport } from "../types/index.js";
/**
 * Generate a structured health report from the conversation.
 * Uses LLM extraction with fallback to heuristic state.
 */
export declare function generateReport(sessionId: string): Promise<HealthReport>;
