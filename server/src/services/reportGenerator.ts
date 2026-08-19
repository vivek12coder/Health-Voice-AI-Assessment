import { chatCompletion } from "./sarvamLlm.js";
import { getSession } from "../conversation/state.js";
import { buildReportPrompt } from "../conversation/prompts.js";
import type { HealthReport, Message } from "../types/index.js";

/**
 * Generate a structured health report from the conversation.
 * Uses LLM extraction with fallback to heuristic state.
 */
export async function generateReport(
  sessionId: string
): Promise<HealthReport> {
  const session = getSession(sessionId);
  if (!session) {
    return createEmptyReport("Session not found");
  }

  // If conversation was too short, return partial report from state
  if (session.messages.filter((m) => m.role === "user").length === 0) {
    return createEmptyReport("No conversation occurred");
  }

  try {
    // Build conversation transcript for LLM
    const transcript = session.messages
      .filter((m) => m.role !== "system")
      .map(
        (m) => `${m.role === "user" ? "Patient" : "Assistant"}: ${m.content}`
      )
      .join("\n");

    const reportPrompt = buildReportPrompt();

    const messages: Message[] = [
      {
        role: "system",
        content: reportPrompt,
        timestamp: Date.now(),
      },
      {
        role: "user",
        content: `Here is the conversation transcript:\n\n${transcript}`,
        timestamp: Date.now(),
      },
    ];

    const llmResponse = await chatCompletion(messages, 0.3);

    // Try to parse LLM response as JSON
    const report = parseReportResponse(llmResponse);

    // Merge with conversation state for anything the LLM missed
    return mergeWithState(report, session);
  } catch (error) {
    console.error("[ReportGen] LLM-based report generation failed:", error);
    // Fallback: build report from conversation state only
    return buildReportFromState(session);
  }
}

/**
 * Parse the LLM's JSON response, handling various formatting issues.
 */
function parseReportResponse(
  response: string
): Partial<HealthReport> {
  try {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object in the response
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    return {
      patientName: typeof parsed.patientName === "string" ? parsed.patientName : "Not provided",
      mainConcern: typeof parsed.mainConcern === "string" ? parsed.mainConcern : "Not provided",
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      duration: typeof parsed.duration === "string" ? parsed.duration : "Not provided",
      severity: typeof parsed.severity === "string" ? parsed.severity : "Not provided",
      followUp: typeof parsed.followUp === "string" ? parsed.followUp : "Consider consulting a healthcare professional",
      conversationSummary: typeof parsed.conversationSummary === "string" ? parsed.conversationSummary : undefined,
    };
  } catch {
    console.error("[ReportGen] Failed to parse LLM report response");
    return {};
  }
}

/**
 * Merge LLM-extracted report with conversation state data.
 */
function mergeWithState(
  llmReport: Partial<HealthReport>,
  state: NonNullable<ReturnType<typeof getSession>>
): HealthReport {
  const userMessages = state.messages.filter(
    (m) => m.role === "user"
  ).length;

  const report: HealthReport = {
    patientName:
      llmReport.patientName || state.patientName || "Not provided",
    mainConcern:
      llmReport.mainConcern || state.mainConcern || "Not provided",
    symptoms:
      llmReport.symptoms && llmReport.symptoms.length > 0
        ? llmReport.symptoms
        : state.relatedSymptoms || [],
    duration:
      llmReport.duration || state.duration || "Not provided",
    severity:
      llmReport.severity || state.severity || "Not provided",
    followUp:
      llmReport.followUp ||
      "Consider consulting a healthcare professional if symptoms persist",
    status: userMessages >= 3 ? "complete" : "incomplete",
    conversationSummary: llmReport.conversationSummary,
  };

  // Add main concern to symptoms if not already there
  if (
    report.mainConcern !== "Not provided" &&
    !report.symptoms.includes(report.mainConcern)
  ) {
    report.symptoms = [report.mainConcern, ...report.symptoms];
  }

  return report;
}

/**
 * Build report purely from conversation state (fallback).
 */
function buildReportFromState(
  state: ReturnType<typeof getSession>
): HealthReport {
  if (!state) return createEmptyReport("Session not found");

  const userMessages = state.messages.filter((m) => m.role === "user").length;

  return {
    patientName: state.patientName || "Not provided",
    mainConcern: state.mainConcern || "Not provided",
    symptoms: state.relatedSymptoms || [],
    duration: state.duration || "Not provided",
    severity: state.severity || "Not provided",
    followUp:
      "Consider consulting a healthcare professional if symptoms persist",
    status: userMessages >= 3 ? "complete" : "incomplete",
    conversationSummary: `Screening conversation with ${userMessages} patient response(s).`,
  };
}

/**
 * Create an empty report for edge cases.
 */
function createEmptyReport(reason: string): HealthReport {
  return {
    patientName: "Not provided",
    mainConcern: "Not provided",
    symptoms: [],
    duration: "Not provided",
    severity: "Not provided",
    followUp: "Unable to generate recommendations — screening was not completed",
    status: "incomplete",
    conversationSummary: reason,
  };
}
