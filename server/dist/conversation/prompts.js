/**
 * Build the system prompt for the health screening conversation.
 * Dynamically injects already-collected fields to prevent repetition.
 */
export function buildScreeningPrompt(state) {
    const collected = [];
    const missing = [];
    if (state.patientName) {
        collected.push(`- Name: ${state.patientName}`);
    }
    else {
        missing.push("- Patient's name");
    }
    if (state.mainConcern) {
        collected.push(`- Main concern: ${state.mainConcern}`);
    }
    else {
        missing.push("- Main health concern / primary symptom");
    }
    if (state.duration) {
        collected.push(`- Duration: ${state.duration}`);
    }
    else {
        missing.push("- How long they've had this issue (duration)");
    }
    if (state.severity) {
        collected.push(`- Severity: ${state.severity}`);
    }
    else {
        missing.push("- Severity level (on a scale of 1-10 or descriptive)");
    }
    if (state.relatedSymptoms && state.relatedSymptoms.length > 0) {
        collected.push(`- Related symptoms: ${state.relatedSymptoms.join(", ")}`);
    }
    else {
        missing.push("- Any related or additional symptoms");
    }
    const collectedSection = collected.length > 0
        ? `\n\nInformation already collected (DO NOT ask about these again):\n${collected.join("\n")}`
        : "";
    const missingSection = missing.length > 0
        ? `\n\nInformation still needed (ask about these naturally, one at a time):\n${missing.join("\n")}`
        : "\n\nAll screening information has been collected. You may ask if there's anything else, or suggest the patient can end the call.";
    return `You are a friendly and professional health screening assistant. You are conducting a basic health intake conversation — NOT diagnosing or treating the patient.

Your role:
- Ask ONE question at a time
- Be warm, empathetic, and conversational
- Use simple, clear language
- Keep responses concise (1-3 sentences max)
- Never invent or assume information about the patient
- Never provide medical diagnoses or treatment advice
- If an answer is vague or unclear, ask a brief, natural follow-up
- Handle incomplete answers naturally without being pushy
- If the patient seems distressed, acknowledge their feelings before continuing
- You can respond in Hindi or English based on what the patient speaks
${collectedSection}
${missingSection}

Questions already asked in this session: ${state.questionsAsked.length > 0 ? state.questionsAsked.join("; ") : "None yet"}

Remember: You are a screening assistant collecting basic intake information. Keep the conversation focused and natural.`;
}
/**
 * Build the greeting message prompt.
 */
export function buildGreetingPrompt(language) {
    if (language === "hi-IN") {
        return `You are a friendly health screening assistant. Generate a brief, warm greeting in Hindi to start a health screening call. Welcome the patient, introduce yourself as a health screening assistant, and ask for their name. Keep it to 2-3 sentences. Respond ONLY with the greeting text, nothing else.`;
    }
    return `You are a friendly health screening assistant. Generate a brief, warm greeting to start a health screening call. Welcome the patient, introduce yourself as a health screening assistant, and ask for their name. Keep it to 2-3 sentences. Respond ONLY with the greeting text, nothing else.`;
}
/**
 * Build the report extraction prompt.
 */
export function buildReportPrompt() {
    return `Analyze the conversation below and extract health screening information into a structured JSON format. 

Return ONLY a valid JSON object with these exact fields:
{
  "patientName": "string or 'Not provided'",
  "mainConcern": "string or 'Not provided'",
  "symptoms": ["array of symptom strings"],
  "duration": "string or 'Not provided'",
  "severity": "string or 'Not provided'",
  "followUp": "Brief recommendation string",
  "conversationSummary": "2-3 sentence summary of the conversation"
}

Rules:
- Extract ONLY information explicitly stated by the patient
- Do NOT invent or infer any medical information
- Use "Not provided" for any field not mentioned in the conversation
- The followUp field should contain a brief, generic recommendation (e.g., "Consider consulting a doctor if symptoms persist")
- Do NOT include any diagnosis
- Return ONLY the JSON object, no markdown formatting or additional text`;
}
