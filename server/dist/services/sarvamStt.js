import { config } from "../config/env.js";
import FormData from "form-data";
const STT_URL = "https://api.sarvam.ai/speech-to-text";
/**
 * Transcribe audio using Sarvam STT (saaras:v3).
 * Accepts a Buffer of audio data (WebM/Opus, WAV, MP3, etc.)
 * Returns transcript or null if speech was empty/unclear.
 */
export async function transcribeAudio(audioBuffer, language) {
    try {
        const isWav = audioBuffer.length >= 12 &&
            audioBuffer.toString("utf8", 0, 4) === "RIFF" &&
            audioBuffer.toString("utf8", 8, 12) === "WAVE";
        const filename = isWav ? "audio.wav" : "audio.webm";
        const contentType = isWav ? "audio/wav" : "audio/webm";
        console.log(`[STT] Sending ${audioBuffer.length} bytes as ${contentType} (${filename})`);
        const form = new FormData();
        form.append("file", audioBuffer, {
            filename,
            contentType,
        });
        form.append("model", "saaras:v3");
        form.append("mode", "transcribe");
        if (language) {
            form.append("language_code", language);
        }
        const response = await fetch(STT_URL, {
            method: "POST",
            headers: {
                "api-subscription-key": config.sarvamApiKey,
                ...form.getHeaders(),
            },
            body: form.getBuffer(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[STT] API error ${response.status}: ${errorText}`);
            throw new Error(`STT API error: ${response.status}`);
        }
        const data = await response.json();
        const transcript = (data.transcript || "").trim();
        // Handle empty or useless transcription
        if (!transcript || transcript.length < 2) {
            console.log("[STT] Empty or too short transcript, returning null");
            return null;
        }
        console.log(`[STT] Transcript: "${transcript}"`);
        return {
            transcript,
            languageCode: data.language_code,
        };
    }
    catch (error) {
        console.error("[STT] Transcription failed:", error);
        throw error;
    }
}
