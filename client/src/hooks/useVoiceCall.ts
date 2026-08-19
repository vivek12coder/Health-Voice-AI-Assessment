import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import type {
  CallState,
  ChatMessage,
  HealthReport,
  WSServerEvent,
} from "../types";

export function useVoiceCall() {
  const { connectionState, connect, disconnect, sendEvent, addHandler } =
    useWebSocket();

  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ─── WebSocket Event Handler ─────────────────────────────────────────────

  useEffect(() => {
    const removeHandler = addHandler((event: WSServerEvent) => {
      switch (event.type) {
        case "call_started":
          setSessionId(event.sessionId);
          setCallState("active");
          setError(null);
          break;

        case "transcript":
          // Add user message when STT returns transcript
          setMessages((prev) => [
            ...prev,
            {
              id: `user-${Date.now()}`,
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
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: "assistant",
              content: event.text,
              timestamp: Date.now(),
            },
          ]);
          setCallState("active");
          break;

        case "ai_audio":
          playAudio(event.data);
          break;

        case "report_ready":
          setReport(event.report);
          setCallState("report");
          disconnect();
          break;

        case "error":
          setError(event.message);
          if (callState === "connecting") {
            setCallState("idle");
          } else if (callState === "processing") {
            setCallState("active");
          }
          // Clear error after 5s
          setTimeout(() => setError(null), 5000);
          break;
      }
    });

    return removeHandler;
  }, [addHandler, callState, disconnect]);

  // ─── Audio Playback ──────────────────────────────────────────────────────

  const playAudio = useCallback(async (base64Audio: string) => {
    try {
      setIsAiSpeaking(true);
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(
        arrayBuffer
      );
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsAiSpeaking(false);
      source.start(0);
    } catch (error) {
      console.error("[Audio] Playback failed:", error);
      setIsAiSpeaking(false);
    }
  }, []);

  // ─── Start Call ──────────────────────────────────────────────────────────

  const startCall = useCallback(
    async (language?: string) => {
      try {
        setCallState("connecting");
        setMessages([]);
        setReport(null);
        setError(null);

        await connect();
        sendEvent({ type: "start_call", language });
      } catch (err) {
        console.error("[Call] Failed to start:", err);
        setError("Failed to connect to the server. Please try again.");
        setCallState("idle");
      }
    },
    [connect, sendEvent]
  );

  // ─── Recording ───────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setCallState("recording");
    } catch (err) {
      console.error("[Recording] Failed to start:", err);
      setError("Microphone access denied. Please allow microphone access.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Combine audio chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          if (base64) {
            sendEvent({ type: "audio_data", data: base64 });
            setCallState("processing");
          }
          resolve();
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.stop();
      mediaRecorderRef.current = null;
    });
  }, [sendEvent]);

  // ─── End Call ────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    // Stop recording if active
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
    }

    setCallState("processing");
    sendEvent({ type: "end_call" });
  }, [sendEvent]);

  // ─── New Call ────────────────────────────────────────────────────────────

  const newCall = useCallback(() => {
    setCallState("idle");
    setMessages([]);
    setReport(null);
    setError(null);
    setSessionId(null);
  }, []);

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      disconnect();
    };
  }, [disconnect]);

  return {
    callState,
    connectionState,
    messages,
    report,
    error,
    sessionId,
    isAiSpeaking,
    startCall,
    startRecording,
    stopRecording,
    endCall,
    newCall,
  };
}
