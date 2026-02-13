const careers = require("../data/careers.json");

class RecommendationEngine {
  
  getRecommendations({ interest, subject, classLevel }) {
    let matchedCareers = [];

    // Rule-based matching based on interest
    if (interest === "technology") {
      matchedCareers = [
        "Software Engineer",
        "Data Analyst",
        "AI Engineer",
        "Cybersecurity Specialist"
      ];
    } else if (interest === "business") {
      matchedCareers = [
        "Entrepreneur",
        "Business Analyst",
        "Marketing Manager",
        "Financial Analyst"
      ];
    } else if (interest === "design") {
      matchedCareers = [
        "UI/UX Designer",
        "Graphic Designer",
        "Animator",
        "Product Designer"
      ];
    } else if (interest === "science") {
      matchedCareers = [
        "Research Scientist",
        "Doctor",
        "Biotechnologist",
        "Environmental Scientist"
      ];
    } else if (interest === "arts") {
      matchedCareers = [
        "Content Writer",
        "Journalist",
        "Artist",
        "Musician"
      ];
    } else {
      // Default fallback
      matchedCareers = ["Career Counseling Recommended"];
    }

    // Filter based on subject preference (optional refinement)
    if (subject === "mathematics") {
      matchedCareers = this.prioritizeMathCareers(matchedCareers);
    }

    // Get detailed career info from our database
    const detailedCareers = matchedCareers.map(careerName => {
      return this.getCareerDetails(careerName);
    }).filter(career => career !== null); // Remove any null results

    return detailedCareers;
  }

  prioritizeMathCareers(careerList) {
    const mathRelatedCareers = [
      "Software Engineer", 
      "Data Analyst", 
      "Financial Analyst",
      "AI Engineer"
    ];
    
    // Put math-related careers first
    return careerList.filter(c => 
      mathRelatedCareers.includes(c)
    ).concat(
      careerList.filter(c => !mathRelatedCareers.includes(c))
    );
  }

  getCareerDetails(careerName) {
    // Find career in our database
    const careerData = careers.find(c => c.name === careerName);
    
    if (careerData) {
      return careerData;
    }

    // If not found, return null
    return null;
  }
}

module.exports = new RecommendationEngine();