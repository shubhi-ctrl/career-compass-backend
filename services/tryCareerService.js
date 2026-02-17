const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class TryCareerService {
  
  async validateUserWork(task, userSubmission, careerName) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `You are an expert career mentor evaluating a student's work.

Task Given: "${task.task}"
Career: ${careerName}
Student's Submission: "${userSubmission}"

Evaluate the student's work on a scale of 1-10 and provide:
1. Score (1-10)
2. What they did well (2-3 points)
3. Areas for improvement (2-3 points)
4. Encouraging next steps

Format your response as JSON:
{
  "score": 7,
  "strengths": ["point 1", "point 2"],
  "improvements": ["point 1", "point 2"],
  "nextSteps": "suggestion",
  "overall": "encouraging summary"
}

Be constructive, encouraging, and specific. Remember this is a high school student exploring careers.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback
      return {
        score: 7,
        strengths: ["Shows initiative", "Good effort"],
        improvements: ["Add more detail", "Practice more"],
        nextSteps: "Keep practicing!",
        overall: "Good start! Keep exploring this career path."
      };
      
    } catch (error) {
      console.error("Error validating work:", error);
      return {
        score: 7,
        strengths: ["Completed the task", "Shows interest"],
        improvements: ["Continue learning", "Practice regularly"],
        nextSteps: "Explore more resources on this topic",
        overall: "Great job exploring this career! Keep going!"
      };
    }
  }

  async generateCareerSummary(completedTasks, careerName) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const taskList = completedTasks.map(t => `- ${t.taskName}: Score ${t.score}/10`).join('\n');

      const prompt = `You are a career counselor reviewing a student's exploration of ${careerName}.

Completed Tasks:
${taskList}

Average Score: ${(completedTasks.reduce((sum, t) => sum + t.score, 0) / completedTasks.length).toFixed(1)}/10

Generate an encouraging 3-4 sentence summary that:
1. Celebrates their achievements
2. Identifies their strengths
3. Provides actionable next steps
4. Motivates them to continue
5. Gives them actual and real advice

Keep it positive, specific, and under 100 words.`;

      const result = await model.generateContent(prompt);
      return result.response.text();
      
    } catch (error) {
      return `Great work exploring ${careerName}! You've shown dedication by completing ${completedTasks.length} tasks. Your efforts demonstrate genuine interest in this field. Keep building on these experiences and exploring more opportunities to learn!`;
    }
  }
}

module.exports = new TryCareerService();
