const careers = require("../data/careers.json");
const questions = require("../data/questions.json");

class RecommendationEngine {
  
  // NEW: Get recommendations based on assessment answers
  getRecommendationsFromAnswers(answers) {
    // Calculate category scores based on answers
    const categoryScores = {
      technology: 0,
      business: 0,
      design: 0,
      science: 0,
      arts: 0
    };

    // Process each answer
    Object.keys(answers).forEach((questionId) => {
      const answer = answers[questionId];
      const question = questions.find(q => q.id === parseInt(questionId));
      
      if (question && answer === "right") {
        // "right" swipe means they agree/like it
        categoryScores[question.category] += question.weight;
      }
    });

    // Find top categories
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    const topCategory = sortedCategories[0];

    // Get matching careers
    let matchedCareers = this.getCareersByInterest(topCategory);

    // Add match scores based on category alignment
    const detailedCareers = matchedCareers.map(careerName => {
      const career = this.getCareerDetails(careerName);
      if (career) {
        // Calculate match score based on category scores
        const baseScore = 70;
        const categoryBonus = categoryScores[topCategory] * 2;
        career.matchScore = Math.min(baseScore + categoryBonus, 98);
        return career;
      }
      return null;
    }).filter(c => c !== null);

    // Sort by match score and return top 5
    return detailedCareers
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
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
