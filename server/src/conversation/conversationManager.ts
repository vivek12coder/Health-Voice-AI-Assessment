import { chatCompletion } from "../services/sarvamLlm.js";
import { getSession, addMessage, updateSession } from "./state.js";
import { buildScreeningPrompt } from "./prompts.js";
import type { Message } from "../types/index.js";

/**
 * Process a user's transcript turn and generate an AI response.
 * This is the core conversation orchestrator.
 */
export async function processUserTurn(
  sessionId: string,
  userTranscript: string
): Promise<string> {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Build the messages array for the LLM without mutating state yet
  const systemPrompt = buildScreeningPrompt(session);

  const llmMessages: Message[] = [
    {
      role: "system",
      content: systemPrompt,
      timestamp: Date.now(),
    },
    // Include conversation history
    ...session.messages.slice(-20),
    // Include the current user turn
    {
      role: "user",
      content: userTranscript,
      timestamp: Date.now(),
    }
  ];

  // Get AI response
  const aiResponse = await chatCompletion(llmMessages);

  // Success! Now commit user message and extract info
  addMessage(sessionId, "user", userTranscript);
  extractInfo(sessionId, userTranscript);

  // Add assistant message to history
  addMessage(sessionId, "assistant", aiResponse);

  // Track the question being asked
  updateSession(sessionId, {
    currentQuestion: aiResponse,
    questionsAsked: [...session.questionsAsked, aiResponse.slice(0, 80)],
  });

  return aiResponse;
}

/**
 * Extract structured information from user's response.
 * Uses simple heuristics — LLM-based extraction happens at report time.
 */
function extractInfo(sessionId: string, text: string): void {
  const session = getSession(sessionId);
  if (!session) return;

  const lower = text.toLowerCase();
  const updates: Partial<typeof session> = {};

  // Try to extract name (if not already known and this is early in conversation)
  if (!session.patientName && session.messages.length <= 3) {
    // Common patterns: "My name is X", "I'm X", "I am X", "This is X"
    const namePatterns = [
      /(?:my name is|i'm|i am|this is|mera naam|naam)\s+([a-zA-Z\u0900-\u097F]+)/i,
      /(?:call me|mai|main)\s+([a-zA-Z\u0900-\u097F]+)/i,
    ];
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        updates.patientName = match[1].trim();
        break;
      }
    }
    // If early in conversation and response is just a single word/name
    if (!updates.patientName && session.messages.length <= 3) {
      const words = text.trim().split(/\s+/);
      if (words.length <= 2 && /^[A-Z\u0900-\u097F]/u.test(text.trim())) {
        updates.patientName = text.trim();
      }
    }
  }

  // Try to extract severity (look for numbers like "7/10", "6 out of 10", etc.)
  if (!session.severity) {
    const severityPatterns = [
      /(\d+)\s*(?:\/|out of)\s*10/i,
      /severity\s*(?:is|:)?\s*(\d+)/i,
      /(?:about|around|maybe)\s*(\d+)/i,
    ];
    for (const pattern of severityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 10) {
          updates.severity = `${num}/10`;
          break;
        }
      }
    }
    // Descriptive severity
    if (
      !updates.severity &&
      /\b(mild|moderate|severe|intense|unbearable|slight|terrible|awful|bad|worse|worst)\b/i.test(
        lower
      )
    ) {
      const match = lower.match(
        /\b(mild|moderate|severe|intense|unbearable|slight|terrible|awful|bad|worse|worst)\b/i
      );
      if (match) updates.severity = match[1];
    }
  }

  // Try to extract duration
  if (!session.duration) {
    const durationPatterns = [
      /(\d+)\s*(day|days|week|weeks|month|months|year|years|hour|hours|din|hafte|mahine)/i,
      /(?:since|from|for|past|last|se)\s+(\d+\s*(?:day|days|week|weeks|month|months|year|years|hour|hours))/i,
      /(yesterday|today|this morning|last night|last week|last month|kal|aaj|parso)/i,
    ];
    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        updates.duration = match[0].trim();
        break;
      }
    }
  }

  // Try to extract main concern (if not already known)
  if (!session.mainConcern && session.messages.length >= 2) {
    const symptomKeywords = [
      "headache", "fever", "cough", "cold", "pain", "ache", "nausea",
      "vomiting", "dizziness", "fatigue", "weakness", "stomach", "chest",
      "throat", "back", "joint", "muscle", "breathing", "sleep",
      "anxiety", "stress", "sir dard", "bukhar", "khasi", "dard",
    ];
    for (const keyword of symptomKeywords) {
      if (lower.includes(keyword)) {
        updates.mainConcern = text.trim();
        break;
      }
    }
  }

  // Update session if we extracted anything
  if (Object.keys(updates).length > 0) {
    updateSession(sessionId, updates);
    console.log(`[ConvManager] Extracted info:`, updates);
  }
}
