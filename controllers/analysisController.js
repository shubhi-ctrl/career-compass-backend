const Anthropic = require("@anthropic-ai/sdk");
const { enrichCareerWithOnet } = require("../services/onetService");

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * POST /api/analysis/career-task
 *
 * Accepts multipart/form-data:
 *   careerTitle  — string e.g. "Software Engineer"
 *   tasks        — JSON string of TaskSubmission[]
 *   userContext  — JSON string { age?, background?, interests? }
 *   image        — optional image file
 */
async function analyzeCareerTask(req, res) {
  try {
    const { careerTitle, tasks: tasksJson, userContext: contextJson } = req.body;

    if (!careerTitle || !tasksJson) {
      return res.status(400).json({ success: false, error: "careerTitle and tasks are required" });
    }

    const tasks = JSON.parse(tasksJson);
    const userContext = contextJson ? JSON.parse(contextJson) : {};
    const imageFile = req.file; // multer puts uploaded file here

    // ── Build Claude message ──────────────────────────────────────────────
    const contentParts = [];

    const textPrompt = `You are an expert career counsellor and psychologist. A user has just completed "Try This Career Out" tasks for: **${careerTitle}**.

User Context:
${userContext.age ? `- Age: ${userContext.age}` : "- Age: not provided"}
${userContext.background ? `- Background: ${userContext.background}` : ""}
${userContext.interests ? `- Interests: ${userContext.interests}` : ""}

Tasks attempted:
${tasks
  .map(
    (t, i) => `
Task ${i + 1}: ${t.title}
Description: ${t.description}
User's notes: ${t.userAnswer || "(no response written)"}
Time spent: ${t.timeSpent || "not specified"}
Completed: ${t.completed ? "Yes" : "No"}`
  )
  .join("\n---")}

${imageFile ? "The user has uploaded an image of their work. Please analyse it as part of your assessment." : ""}

Respond ONLY with a valid JSON object — no markdown, no extra text:

{
  "fitScore": <0-100>,
  "fitLabel": "<Poor Fit | Fair Fit | Good Fit | Great Fit | Excellent Fit>",
  "headline": "<one punchy sentence summarising their fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "growthAreas": ["<area 1>", "<area 2>"],
  "personalityInsights": "<2-3 sentences about their personality and work style>",
  "recommendation": "<3-4 sentences of personalised advice — should they pursue this? What next?>",
  "alternativeCareers": ["<career 1>", "<career 2>", "<career 3>"],
  "motivationalMessage": "<one warm encouraging closing message>"
}`;

    contentParts.push({ type: "text", text: textPrompt });

    // Attach image if uploaded
    if (imageFile) {
      contentParts.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageFile.mimetype,
          data: imageFile.buffer.toString("base64"),
        },
      });
    }

    // ── Call Claude ───────────────────────────────────────────────────────
    const claudeResponse = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: contentParts }],
    });

    const rawText = claudeResponse.content[0]?.text || "";

    let analysis;
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      analysis = { raw: rawText, parseError: true };
    }

    // ── Enrich with O*NET ─────────────────────────────────────────────────
    let onetData = null;
    let alternativeOnetData = null;

    try {
      onetData = await enrichCareerWithOnet(careerTitle);
    } catch (e) {
      console.error("O*NET primary enrichment failed:", e.message);
    }

    if (analysis.alternativeCareers?.length) {
      try {
        alternativeOnetData = await enrichCareerWithOnet(analysis.alternativeCareers[0]);
      } catch (e) {
        console.error("O*NET alternative enrichment failed:", e.message);
      }
    }

    return res.json({ success: true, analysis, onetData, alternativeOnetData });
  } catch (err) {
    console.error("analyzeCareerTask error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { analyzeCareerTask };
