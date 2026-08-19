import type { Message } from "../types/index.js";
/**
 * Send a chat completion request to Sarvam LLM.
 * Uses the OpenAI-compatible endpoint with sarvam-m4 model.
 */
export declare function chatCompletion(messages: Message[], temperature?: number, retries?: number): Promise<string>;
