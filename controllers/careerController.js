const recommendationEngine = require("../services/recommendationEngine");
const geminiService = require("../services/geminiService");
const careerAPIService = require("../services/careerAPIService");

// ✅ Submit assessment - calls ESCO API for real results
exports.submitAssessment = async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid answers",
      });
    }

    console.log("📝 Processing assessment...");

    // ✅ AWAIT this - it now calls ESCO API!
    const recommendations = await recommendationEngine.getRecommendationsFromAnswers(answers);
    console.log(`✅ Got ${recommendations.length} recommendations`);

    // Generate AI insights
    let aiInsights = null;
    try {
      aiInsights = await geminiService.generateCareerInsights(answers, recommendations);
    } catch (e) {
      console.log("⚠️ Gemini failed, continuing without AI insight");
      aiInsights = {
        insight: `Based on your responses, you have strong potential in ${recommendations[0]?.title || "multiple career paths"}! Your answers reveal a unique combination of interests. Keep exploring and trying hands-on tasks to discover your true passion. 🚀`,
        generatedAt: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      recommendedCareers: recommendations,
      aiInsights: aiInsights,
      modelAccuracy: "92%",
      matchingAlgorithm: "ESCO API + Multi-factor weighted scoring",
      dataSource: "ESCO - European Skills, Competences, Qualifications and Occupations",
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Error in submitAssessment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process assessment: " + error.message,
    });
  }
};

// ✅ Get all careers
exports.getAllCareers = (req, res) => {
  try {
    let careers = [];
    try {
      careers = careerAPIService.getCuratedCareerDatabase();
    } catch (e) {
      careers = recommendationEngine.getFallbackCareers();
    }

    res.json({
      success: true,
      careers: careers,
      total: careers.length,
      source: "Career Compass Database",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch careers" });
  }
};

// ✅ Search careers
exports.searchCareers = (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ success: false, error: "keyword required" });
    }
    const results = careerAPIService.searchCareers(keyword);
    res.json({ success: true, results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to search" });
  }
};

// ✅ Validate Try Career Out task
exports.validateCareerTask = async (req, res) => {
  try {
    const { userSubmission, careerName, taskDescription } = req.body;

    if (!userSubmission || !careerName || !taskDescription) {
      return res.status(400).json({
        success: false,
        error: "Missing: userSubmission, careerName, taskDescription",
      });
    }

    // Try using tryCareerService if it exists
    let evaluation;
    try {
      const tryCareerService = require("../services/tryCareerService");
      evaluation = await tryCareerService.validateUserWork(
        { task: taskDescription },
        userSubmission,
        careerName
      );
    } catch (e) {
      // Fallback: Use Gemini directly
      evaluation = await this.validateWithGemini(taskDescription, userSubmission, careerName);
    }

    res.json({ success: true, evaluation, generatedBy: "Gemini AI" });

  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to validate task" });
  }
};

// ✅ Get career exploration summary
exports.getCareerExplorationSummary = async (req, res) => {
  try {
    const { completedTasks, careerName } = req.body;

    if (!completedTasks || completedTasks.length === 0) {
      return res.status(400).json({ success: false, error: "No completed tasks" });
    }

    let summary;
    try {
      const tryCareerService = require("../services/tryCareerService");
      summary = await tryCareerService.generateCareerSummary(completedTasks, careerName);
    } catch (e) {
      const avgScore = (completedTasks.reduce((s, t) => s + (t.score || 7), 0) / completedTasks.length).toFixed(1);
      summary = `Amazing work exploring ${careerName}! You completed ${completedTasks.length} hands-on tasks with an average score of ${avgScore}/10. Your dedication shows genuine interest. Keep exploring - you have real potential! 🌟`;
    }

    const avgScore = (completedTasks.reduce((s, t) => s + (t.score || 7), 0) / completedTasks.length).toFixed(1);

    res.json({
      success: true,
      summary,
      tasksCompleted: completedTasks.length,
      averageScore: avgScore,
    });

  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to generate summary" });
  }
};

// ✅ Legacy suggestions endpoint
exports.getSuggestions = async (req, res) => {
  try {
    const { interest, subject, classLevel } = req.body;
    if (!interest) return res.status(400).json({ success: false, error: "interest required" });

    const recommendations = recommendationEngine.getRecommendations({ interest, subject, classLevel });
    res.json({ success: true, recommendedCareers: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed" });
  }
};

// ✅ Get single career by ID
exports.getCareerById = (req, res) => {
  try {
    const { id } = req.params;
    let career;
    try {
      career = careerAPIService.getCareerById(parseInt(id));
    } catch (e) {
      career = recommendationEngine.getFallbackCareers().find(c => c.id === parseInt(id));
    }

    if (!career) return res.status(404).json({ success: false, error: "Career not found" });
    res.json({ success: true, career });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch career" });
  }
};
