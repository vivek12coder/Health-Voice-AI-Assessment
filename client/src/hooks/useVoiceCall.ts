import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { VoiceActivityDetector, DEFAULT_VAD_CONFIG, type VadConfig } from "../services/vad";
import { PcmAudioRecorder } from "../services/audioRecorder";
import type {
  CallState,
  ChatMessage,
  HealthReport,
  WSServerEvent,
} from "../types";

export function useVoiceCall(customVadConfig?: Partial<VadConfig>) {
  const { connectionState, connect, disconnect, sendEvent, addHandler } =
    useWebSocket();

  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [promptNotice, setPromptNotice] = useState<string | null>(null);

  // References to preserve state across asynchronous boundaries and callbacks
  const callStateRef = useRef<CallState>("idle");
  const isAiSpeakingRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const isSpeechDetectedRef = useRef<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioRecorderRef = useRef<PcmAudioRecorder | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const noAudioTimeoutRef = useRef<number | null>(null);
  const promptNoticeTimeoutRef = useRef<number | null>(null);

  // Keep ref synchronized with state
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking]);

  // ─── Helper: Enter Listening Mode ─────────────────────────────────────────
  const enterListeningMode = useCallback(() => {
    if (callStateRef.current === "report" || callStateRef.current === "idle") {
      return;
    }

    console.log("[VoiceState] Entering listening mode...");
    setCallState("listening");
    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
    setPromptNotice(null);
    isSubmittingRef.current = false;
    isSpeechDetectedRef.current = false;

    // Start fresh 16kHz PCM audio recorder turn
    if (audioRecorderRef.current) {
      audioRecorderRef.current.startTurn();
    }

    // Start VAD
    if (vadRef.current) {
      vadRef.current.start();
    }
  }, []);

  // ─── Helper: Finalize and Submit User Audio Turn ─────────────────────────
  const finalizeAndSubmitTurn = useCallback(() => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    console.log("[Turn] Finalizing user speech turn...");

    // Stop VAD immediately
    if (vadRef.current) {
      vadRef.current.stop();
    }
    setIsUserSpeaking(false);
    setAudioLevel(0);
    setPromptNotice(null);

    // Stop recorder and retrieve 16kHz WAV Blob
    const wavBlob = audioRecorderRef.current?.stopTurn();

    if (!wavBlob || wavBlob.size < 1000) {
      console.warn("[Turn] Audio blob too small/empty (< 1000 bytes), resuming listening");
      isSubmittingRef.current = false;
      if (callStateRef.current !== "report" && callStateRef.current !== "idle") {
        enterListeningMode();
      }
      return;
    }

    console.log(`[Turn] 16kHz WAV Blob created (${wavBlob.size} bytes), sending to STT...`);

    // Transition to processing state
    setCallState("processing");

    // Convert to base64 and send to server
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      const base64 = resultStr.split(",")[1];
      if (base64) {
        console.log("[Turn] Sending WAV audio data to server...");
        sendEvent({ type: "audio_data", data: base64 });
      } else {
        console.error("[Turn] Failed to parse base64 audio");
        enterListeningMode();
      }
      isSubmittingRef.current = false;
    };

    reader.onerror = (err) => {
      console.error("[Turn] FileReader error:", err);
      enterListeningMode();
      isSubmittingRef.current = false;
    };

    reader.readAsDataURL(wavBlob);
  }, [enterListeningMode, sendEvent]);

  // ─── Audio Playback ──────────────────────────────────────────────────────
  const playAudio = useCallback(
    async (base64Audio: string) => {
      try {
        // Pause VAD and recorder during AI playback to prevent acoustic echo
        if (vadRef.current) {
          vadRef.current.stop();
        }
        if (audioRecorderRef.current) {
          audioRecorderRef.current.stopTurn();
        }

        setCallState("ai-speaking");
        setIsAiSpeaking(true);
        setIsUserSpeaking(false);
        setAudioLevel(0);
        setPromptNotice(null);

        // Decode base64 audio
        const audioData = atob(base64Audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
          view[i] = audioData.charCodeAt(i);
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }

        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        // Stop any currently playing source
        if (currentAudioSourceRef.current) {
          try {
            currentAudioSourceRef.current.stop();
          } catch { /* ignore */ }
          currentAudioSourceRef.current = null;
        }

        const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioContextRef.current.destination);
        currentAudioSourceRef.current = source;

        source.onended = () => {
          console.log("[Audio] AI audio playback finished.");
          currentAudioSourceRef.current = null;
          setIsAiSpeaking(false);

          // Automatically return to listening mode!
          enterListeningMode();
        };

        source.start(0);
      } catch (playErr) {
        console.error("[Audio] Playback failed:", playErr);
        setIsAiSpeaking(false);
        enterListeningMode();
      }
    },
    [enterListeningMode]
  );

  // ─── WebSocket Event Handling ────────────────────────────────────────────
  useEffect(() => {
    const removeHandler = addHandler((event: WSServerEvent) => {
      switch (event.type) {
        case "call_started":
          console.log("[WS] Call session started:", event.sessionId);
          setSessionId(event.sessionId);
          setError(null);
          break;

        case "transcript":
          console.log("[WS] Transcript received:", event.text);
          setMessages((prev) => [
            ...prev,
            {
              id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role: "user",
              content: event.text,
              timestamp: Date.now(),
            },
          ]);
          break;

        case "processing":
          setCallState("processing");
          break;

        case "ai_response":
          console.log("[WS] AI response received:", event.text);
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role: "assistant",
              content: event.text,
              timestamp: Date.now(),
            },
          ]);

          // Set fallback timer in case TTS audio is delayed or fails
          if (noAudioTimeoutRef.current) {
            window.clearTimeout(noAudioTimeoutRef.current);
          }
          noAudioTimeoutRef.current = window.setTimeout(() => {
            if (callStateRef.current === "processing") {
              console.log("[Audio] No audio received for response, returning to listening");
              enterListeningMode();
            }
          }, 3000);
          break;

        case "ai_audio":
          if (noAudioTimeoutRef.current) {
            window.clearTimeout(noAudioTimeoutRef.current);
            noAudioTimeoutRef.current = null;
          }
          playAudio(event.data);
          break;

        case "report_ready":
          console.log("[WS] Report ready:", event.report);
          setReport(event.report);
          setCallState("report");
          setIsAiSpeaking(false);
          setIsUserSpeaking(false);
          if (vadRef.current) vadRef.current.cleanup();
          if (audioRecorderRef.current) audioRecorderRef.current.cleanup();
          disconnect();
          break;

        case "error":
          console.error("[WS] Server error:", event.message);
          setError(event.message);

          if (callStateRef.current === "connecting") {
            setCallState("idle");
          } else if (callStateRef.current === "processing") {
            // Gracefully recover back to listening
            enterListeningMode();
          }

          setTimeout(() => setError(null), 5000);
          break;
      }
    });

    return removeHandler;
  }, [addHandler, disconnect, enterListeningMode, playAudio]);

  // ─── Start Call ──────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (language: string = "en-IN") => {
      try {
        setCallState("connecting");
        setMessages([]);
        setReport(null);
        setError(null);
        setPromptNotice(null);
        isSubmittingRef.current = false;
        isSpeechDetectedRef.current = false;

        // 1. Initialize AudioContext first (to handle user interaction requirement)
        const audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        // 2. Request microphone permission once upfront
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        // 3. Initialize PCM Audio Recorder
        const recorder = new PcmAudioRecorder();
        recorder.initialize(stream, audioCtx);
        audioRecorderRef.current = recorder;

        // 4. Initialize VAD engine with the active stream
        const vad = new VoiceActivityDetector(
          {
            onVolumeChange: (vol) => {
              if (callStateRef.current === "listening") {
                setAudioLevel(vol);
              }
            },
            onSpeechStart: () => {
              if (callStateRef.current === "listening") {
                console.log("[VAD] User started speaking");
                isSpeechDetectedRef.current = true;
                setIsUserSpeaking(true);
                setPromptNotice(null);
                audioRecorderRef.current?.onSpeechStart();
              }
            },
            onSpeechEnd: () => {
              if (callStateRef.current === "listening") {
                console.log("[VAD] Speech end detected (sustained silence)");
                finalizeAndSubmitTurn();
              }
            },
            onNoSpeechTimeout: () => {
              if (callStateRef.current === "listening" && !isSpeechDetectedRef.current) {
                setPromptNotice("I'm listening. Please tell me how you're feeling.");
                if (promptNoticeTimeoutRef.current) window.clearTimeout(promptNoticeTimeoutRef.current);
                promptNoticeTimeoutRef.current = window.setTimeout(() => setPromptNotice(null), 6000);
              }
            },
          },
          { ...DEFAULT_VAD_CONFIG, ...customVadConfig }
        );

        vad.initialize(stream, audioCtx);
        vadRef.current = vad;

        // 5. Connect WebSocket and send start_call
        await connect();
        sendEvent({ type: "start_call", language });
        console.log("[Call] Call initialized successfully");
      } catch (err) {
        console.error("[Call] Failed to start call:", err);
        setError("Microphone access or server connection failed. Please check permissions and try again.");
        setCallState("idle");
      }
    },
    [connect, customVadConfig, finalizeAndSubmitTurn, sendEvent]
  );

  // ─── End Call ────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    console.log("[Call] Ending call...");

    // Stop playback immediately
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch { /* ignore */ }
      currentAudioSourceRef.current = null;
    }

    // Stop VAD
    if (vadRef.current) {
      vadRef.current.cleanup();
      vadRef.current = null;
    }

    // Stop Recorder
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cleanup();
      audioRecorderRef.current = null;
    }

    // Stop all microphone tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch { /* ignore */ }
      audioContextRef.current = null;
    }

    if (noAudioTimeoutRef.current) {
      window.clearTimeout(noAudioTimeoutRef.current);
      noAudioTimeoutRef.current = null;
    }

    if (promptNoticeTimeoutRef.current) {
      window.clearTimeout(promptNoticeTimeoutRef.current);
      promptNoticeTimeoutRef.current = null;
    }

    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
    setAudioLevel(0);
    setPromptNotice(null);
    setCallState("processing");

    // Request report from server
    sendEvent({ type: "end_call" });
  }, [sendEvent]);

  // ─── New Call Reset ──────────────────────────────────────────────────────
  const newCall = useCallback(() => {
    setCallState("idle");
    setMessages([]);
    setReport(null);
    setError(null);
    setSessionId(null);
    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
    setAudioLevel(0);
    setPromptNotice(null);
  }, []);

  // ─── Optional Manual Action (Fallback) ───────────────────────────────────
  const manualSubmitTurn = useCallback(() => {
    if (callStateRef.current === "listening") {
      finalizeAndSubmitTurn();
    }
  }, [finalizeAndSubmitTurn]);

  // ─── Teardown on Component Unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (vadRef.current) {
        vadRef.current.cleanup();
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cleanup();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch { /* ignore */ }
      }
      if (noAudioTimeoutRef.current) window.clearTimeout(noAudioTimeoutRef.current);
      if (promptNoticeTimeoutRef.current) window.clearTimeout(promptNoticeTimeoutRef.current);
      disconnect();
    };
  }, [disconnect]);

  return {
    callState,
    voiceState: callState,
    connectionState,
    messages,
    report,
    error,
    sessionId,
    isAiSpeaking,
    isUserSpeaking,
    audioLevel,
    promptNotice,
    startCall,
    endCall,
    newCall,
    manualSubmitTurn,
  };
}
