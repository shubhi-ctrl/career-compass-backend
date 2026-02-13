const recommendationEngine = require("../services/recommendationEngine");
const careers = require("../data/careers.json");

// Get career suggestions
exports.getSuggestions = async (req, res) => {
  try {
    const { interest, subject, classLevel } = req.body;

    // Validate input
    if (!interest || !subject || !classLevel) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: interest, subject, classLevel"
      });
    }

    // Get recommendations from our engine
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

// Get all careers (optional - for frontend dropdowns, etc.)
exports.getAllCareers = (req, res) => {
  try {
    res.json({
      success: true,
      careers: careers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch careers"
    });
  }
};