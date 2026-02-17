const careerAPIService = require("./careerAPIService");
const questions = require("../data/questions.json");

class RecommendationEngine {

  // NEW: Analyze swipe answers and match to 50 careers
  getRecommendationsFromAnswers(answers) {
    
    // Get all 50 careers from the new service
    const allCareers = careerAPIService.getCuratedCareerDatabase();

    // Calculate match score for EACH career
    const careerMatches = allCareers.map(career => {
      let matchScore = 65; // Base score

      // Go through each answered question
      Object.entries(answers).forEach(([questionId, answer]) => {
        if (answer === "right") {
          // Find the question in our 30-question database
          const question = questions.find(q => q.id === parseInt(questionId));
          
          if (question) {
            // Check if this career is in this question's matching careers
            if (question.matchesCareers && question.matchesCareers.includes(career.name)) {
              matchScore += question.weight * 2; // Add points for direct match
            }
            
            // Also check category-level matching
            if (this.categoryMatchesCareer(question.category, career.category)) {
              matchScore += question.weight; // Partial match
            }
          }
        }
      });

      return {
        ...career,
        matchScore: Math.min(Math.round(matchScore), 98)
      };
    });

    // Sort by match score and return top 5
    const topCareers = careerMatches
      .filter(c => c.matchScore > 68) // Only show meaningful matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    // If less than 5 results, fill with top careers anyway
    if (topCareers.length < 5) {
      const remaining = careerMatches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);
      return remaining;
    }

    return topCareers;
  }

  // Helper: Check if a question category matches a career category
  categoryMatchesCareer(questionCategory, careerCategory) {
    const categoryMap = {
      // Question category → Career category
      "technology": ["Technology"],
      "analytical": ["Technology", "Business", "Science"],
      "creative": ["Design", "Creative", "Media"],
      "social": ["Education", "Healthcare", "Hospitality"],
      "healthcare": ["Healthcare"],
      "entrepreneurial": ["Business"],
      "business": ["Business", "Banking"],
      "research": ["Science", "Technology"],
      "legal": ["Law", "Governance"],
      "media": ["Media", "Creative"],
      "sports": ["Sports"],
      "leadership": ["Business", "Governance"],
      "fashion": ["Fashion", "Design"],
      "culinary": ["Hospitality"],
      "psychology": ["Healthcare", "Education"],
      "technical": ["Engineering", "Technology"],
      "education": ["Education"],
      "security": ["Technology", "Law"],
      "ai": ["Technology"],
      "organization": ["Business", "Hospitality"],
      "finance": ["Business", "Banking"],
      "design": ["Design", "Architecture"],
      "aviation": ["Aviation"],
      "service": ["Hospitality", "Banking"],
      "marketing": ["Business", "Media"],
      "environmental": ["Science"],
      "practical": ["Engineering"],
      "performance": ["Media", "Education"]
    };

    const matchingCategories = categoryMap[questionCategory] || [];
    return matchingCategories.includes(careerCategory);
  }

  // EXISTING: Get recommendations based on interest/subject/class (keeping for backward compatibility)
  getRecommendations({ interest, subject, classLevel }) {
    const allCareers = careerAPIService.getCuratedCareerDatabase();
    
    // Map interest to career category
    const interestCategoryMap = {
      "technology": "Technology",
      "business": "Business",
      "design": "Design",
      "science": "Science",
      "arts": "Creative",
      "healthcare": "Healthcare",
      "engineering": "Engineering"
    };

    const targetCategory = interestCategoryMap[interest] || interest;
    
    let matchedCareers = allCareers.filter(career => 
      career.category.toLowerCase() === targetCategory.toLowerCase()
    );

    // If math subject, prioritize analytical careers
    if (subject === "mathematics") {
      matchedCareers = this.prioritizeMathCareers(matchedCareers);
    }

    return matchedCareers.map(career => ({
      ...career,
      matchScore: 80
    })).slice(0, 5);
  }

  prioritizeMathCareers(careerList) {
    const mathRelatedCareers = [
      "Software Engineer",
      "Data Scientist",
      "Financial Analyst",
      "AI/ML Engineer",
      "Research Scientist"
    ];

    const mathCareers = careerList.filter(c => mathRelatedCareers.includes(c.name));
    const otherCareers = careerList.filter(c => !mathRelatedCareers.includes(c.name));
    
    return [...mathCareers, ...otherCareers];
  }

  // Get career details by name (using new service)
  getCareerDetails(careerName) {
    const allCareers = careerAPIService.getCuratedCareerDatabase();
    return allCareers.find(c => c.name === careerName) || null;
  }
}

module.exports = new RecommendationEngine();
