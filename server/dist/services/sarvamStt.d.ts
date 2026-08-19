export interface SttResult {
    transcript: string;
    languageCode?: string;
}
/**
 * Transcribe audio using Sarvam STT (saaras:v3).
 * Accepts a Buffer of audio data (WebM/Opus, WAV, MP3, etc.)
 * Returns transcript or null if speech was empty/unclear.
 */
export declare function transcribeAudio(audioBuffer: Buffer, language?: string): Promise<SttResult | null>;
