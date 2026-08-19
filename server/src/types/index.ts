// ─── Message Types ───────────────────────────────────────────────────────────

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
};

// ─── Conversation State ──────────────────────────────────────────────────────

export type ConversationState = {
  sessionId: string;
  patientName?: string;
  mainConcern?: string;
  duration?: string;
  severity?: string;
  relatedSymptoms?: string[];
  currentQuestion?: string;
  questionsAsked: string[];
  messages: Message[];
  status: "active" | "completed";
  language: "en-IN" | "hi-IN";
  createdAt: number;
};

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
