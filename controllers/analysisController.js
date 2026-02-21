const { GoogleGenerativeAI } = require("@google/generative-ai");
const { enrichCareerWithOnet } = require("../services/onetService");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Retry wrapper for Gemini (handles 429 quota errors) ──────────────────────
async function callGeminiWithRetry(model, parts, retries = 3, delayMs = 2500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await model.generateContent(parts);
      return response.response.text();
    } catch (err) {
      const is429 = err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("Too Many Requests");
      if (is429 && attempt < retries) {
        console.warn(`Gemini 429 quota hit — retrying in ${delayMs * attempt}ms (attempt ${attempt}/${retries})`);
        await new Promise(r => setTimeout(r, delayMs * attempt));
      } else {
        throw err;
      }
    }
  }
}

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
    const imageFile = req.file;

    // ── Build Gemini prompt ──────────────────────────────────────────────────
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

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


    const parts = [{ text: textPrompt }];
    if (imageFile) {
      parts.push({
        inlineData: {
          mimeType: imageFile.mimetype,
          data: imageFile.buffer.toString("base64"),
        },
      });
    }

    let rawText;
    try {
      rawText = await callGeminiWithRetry(model, parts);
    } catch (err) {
      const isQuota = err.message?.includes("429") || err.message?.includes("quota");
      if (isQuota) {
        return res.status(503).json({
          success: false,
          error: "AI is temporarily unavailable due to high demand. Please try again in a few minutes.",
          quotaExceeded: true,
        });
      }
      throw err;
    }

    let analysis;
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch {
      analysis = { raw: rawText, parseError: true };
    }

    let onetData = null;
    let alternativeOnetData = null;
    try { onetData = await enrichCareerWithOnet(careerTitle); } catch { }
    if (analysis.alternativeCareers?.length) {
      try { alternativeOnetData = await enrichCareerWithOnet(analysis.alternativeCareers[0]); } catch { }
    }

    return res.json({ success: true, analysis, onetData, alternativeOnetData });
  } catch (err) {
    console.error("analyzeCareerTask error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/analysis/skill-gap
 * Body: { targetCareer: string, currentSkills: string[] }
 */
async function analyzeSkillGap(req, res) {
  try {
    const { targetCareer, currentSkills } = req.body;
    if (!targetCareer || !currentSkills)
      return res.status(400).json({ success: false, error: "targetCareer and currentSkills are required" });

    const skillsList = Array.isArray(currentSkills) ? currentSkills : currentSkills.split(",").map(s => s.trim());

    const prompt = `You are a career skills advisor. A user wants to become a **${targetCareer}** and currently has these skills: ${skillsList.join(", ")}.

Respond ONLY with a valid JSON object — no markdown, no extra text:

{
  "existingStrengths": ["<skill 1>", "<skill 2>"],
  "skillGaps": [
    { "skill": "<skill name>", "priority": "<High|Medium|Low>", "reason": "<brief why it matters>", "resource": "<free online resource or platform>" }
  ],
  "overallReadiness": <0-100>,
  "readinessLabel": "<Beginner | Building | Intermediate | Advanced | Job-Ready>",
  "estimatedTimeToReady": "<e.g. 3-6 months>",
  "nextAction": "<one specific next step they should take this week>",
  "encouragement": "<one warm sentence of encouragement>"
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


    let rawText;
    try {
      rawText = await callGeminiWithRetry(model, [{ text: prompt }]);
    } catch (err) {
      const isQuota = err.message?.includes("429") || err.message?.includes("quota");
      if (isQuota) {
        return res.status(503).json({
          success: false,
          error: "AI is temporarily unavailable. Please try again in a few minutes.",
          quotaExceeded: true,
        });
      }
      throw err;
    }

    let result;
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      result = JSON.parse(clean);
    } catch {
      result = { raw: rawText, parseError: true };
    }

    return res.json({ success: true, result });
  } catch (err) {
    console.error("analyzeSkillGap error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { analyzeCareerTask, analyzeSkillGap };
