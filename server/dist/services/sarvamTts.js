import { config } from "../config/env.js";
const TTS_URL = "https://api.sarvam.ai/text-to-speech";
const MODEL = "bulbul:v3";
const MAX_TEXT_LENGTH = 2500;
/**
 * Convert text to speech using Sarvam TTS (bulbul:v3).
 * Returns base64-encoded audio string.
 */
export async function textToSpeech(text, languageCode = "en-IN", speaker = "shubh") {
    try {
        // If text is too long, truncate with ellipsis
        const processedText = text.length > MAX_TEXT_LENGTH
            ? text.slice(0, MAX_TEXT_LENGTH - 3) + "..."
            : text;
        const response = await fetch(TTS_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-subscription-key": config.sarvamApiKey,
            },
            body: JSON.stringify({
                text: processedText,
                language_code: languageCode,
                speaker,
                model: MODEL,
                speech_sample_rate: 22050,
                pace: 1.0,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[TTS] API error ${response.status}: ${errorText}`);
            throw new Error(`TTS API error: ${response.status}`);
        }
        const data = (await response.json());
        const audioBase64 = data.audios?.[0];
        if (!audioBase64) {
            throw new Error("TTS returned no audio data");
        }
        console.log(`[TTS] Generated audio (${Math.round(audioBase64.length / 1024)}KB base64)`);
        return audioBase64;
    }
    catch (error) {
        console.error("[TTS] Text-to-speech failed:", error);
        throw error;
    }
}
