const recommendationEngine = require("../services/recommendationEngine");
const geminiService = require("../services/geminiService");
const careers = require("../data/careers.json");

// Get assessment questions
exports.getQuestions = (req, res) => {
  try {
    // Return empty for now since frontend has its own questions
    res.json({
      success: true,
      message: "Questions are handled by frontend"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch questions"
    });
  }
};

// Submit assessment and get matched careers WITH AI INSIGHTS
exports.submitAssessment = async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid answers"
      });
    }

    // Get recommendations based on swipe answers
    const recommendations = recommendationEngine.getRecommendationsFromAnswers(answers);

    // Generate AI insights using Gemini
    const aiInsights = await geminiService.generateCareerInsights(answers, recommendations);

    res.json({
      success: true,
      recommendedCareers: recommendations,
      aiInsights: aiInsights, // NEW: Gemini-powered personalized insight!
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in submitAssessment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process assessment"
    });
  }
};

// Get career suggestions (legacy endpoint)
exports.getSuggestions = async (req, res) => {
  try {
    const { interest, subject, classLevel } = req.body;

    if (!interest || !subject || !classLevel) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: interest, subject, classLevel"
      });
    }

    const recommendations = recommendationEngine.getRecommendations({
      interest,
      subject,
      classLevel
    });

    res.json({
      success: true,
      recommendedCareers: recommendations
    });
  } catch (error) {
    console.error("Error in getSuggestions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate recommendations"
    });
  }
};

// Get all careers
exports.getAllCareers = (req, res) => {
  try {
    res.json({
      success: true,
      careers: careers,
      total: careers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch careers"
    });
  }
};

// Get single career by ID
exports.getCareerById = (req, res) => {
  try {
    const { id } = req.params;
    const career = careers.find(c => c.id === parseInt(id));

    if (!career) {
      return res.status(404).json({
        success: false,
        error: "Career not found"
      });
    }

    res.json({
      success: true,
      career: career
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch career"
    });
  }
};

// NEW: Get AI-enhanced career summary
exports.getCareerSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const career = careers.find(c => c.id === parseInt(id));

    if (!career) {
      return res.status(404).json({
        success: false,
        error: "Career not found"
      });
    }

    // Generate AI summary
    const aiSummary = await geminiService.generateCareerSummary(career);

    res.json({
      success: true,
      career: {
        ...career,
        aiSummary: aiSummary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to generate career summary"
    });
  }
};
