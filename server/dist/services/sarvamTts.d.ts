/**
 * Convert text to speech using Sarvam TTS (bulbul:v3).
 * Returns base64-encoded audio string.
 */
export declare function textToSpeech(text: string, languageCode?: string, speaker?: string): Promise<string>;
