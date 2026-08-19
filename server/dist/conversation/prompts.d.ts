import type { ConversationState } from "../types/index.js";
/**
 * Build the system prompt for the health screening conversation.
 * Dynamically injects already-collected fields to prevent repetition.
 */
export declare function buildScreeningPrompt(state: ConversationState): string;
/**
 * Build the greeting message prompt.
 */
export declare function buildGreetingPrompt(language: string): string;
/**
 * Build the report extraction prompt.
 */
export declare function buildReportPrompt(): string;
