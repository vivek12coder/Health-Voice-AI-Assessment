// ─── Health Report ───────────────────────────────────────────────────────────

export type HealthReport = {
  patientName: string;
  mainConcern: string;
  symptoms: string[];
  duration: string;
  severity: string;
  followUp: string;
  status: "complete" | "incomplete";
  conversationSummary?: string;
};

// ─── Call / Voice State ──────────────────────────────────────────────────────

export type CallState =
  | "idle"
  | "connecting"
  | "ai-speaking"
  | "listening"
  | "processing"
  | "report";

export type VoiceState = CallState;

// ─── Chat Message ────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

// ─── WebSocket Events ────────────────────────────────────────────────────────

export type WSClientEvent =
  | { type: "start_call"; language?: string }
  | { type: "audio_data"; data: string }
  | { type: "end_call" };

export type WSServerEvent =
  | { type: "call_started"; sessionId: string }
  | { type: "transcript"; text: string }
  | { type: "processing" }
  | { type: "ai_response"; text: string }
  | { type: "ai_audio"; data: string; format: string }
  | { type: "error"; message: string }
  | { type: "report_ready"; report: HealthReport };
