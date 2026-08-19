import { WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import { createSession, getSession, updateSession, addMessage, deleteSession } from "../conversation/state.js";
import { processUserTurn } from "../conversation/conversationManager.js";
import { transcribeAudio } from "../services/sarvamStt.js";
import { textToSpeech } from "../services/sarvamTts.js";
import { chatCompletion } from "../services/sarvamLlm.js";
import { generateReport } from "../services/reportGenerator.js";
import { buildGreetingPrompt } from "../conversation/prompts.js";
import type { WSClientEvent, WSServerEvent } from "../types/index.js";

/**
 * Handle a WebSocket connection for a voice call session.
 */
export function handleVoiceSocket(ws: WebSocket): void {
  let sessionId: string | null = null;

  console.log("[WS] New connection established");

  ws.on("message", async (rawData) => {
    try {
      const event = JSON.parse(rawData.toString()) as WSClientEvent;

      switch (event.type) {
        case "start_call":
          await handleStartCall(ws, event.language);
          break;

        case "audio_data":
          if (!sessionId) {
            sendEvent(ws, { type: "error", message: "No active call session" });
            return;
          }
          await handleAudioData(ws, sessionId, event.data);
          break;

        case "end_call":
          if (!sessionId) {
            sendEvent(ws, { type: "error", message: "No active call session" });
            return;
          }
          await handleEndCall(ws, sessionId);
          sessionId = null;
          break;

        default:
          sendEvent(ws, {
            type: "error",
            message: `Unknown event type`,
          });
      }
    } catch (error) {
      console.error("[WS] Error processing message:", error);
      sendEvent(ws, {
        type: "error",
        message: "An error occurred processing your message",
      });
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Connection closed (session: ${sessionId || "none"})`);
    if (sessionId) {
      const session = getSession(sessionId);
      if (session && session.status === "active") {
        updateSession(sessionId, { status: "completed" });
      }
    }
  });

  ws.on("error", (error) => {
    console.error("[WS] WebSocket error:", error);
  });

  // ─── Event Handlers ───────────────────────────────────────────────────────

  async function handleStartCall(
    ws: WebSocket,
    language?: string
  ): Promise<void> {
    const newSessionId = uuidv4();
    sessionId = newSessionId;

    const lang = language || "en-IN";
    createSession(newSessionId, lang);

    console.log(`[WS] Call started: ${newSessionId} (language: ${lang})`);

    // Send call_started immediately
    sendEvent(ws, { type: "call_started", sessionId: newSessionId });

    try {
      // Generate greeting via LLM
      sendEvent(ws, { type: "processing" });

      const greetingPrompt = buildGreetingPrompt(lang);
      const greeting = await chatCompletion([
        { role: "system", content: greetingPrompt, timestamp: Date.now() },
        { role: "user", content: "Start the health screening call.", timestamp: Date.now() },
      ]);

      // Add greeting to conversation history
      addMessage(newSessionId, "assistant", greeting);

      // Send text response
      sendEvent(ws, { type: "ai_response", text: greeting });

      // Convert greeting to speech
      try {
        const audioBase64 = await textToSpeech(greeting, lang);
        sendEvent(ws, {
          type: "ai_audio",
          data: audioBase64,
          format: "wav",
        });
      } catch (ttsError) {
        console.error("[WS] TTS failed for greeting:", ttsError);
        // Text response already sent, so call can continue without audio
      }
    } catch (error) {
      console.error("[WS] Failed to generate greeting:", error);
      // Send a static fallback greeting
      const fallbackGreeting =
        lang === "hi-IN"
          ? "नमस्ते! मैं आपका स्वास्थ्य जांच सहायक हूं। कृपया अपना नाम बताएं।"
          : "Hello! I'm your health screening assistant. Could you please tell me your name?";

      addMessage(newSessionId, "assistant", fallbackGreeting);
      sendEvent(ws, { type: "ai_response", text: fallbackGreeting });
    }
  }

  async function handleAudioData(
    ws: WebSocket,
    sid: string,
    audioBase64: string
  ): Promise<void> {
    const session = getSession(sid);
    if (!session || session.status !== "active") {
      sendEvent(ws, { type: "error", message: "Session is not active" });
      return;
    }

    sendEvent(ws, { type: "processing" });

    try {
      // 1. Decode base64 audio
      const audioBuffer = Buffer.from(audioBase64, "base64");

      if (audioBuffer.length < 1000) {
        // Audio too short, likely silence
        sendEvent(ws, {
          type: "ai_response",
          text: "I couldn't hear that clearly. Could you please speak again?",
        });
        try {
          const retryAudio = await textToSpeech(
            "I couldn't hear that clearly. Could you please speak again?",
            session.language
          );
          sendEvent(ws, {
            type: "ai_audio",
            data: retryAudio,
            format: "wav",
          });
        } catch { /* text already sent */ }
        return;
      }

      // 2. Speech-to-Text
      const sttResult = await transcribeAudio(audioBuffer, session.language);

      if (!sttResult) {
        // Empty transcription — ask user to repeat
        const retryMessage =
          "Sorry, I couldn't understand that. Could you please repeat what you said?";
        sendEvent(ws, { type: "ai_response", text: retryMessage });
        try {
          const retryAudio = await textToSpeech(retryMessage, session.language);
          sendEvent(ws, {
            type: "ai_audio",
            data: retryAudio,
            format: "wav",
          });
        } catch { /* text already sent */ }
        return;
      }

      // Send transcript to client
      sendEvent(ws, { type: "transcript", text: sttResult.transcript });

      // 3. Process through conversation manager (LLM)
      const aiResponse = await processUserTurn(sid, sttResult.transcript);

      // 4. Send AI text response
      sendEvent(ws, { type: "ai_response", text: aiResponse });

      // 5. Text-to-Speech
      try {
        const audioBase64Response = await textToSpeech(aiResponse, session.language);
        sendEvent(ws, {
          type: "ai_audio",
          data: audioBase64Response,
          format: "wav",
        });
      } catch (ttsError) {
        console.error("[WS] TTS failed for response:", ttsError);
        // AI text response already sent, the conversation can continue
      }
    } catch (error) {
      console.error("[WS] Error processing audio:", error);
      const errorMessage =
        "I'm having trouble processing your response. Could you try speaking again?";
      sendEvent(ws, { type: "ai_response", text: errorMessage });
      try {
        const errorAudio = await textToSpeech(errorMessage, session.language);
        sendEvent(ws, {
          type: "ai_audio",
          data: errorAudio,
          format: "wav",
        });
      } catch { /* text already sent */ }
    }
  }

  async function handleEndCall(ws: WebSocket, sid: string): Promise<void> {
    console.log(`[WS] Call ending: ${sid}`);
    updateSession(sid, { status: "completed" });

    sendEvent(ws, { type: "processing" });

    try {
      const report = await generateReport(sid);
      sendEvent(ws, { type: "report_ready", report });
      console.log(`[WS] Report generated for session: ${sid}`);
    } catch (error) {
      console.error("[WS] Failed to generate report:", error);
      // Send a basic report
      sendEvent(ws, {
        type: "report_ready",
        report: {
          patientName: "Not provided",
          mainConcern: "Not provided",
          symptoms: [],
          duration: "Not provided",
          severity: "Not provided",
          followUp: "Report generation failed. Please consult a healthcare professional.",
          status: "incomplete" as const,
          conversationSummary: "Report could not be generated due to an error.",
        },
      });
    }

    // Cleanup session after a delay
    setTimeout(() => deleteSession(sid), 60000);
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function sendEvent(ws: WebSocket, event: WSServerEvent): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}
