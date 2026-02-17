const axios = require("axios");

class RecommendationEngine {

  constructor() {
    // ESCO API - FREE, no key needed!
    this.escoBaseURL = "https://ec.europa.eu/esco/api";
    this.language = "en";
  }

  // MAIN FUNCTION - called when user completes assessment
  async getRecommendationsFromAnswers(answers) {
    try {
      // Step 1: Figure out what the user likes based on their swipes
      const userInterests = this.analyzeAnswers(answers);
      console.log("🎯 User interests detected:", userInterests);

      // Step 2: Search ESCO for real occupations matching those interests
      const escoOccupations = await this.searchESCOOccupations(userInterests);
      console.log(`✅ ESCO returned ${escoOccupations.length} occupations`);

      // Step 3: If ESCO works, use it. Otherwise fallback to our database
      if (escoOccupations && escoOccupations.length > 0) {
        return this.formatESCOResults(escoOccupations, userInterests, answers);
      } else {
        console.log("⚠️ ESCO returned nothing, using fallback database");
        return this.getFallbackRecommendations(userInterests, answers);
      }

    } catch (error) {
      console.error("❌ ESCO error:", error.message);
      // ALWAYS fallback - never crash!
      const userInterests = this.analyzeAnswers(answers);
      return this.getFallbackRecommendations(userInterests, answers);
    }
  }

  // Analyze what the user swiped right on
  analyzeAnswers(answers) {
    // Map question IDs to interest keywords for ESCO search
    const questionInterestMap = {
      1:  { keyword: "software developer",      category: "technology",     weight: 3 },
      2:  { keyword: "graphic designer",         category: "creative",       weight: 3 },
      3:  { keyword: "social worker",            category: "social",         weight: 3 },
      4:  { keyword: "data analyst",             category: "analytical",     weight: 3 },
      5:  { keyword: "physician doctor",         category: "healthcare",     weight: 3 },
      6:  { keyword: "entrepreneur business",    category: "business",       weight: 3 },
      7:  { keyword: "research scientist",       category: "research",       weight: 3 },
      8:  { keyword: "lawyer legal",             category: "legal",          weight: 3 },
      9:  { keyword: "video editor media",       category: "media",          weight: 3 },
      10: { keyword: "sports coach fitness",     category: "sports",         weight: 2 },
      11: { keyword: "artificial intelligence",  category: "technology",     weight: 3 },
      12: { keyword: "financial analyst",        category: "finance",        weight: 3 },
      13: { keyword: "mechanical engineer",      category: "engineering",    weight: 3 },
      14: { keyword: "environmental scientist",  category: "environment",    weight: 2 },
      15: { keyword: "pilot aviation",           category: "aviation",       weight: 2 },
      16: { keyword: "teacher education",        category: "education",      weight: 3 },
      17: { keyword: "journalist presenter",     category: "media",          weight: 2 },
      18: { keyword: "fashion designer",         category: "creative",       weight: 2 },
      19: { keyword: "chef cook",                category: "hospitality",    weight: 2 },
      20: { keyword: "psychologist counselor",   category: "psychology",     weight: 3 },
      21: { keyword: "cybersecurity analyst",    category: "technology",     weight: 3 },
      22: { keyword: "marketing manager",        category: "business",       weight: 3 },
      23: { keyword: "civil service administrator", category: "governance",  weight: 2 },
      24: { keyword: "architect interior design", category: "design",        weight: 3 },
      25: { keyword: "artist creative",          category: "creative",       weight: 2 },
      26: { keyword: "pharmacist",               category: "healthcare",     weight: 3 },
      27: { keyword: "cloud computing engineer", category: "technology",     weight: 3 },
      28: { keyword: "journalist writer",        category: "media",          weight: 3 },
      29: { keyword: "event planner",            category: "hospitality",    weight: 2 },
      30: { keyword: "customer service",         category: "hospitality",    weight: 2 },
    };

    // Count scores per category and collect top keywords
    const categoryScores = {};
    const topKeywords = [];

    Object.entries(answers).forEach(([questionId, answer]) => {
      if (answer === "right") {
        const mapping = questionInterestMap[parseInt(questionId)];
        if (mapping) {
          // Add category score
          categoryScores[mapping.category] = (categoryScores[mapping.category] || 0) + mapping.weight;
          // Collect keyword
          topKeywords.push({ keyword: mapping.keyword, weight: mapping.weight });
        }
      }
    });

    // Sort categories by score
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Sort keywords by weight and take top 3 for ESCO search
    const topSearchKeywords = topKeywords
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(k => k.keyword);

    return {
      categories: sortedCategories,
      searchKeywords: topSearchKeywords,
      categoryScores: categoryScores,
      totalRightSwipes: Object.values(answers).filter(a => a === "right").length
    };
  }

  // Search ESCO API for real occupations
  async searchESCOOccupations(userInterests) {
    const results = [];

    // Search for each top keyword
    for (const keyword of userInterests.searchKeywords) {
      try {
        console.log(`🔍 Searching ESCO for: ${keyword}`);

        const response = await axios.get(`${this.escoBaseURL}/search`, {
          params: {
            text: keyword,
            language: this.language,
            type: "occupation",
            limit: 5,
          },
          timeout: 8000, // 8 second timeout
          headers: { "Accept": "application/json" }
        });

        if (
          response.data &&
          response.data._embedded &&
          response.data._embedded.results
        ) {
          const occupations = response.data._embedded.results;
          console.log(`✅ Found ${occupations.length} results for "${keyword}"`);

          // Get details for top 2 results per keyword
          for (const occ of occupations.slice(0, 2)) {
            if (!results.find(r => r.uri === occ.uri)) {
              results.push({
                uri: occ.uri,
                title: occ.title || occ.preferredLabel,
                description: occ.description?.en?.literal || occ.description || "A professional career path with strong growth potential.",
                searchedFor: keyword,
              });
            }
          }
        }
      } catch (err) {
        console.log(`⚠️ ESCO search failed for "${keyword}": ${err.message}`);
        // Continue with next keyword
      }
    }

    return results;
  }

  // Format ESCO results into our frontend format
  formatESCOResults(escoOccupations, userInterests, answers) {
    const totalSwipes = userInterests.totalRightSwipes || 1;
    const maxPossibleScore = 98;

    return escoOccupations.slice(0, 5).map((occ, index) => {
      // Calculate realistic match score
      const baseScore = 75;
      const rankBonus = (5 - index) * 4; // First result gets +20, second +16, etc
      const swipeBonus = Math.min(totalSwipes * 1.5, 15);
      const matchScore = Math.min(Math.round(baseScore + rankBonus + swipeBonus), maxPossibleScore);

      // Map ESCO data to our format
      return {
        id: index + 1,
        name: occ.title,
        title: occ.title,
        category: this.getCategoryFromKeyword(occ.searchedFor),
        description: this.cleanDescription(occ.description),
        matchScore: matchScore,
        skills: this.getSkillsForCareer(occ.title),
        education: this.getEducationForCareer(occ.title),
        salary: this.getSalaryForCareer(occ.title),
        stream: this.getStreamForCareer(occ.title),
        growthRate: "High",
        demandLevel: "High",
        source: "ESCO - European Skills, Competences, Qualifications and Occupations",
        escoUri: occ.uri,
        pros: ["Strong career growth", "High demand", "Good salary potential", "Meaningful work"],
        cons: ["Requires continuous learning", "Competitive field"],
        workEnvironment: "Office, Remote, Hybrid",
      };
    });
  }

  // Get category name from search keyword
  getCategoryFromKeyword(keyword) {
    if (!keyword) return "Professional";
    const k = keyword.toLowerCase();
    if (k.includes("software") || k.includes("developer") || k.includes("cloud") || k.includes("cyber") || k.includes("intelligence")) return "Technology";
    if (k.includes("doctor") || k.includes("physician") || k.includes("pharma") || k.includes("nurse")) return "Healthcare";
    if (k.includes("design") || k.includes("graphic") || k.includes("artist") || k.includes("fashion")) return "Creative";
    if (k.includes("business") || k.includes("marketing") || k.includes("financial") || k.includes("entrepreneur")) return "Business";
    if (k.includes("teacher") || k.includes("education")) return "Education";
    if (k.includes("engineer") || k.includes("mechanical")) return "Engineering";
    if (k.includes("media") || k.includes("journalist") || k.includes("video")) return "Media";
    if (k.includes("psychologist") || k.includes("counselor")) return "Healthcare";
    if (k.includes("science") || k.includes("research")) return "Science";
    if (k.includes("architect") || k.includes("interior")) return "Design";
    return "Professional";
  }

  // Clean description text
  cleanDescription(description) {
    if (!description) return "A professional career with strong growth potential in the current job market.";
    // Remove HTML tags if any
    const cleaned = description.replace(/<[^>]*>/g, "").trim();
    // Limit length
    return cleaned.length > 300 ? cleaned.substring(0, 300) + "..." : cleaned;
  }

  // === FALLBACK DATABASE - used when ESCO fails ===
  getFallbackRecommendations(userInterests, answers) {
    console.log("🔄 Using fallback career database...");

    const allCareers = this.getFallbackCareers();
    const topCategories = (userInterests.categories || []).map(c => c[0]);

    // Score each career
    const scoredCareers = allCareers.map(career => {
      let score = 65;

      // Category match bonus
      if (topCategories.length > 0 && career.category.toLowerCase() === topCategories[0].toLowerCase()) {
        score += 20;
      } else if (topCategories.length > 1 && career.category.toLowerCase() === topCategories[1].toLowerCase()) {
        score += 12;
      }

      // Swipe count bonus
      const rightSwipes = Object.values(answers || {}).filter(a => a === "right").length;
      score += Math.min(rightSwipes, 10);

      return { ...career, matchScore: Math.min(Math.round(score), 97) };
    });

    return scoredCareers
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  }

  // Skills helper
  getSkillsForCareer(title) {
    if (!title) return ["Problem Solving", "Communication", "Teamwork"];
    const t = title.toLowerCase();
    if (t.includes("software") || t.includes("developer")) return ["Programming", "Problem Solving", "Algorithms", "Databases"];
    if (t.includes("data")) return ["Python", "Statistics", "SQL", "Machine Learning"];
    if (t.includes("design")) return ["Figma", "Creativity", "User Research", "Prototyping"];
    if (t.includes("doctor") || t.includes("physician")) return ["Medical Knowledge", "Patient Care", "Diagnosis", "Empathy"];
    if (t.includes("market")) return ["Digital Marketing", "Analytics", "Branding", "SEO"];
    if (t.includes("teacher")) return ["Communication", "Subject Expertise", "Patience", "Planning"];
    if (t.includes("financial") || t.includes("finance")) return ["Financial Modeling", "Excel", "Analysis", "Accounting"];
    if (t.includes("psycho")) return ["Counseling", "Empathy", "Active Listening", "Assessment"];
    if (t.includes("engineer")) return ["Technical Skills", "Problem Solving", "CAD", "Mathematics"];
    return ["Critical Thinking", "Communication", "Leadership", "Problem Solving"];
  }

  // Education helper
  getEducationForCareer(title) {
    if (!title) return "Bachelor's degree in relevant field";
    const t = title.toLowerCase();
    if (t.includes("doctor") || t.includes("physician")) return "MBBS (5.5 years) + MD/MS";
    if (t.includes("lawyer") || t.includes("legal")) return "LLB (5 years integrated)";
    if (t.includes("architect")) return "B.Arch (5 years)";
    if (t.includes("software") || t.includes("developer") || t.includes("data") || t.includes("engineer")) return "B.Tech / B.E. in relevant field";
    if (t.includes("teacher")) return "Graduation + B.Ed";
    if (t.includes("pilot")) return "Commercial Pilot License (CPL)";
    if (t.includes("psycho")) return "M.A./M.Sc in Psychology";
    if (t.includes("design")) return "B.Des or relevant design degree";
    return "Bachelor's degree + relevant certifications";
  }

  // Salary helper
  getSalaryForCareer(title) {
    if (!title) return "₹4-15 LPA";
    const t = title.toLowerCase();
    if (t.includes("software") || t.includes("developer")) return "₹6-25 LPA";
    if (t.includes("data") || t.includes("ai") || t.includes("machine")) return "₹8-30 LPA";
    if (t.includes("doctor") || t.includes("physician")) return "₹8-50 LPA";
    if (t.includes("pilot")) return "₹10-80 LPA";
    if (t.includes("lawyer")) return "₹4-40 LPA";
    if (t.includes("financial")) return "₹5-20 LPA";
    if (t.includes("market")) return "₹5-22 LPA";
    if (t.includes("design")) return "₹4-18 LPA";
    if (t.includes("teacher")) return "₹3-12 LPA";
    if (t.includes("engineer")) return "₹4-18 LPA";
    return "₹4-15 LPA";
  }

  // Stream helper
  getStreamForCareer(title) {
    if (!title) return "Any stream";
    const t = title.toLowerCase();
    if (t.includes("software") || t.includes("engineer") || t.includes("data") || t.includes("ai")) return "Science (PCM)";
    if (t.includes("doctor") || t.includes("physician") || t.includes("pharma") || t.includes("nurse")) return "Science (PCB)";
    if (t.includes("financial") || t.includes("market") || t.includes("business")) return "Commerce";
    if (t.includes("lawyer") || t.includes("teacher") || t.includes("psycho")) return "Any stream";
    if (t.includes("design") || t.includes("artist") || t.includes("creative")) return "Any stream";
    return "Any stream";
  }

  // Fallback career database
  getFallbackCareers() {
    return [
      { id: 1, name: "Software Engineer", title: "Software Engineer", category: "technology", description: "Design and develop software applications and systems.", skills: ["Programming", "Problem Solving"], salary: "₹6-25 LPA", education: "B.Tech in Computer Science", stream: "Science (PCM)", pros: ["High demand", "Good salary"], cons: ["Requires continuous learning"], workEnvironment: "Office/Remote" },
      { id: 2, name: "Data Scientist", title: "Data Scientist", category: "analytical", description: "Analyze large datasets to extract insights using ML.", skills: ["Python", "Statistics", "ML"], salary: "₹8-30 LPA", education: "B.Tech/M.Sc in Data Science", stream: "Science (PCM)", pros: ["High demand", "Excellent pay"], cons: ["Complex field"], workEnvironment: "Office/Remote" },
      { id: 3, name: "UI/UX Designer", title: "UI/UX Designer", category: "creative", description: "Design user-friendly interfaces and experiences.", skills: ["Figma", "User Research", "Design"], salary: "₹4-18 LPA", education: "B.Des in Design", stream: "Any", pros: ["Creative work", "Good demand"], cons: ["Subjective field"], workEnvironment: "Office/Remote" },
      { id: 4, name: "Doctor", title: "Doctor (General Physician)", category: "healthcare", description: "Diagnose and treat illnesses, provide medical care.", skills: ["Medical Knowledge", "Empathy", "Diagnosis"], salary: "₹8-50 LPA", education: "MBBS + MD", stream: "Science (PCB)", pros: ["Highly respected", "Meaningful work"], cons: ["Long education"], workEnvironment: "Hospital/Clinic" },
      { id: 5, name: "Business Analyst", title: "Business Analyst", category: "business", description: "Bridge business needs with technology solutions.", skills: ["Analysis", "Communication", "SQL"], salary: "₹5-18 LPA", education: "BBA/B.Tech + MBA", stream: "Commerce/Any", pros: ["Versatile career", "Good pay"], cons: ["Stressful"], workEnvironment: "Office" },
      { id: 6, name: "Marketing Manager", title: "Marketing Manager", category: "business", description: "Develop marketing strategies to promote brands.", skills: ["Digital Marketing", "Analytics", "Branding"], salary: "₹6-22 LPA", education: "BBA/MBA in Marketing", stream: "Commerce/Any", pros: ["Creative + analytical", "Good growth"], cons: ["Target pressure"], workEnvironment: "Office" },
      { id: 7, name: "Financial Analyst", title: "Financial Analyst", category: "finance", description: "Analyze financial data and guide investment decisions.", skills: ["Finance", "Excel", "Analysis"], salary: "₹5-20 LPA", education: "B.Com/BBA + MBA Finance", stream: "Commerce", pros: ["High earning potential", "Stable"], cons: ["High pressure"], workEnvironment: "Office" },
      { id: 8, name: "Cybersecurity Analyst", title: "Cybersecurity Analyst", category: "technology", description: "Protect systems from cyber threats and security breaches.", skills: ["Ethical Hacking", "Network Security", "Risk Assessment"], salary: "₹6-20 LPA", education: "B.Tech in CS/Cybersecurity", stream: "Science (PCM)", pros: ["Very high demand", "Exciting work"], cons: ["Always learning new threats"], workEnvironment: "Office/Remote" },
      { id: 9, name: "Psychologist", title: "Psychologist", category: "psychology", description: "Assess and treat mental health conditions through therapy.", skills: ["Counseling", "Empathy", "Assessment"], salary: "₹4-15 LPA", education: "M.A./M.Sc Psychology", stream: "Arts/Science", pros: ["Meaningful work", "Growing demand"], cons: ["Emotionally demanding"], workEnvironment: "Clinic/Hospital" },
      { id: 10, name: "Research Scientist", title: "Research Scientist", category: "research", description: "Conduct experiments and research to advance knowledge.", skills: ["Research", "Lab Skills", "Data Analysis"], salary: "₹5-25 LPA", education: "M.Sc/PhD in relevant field", stream: "Science", pros: ["Intellectually stimulating", "Important work"], cons: ["Long path to senior roles"], workEnvironment: "Lab/University" },
      { id: 11, name: "Mechanical Engineer", title: "Mechanical Engineer", category: "engineering", description: "Design and develop mechanical systems and machines.", skills: ["CAD", "Mechanics", "Problem Solving"], salary: "₹4-15 LPA", education: "B.Tech in Mechanical Engineering", stream: "Science (PCM)", pros: ["Diverse industries", "Stable"], cons: ["Lower starting salary"], workEnvironment: "Factory/Office" },
      { id: 12, name: "Content Writer", title: "Content Writer", category: "media", description: "Create engaging written content for digital platforms.", skills: ["Writing", "SEO", "Research", "Creativity"], salary: "₹3-10 LPA", education: "Any degree (English/Journalism preferred)", stream: "Any", pros: ["Flexible work", "Creative"], cons: ["Competitive field"], workEnvironment: "Remote/Office" },
      { id: 13, name: "Graphic Designer", title: "Graphic Designer", category: "creative", description: "Create visual content for brands and digital media.", skills: ["Adobe Suite", "Typography", "Branding"], salary: "₹3-12 LPA", education: "B.Des in Graphic Design", stream: "Any", pros: ["Creative work", "Freelance option"], cons: ["Variable income if freelance"], workEnvironment: "Studio/Remote" },
      { id: 14, name: "Teacher", title: "Teacher (High School)", category: "education", description: "Educate and mentor students in specific subjects.", skills: ["Communication", "Subject Expertise", "Patience"], salary: "₹3-10 LPA", education: "Graduation + B.Ed", stream: "Any", pros: ["Job security", "Holidays"], cons: ["Lower pay vs private sector"], workEnvironment: "School" },
      { id: 15, name: "Entrepreneur", title: "Entrepreneur", category: "business", description: "Start and build your own business from the ground up.", skills: ["Leadership", "Risk-taking", "Innovation", "Networking"], salary: "₹0-100+ LPA (variable)", education: "Any degree or self-taught", stream: "Any", pros: ["Independence", "Unlimited earning"], cons: ["High risk", "Unstable income"], workEnvironment: "Anywhere" },
    ];
  }

  // Legacy function for backward compatibility
  getRecommendations({ interest, subject, classLevel }) {
    const allCareers = this.getFallbackCareers();
    const interestMap = {
      technology: "technology",
      business: "business",
      design: "creative",
      science: "research",
      arts: "media",
      healthcare: "healthcare",
    };
    const category = interestMap[interest] || "technology";
    return allCareers
      .filter(c => c.category === category)
      .map(c => ({ ...c, matchScore: 80 }))
      .slice(0, 5);
  }
}

module.exports = new RecommendationEngine();
