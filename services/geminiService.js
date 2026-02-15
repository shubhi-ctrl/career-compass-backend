const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyDXHoElQd9KjpBN4GcPOEFlIzkjfq6Wtrg");

class GeminiService {
  
  async generateCareerInsights(userAnswers, recommendedCareers) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Analyze user's swipe patterns
      const rightSwipes = Object.entries(userAnswers).filter(([_, dir]) => dir === "right").length;
      const leftSwipes = Object.entries(userAnswers).filter(([_, dir]) => dir === "left").length;
      
      const careerNames = recommendedCareers.map(c => c.name).join(", ");
      
      const prompt = `You are a career counselor AI helping an Indian high school student (class 9-12). 

Based on their assessment:
- They showed interest in ${rightSwipes} out of 15 career aspects
- Top recommended careers: ${careerNames}

Generate a personalized, encouraging, and concise career insight (3-4 sentences) that:
1. Acknowledges their interests and strengths
2. Explains why these careers suit them
3. Gives one actionable next step

Keep it casual, motivating, and under 100 words. Use simple language suitable for teenagers.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return {
        insight: text,
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error("Gemini AI Error:", error);
      // Fallback insight
      return {
        insight: `Based on your responses, you show strong interest in ${recommendedCareers[0].name} and related fields! Your answers suggest you'd thrive in careers that combine your natural talents with real-world impact. Start by exploring courses and trying hands-on projects in these areas. You're on the right path! 🚀`,
        generatedAt: new Date().toISOString(),
        fallback: true
      };
    }
  }

  async generateCareerSummary(careerData) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `You are a career counselor for Indian students. Write a compelling, brief summary (2-3 sentences) about the career: ${careerData.name}.

Focus on:
- What makes this career exciting for young people
- Real-world impact they can make
- Growth opportunities in India

Keep it motivating, under 60 words, and use simple language.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text;
      
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return careerData.description;
    }
  }
}

module.exports = new GeminiService();
