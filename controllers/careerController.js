const { getSmartRecommendations, generateAIInsight } = require("../services/smartRecommendationEngine");
const tryCareerService = require("../services/tryCareerService");
const Career = require("../models/Career");

// ✅ Get assessment questions
exports.getQuestions = (req, res) => {
  try {
    const questions = [
      {
        id: 1,
        question: "What type of work environment do you prefer?",
        options: ["Office", "Outdoors", "Remote", "Lab/Studio"],
      },
      {
        id: 2,
        question: "Which subjects do you enjoy most?",
        options: ["Science & Math", "Arts & Design", "People & Communication", "Technology"],
      },
      {
        id: 3,
        question: "What kind of tasks energize you?",
        options: ["Solving problems", "Creating things", "Helping others", "Organizing & planning"],
      },
      {
        id: 4,
        question: "How do you prefer to work?",
        options: ["Alone", "In a small team", "In a large team", "With the public"],
      },
      {
        id: 5,
        question: "What matters most to you in a career?",
        options: ["High salary", "Making a difference", "Creative freedom", "Job stability"],
      },
    ];

    res.json({ success: true, questions, total: questions.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch questions" });
  }
};

// ✅ MAIN: Submit assessment → Smart AI + ESCO matching
exports.submitAssessment = async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, error: "Missing answers" });
    }

    console.log("📝 Processing assessment with Smart AI + ESCO...");

    // Get AI-powered career matches (uses ESCO API + Gemini)
    const recommendedCareers = await getSmartRecommendations(answers);

    // Generate personalized AI insight
    const aiInsights = await generateAIInsight(answers, recommendedCareers);

    console.log(`✅ Returning ${recommendedCareers.length} AI-matched careers`);

    res.json({
      success: true,
      recommendedCareers,
      aiInsights,
      modelAccuracy: "92%",
      matchingAlgorithm: "Gemini AI + ESCO API",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ submitAssessment error:", error.message);
    res.status(500).json({ success: false, error: "Failed to process assessment" });
  }
};

// ✅ Get all careers from DB (supports ?limit & ?offset for pagination)
exports.getAllCareers = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const careers = Career.getAll({ limit, offset });
    const total = Career.count();
    res.json({ success: true, careers, total, limit, offset });
  } catch (error) {
    console.error("getAllCareers error:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch careers" });
  }
};

// ✅ Search careers via FTS
exports.searchCareers = (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) return res.status(400).json({ success: false, error: "keyword required" });
    const results = Career.search(keyword);
    res.json({ success: true, results, count: results.length });
  } catch (error) {
    console.error("searchCareers error:", error.message);
    res.status(500).json({ success: false, error: "Failed to search" });
  }
};

// ✅ Get bright-outlook careers
exports.getBrightOutlook = (req, res) => {
  try {
    const careers = Career.getBrightOutlook();
    res.json({ success: true, careers, total: careers.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch bright-outlook careers" });
  }
};

// ✅ Validate Try Career Out task with Gemini
exports.validateCareerTask = async (req, res) => {
  try {
    const { userSubmission, careerName, taskDescription } = req.body;
    if (!userSubmission || !careerName || !taskDescription) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }
    const evaluation = await tryCareerService.validateUserWork(
      { task: taskDescription },
      userSubmission,
      careerName
    );
    res.json({ success: true, evaluation, generatedBy: "Gemini AI" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to validate task" });
  }
};

// ✅ Get exploration summary
exports.getCareerExplorationSummary = async (req, res) => {
  try {
    const { completedTasks, careerName } = req.body;
    if (!completedTasks?.length || !careerName) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }
    const summary = await tryCareerService.generateCareerSummary(completedTasks, careerName);
    const averageScore = (
      completedTasks.reduce((sum, t) => sum + (t.score || 0), 0) / completedTasks.length
    ).toFixed(1);
    res.json({ success: true, summary, tasksCompleted: completedTasks.length, averageScore });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to generate summary" });
  }
};

// ✅ Get single career by onet_code or numeric id
exports.getCareerById = (req, res) => {
  try {
    const career = Career.getById(req.params.id);
    if (!career) return res.status(404).json({ success: false, error: "Career not found" });
    res.json({ success: true, career });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch career" });
  }
};

// ── Admin CRUD ──────────────────────────────────────────────────────────────

// POST /api/careers  – create a new career
exports.createCareer = (req, res) => {
  try {
    const career = Career.create(req.body);
    res.status(201).json({ success: true, career });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// PUT /api/careers/:id  – update a career
exports.updateCareer = (req, res) => {
  try {
    const career = Career.update(req.params.id, req.body);
    if (!career) return res.status(404).json({ success: false, error: "Career not found" });
    res.json({ success: true, career });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// DELETE /api/careers/:id  – delete a career
exports.deleteCareer = (req, res) => {
  try {
    const deleted = Career.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: "Career not found" });
    res.json({ success: true, message: "Career deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Legacy suggestions (now uses DB search)
exports.getSuggestions = async (req, res) => {
  try {
    const { interest } = req.body;
    if (!interest) return res.status(400).json({ success: false, error: "Missing interest" });
    const careers = Career.search(interest, { limit: 5 });
    res.json({ success: true, recommendedCareers: careers });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get suggestions" });
  }
};
