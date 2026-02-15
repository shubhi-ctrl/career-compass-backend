const careers = require("../data/careers.json");

class RecommendationEngine {
  
  // Analyze swipe assessment answers and match to careers
  getRecommendationsFromAnswers(answers) {
    // Map your actual swipe assessment categories to interests
    const categoryMapping = {
      tech: "technology",
      creative: "design",
      social: "business",
      analytical: "technology",
      impact: "science",
      entrepreneurial: "business",
      healthcare: "science",
      dynamic: "business",
      ambitious: "business"
    };

    const categoryScores = {
      technology: 0,
      business: 0,
      design: 0,
      science: 0,
      arts: 0
    };

    // Count swipes by category from your frontend questions
    Object.entries(answers).forEach(([questionId, swipeDirection]) => {
      // Find the question to get its category
      const questionData = this.getQuestionCategory(parseInt(questionId));
      
      if (questionData && swipeDirection === "right") {
        const mappedCategory = categoryMapping[questionData] || questionData;
        if (categoryScores[mappedCategory] !== undefined) {
          categoryScores[mappedCategory] += 3;
        }
      }
    });

    // Find top 2 categories
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    const topCategory = sortedCategories[0][0];
    const secondCategory = sortedCategories[1] ? sortedCategories[1][0] : null;

    // Get matching careers
    let matchedCareers = this.getCareersByInterest(topCategory);
    
    // Add some from second category for variety
    if (secondCategory) {
      const secondaryCareers = this.getCareersByInterest(secondCategory).slice(0, 2);
      matchedCareers = [...matchedCareers, ...secondaryCareers];
    }

    // Get detailed career info with match scores
    const detailedCareers = matchedCareers.map(careerName => {
      const career = this.getCareerDetails(careerName);
      if (career) {
        // Calculate match score
        const baseScore = 75;
        const topBonus = categoryScores[topCategory] || 0;
        const secondBonus = secondCategory ? (categoryScores[secondCategory] || 0) * 0.5 : 0;
        career.matchScore = Math.min(baseScore + topBonus + secondBonus, 98);
        return career;
      }
      return null;
    }).filter(c => c !== null);

    // Remove duplicates and sort by match score
    const uniqueCareers = Array.from(
      new Map(detailedCareers.map(c => [c.name, c])).values()
    );

    return uniqueCareers
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  }

  // Helper to map question IDs to categories (based on your swipe-assessment.tsx)
  getQuestionCategory(questionId) {
    const questionMap = {
      1: "tech", 2: "creative", 3: "social", 4: "tech",
      5: "creative", 6: "creative", 7: "analytical", 8: "social",
      9: "impact", 10: "entrepreneurial", 11: "analytical", 12: "creative",
      13: "healthcare", 14: "dynamic", 15: "ambitious"
    };
    return questionMap[questionId];
  }

  // EXISTING: Get recommendations based on interest/subject/class
  getRecommendations({ interest, subject, classLevel }) {
    let matchedCareers = this.getCareersByInterest(interest);

    // Filter based on subject preference
    if (subject === "mathematics") {
      matchedCareers = this.prioritizeMathCareers(matchedCareers);
    }

    // Get detailed career info
    const detailedCareers = matchedCareers.map(careerName => {
      return this.getCareerDetails(careerName);
    }).filter(career => career !== null);

    return detailedCareers;
  }

  getCareersByInterest(interest) {
    if (interest === "technology") {
      return [
        "Software Engineer",
        "Data Analyst",
        "AI Engineer",
        "Cybersecurity Specialist"
      ];
    } else if (interest === "business") {
      return [
        "Entrepreneur",
        "Business Analyst",
        "Marketing Manager",
        "Financial Analyst"
      ];
    } else if (interest === "design") {
      return [
        "UI/UX Designer",
        "Graphic Designer",
        "Animator",
        "Product Designer"
      ];
    } else if (interest === "science") {
      return [
        "Research Scientist",
        "Doctor",
        "Biotechnologist",
        "Environmental Scientist"
      ];
    } else if (interest === "arts") {
      return [
        "Content Writer",
        "Journalist",
        "Artist",
        "Musician"
      ];
    } else {
      return ["Career Counseling Recommended"];
    }
  }

  prioritizeMathCareers(careerList) {
    const mathRelatedCareers = [
      "Software Engineer", 
      "Data Analyst", 
      "Financial Analyst",
      "AI Engineer"
    ];
    
    return careerList.filter(c => 
      mathRelatedCareers.includes(c)
    ).concat(
      careerList.filter(c => !mathRelatedCareers.includes(c))
    );
  }

  getCareerDetails(careerName) {
    const careerData = careers.find(c => c.name === careerName);
    
    if (careerData) {
      return careerData;
    }

    return null;
  }
}

module.exports = new RecommendationEngine();
