import { config } from "../config/env.js";
const CHAT_URL = "https://api.sarvam.ai/v1/chat/completions";
const MODEL = "sarvam-105b-conversations";
/**
 * Send a chat completion request to Sarvam LLM.
 * Uses the OpenAI-compatible endpoint with sarvam-m4 model.
 */
export async function chatCompletion(messages, temperature = 0.7, retries = 1) {
    const llmMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-subscription-key": config.sarvamApiKey,
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: llmMessages,
                    temperature,
                    max_tokens: 500,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[LLM] API error ${response.status}: ${errorText}`);
                if (attempt < retries) {
                    console.log(`[LLM] Retrying... (attempt ${attempt + 2})`);
                    await new Promise((r) => setTimeout(r, 1000));
                    continue;
                }
                throw new Error(`LLM API error: ${response.status}`);
            }
            const data = (await response.json());
            const content = data.choices?.[0]?.message?.content?.trim();
            if (!content) {
                throw new Error("LLM returned empty response");
            }
            console.log(`[LLM] Response: "${content.slice(0, 100)}..."`);
            return content;
        }
        catch (error) {
            if (attempt < retries) {
                console.log(`[LLM] Error, retrying... (attempt ${attempt + 2})`);
                await new Promise((r) => setTimeout(r, 1000));
                continue;
            }
            console.error("[LLM] Chat completion failed:", error);
            throw error;
        }
    }
    throw new Error("LLM request failed after all retries");
}
