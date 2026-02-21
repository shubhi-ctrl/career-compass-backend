const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================================
// ESCO API - fetch real careers based on skills/interests
// ============================================================
async function fetchESCOCareers(searchTerms) {
  const results = [];
  for (const term of searchTerms.slice(0, 3)) {
    try {
      const response = await axios.get("https://ec.europa.eu/esco/api/search", {
        params: {
          text: term,
          type: "occupation",
          language: "en",
          limit: 5,
        },
        timeout: 5000,
      });
      if (response.data?._embedded?.results) {
        results.push(...response.data._embedded.results);
      }
    } catch (e) {
      console.log(`ESCO fetch failed for "${term}":`, e.message);
    }
  }
  return results;
}

// ============================================================
// MAIN: Gemini analyses answers → picks search terms → ESCO gives careers → Gemini scores them
// ============================================================
async function getSmartRecommendations(answers) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // STEP 1: Turn raw answers into interest keywords using Gemini
  const questionTexts = {
    1: "enjoys solving problems using computers and coding",
    2: "likes creating visual designs and artwork",
    3: "enjoys helping people and working in teams",
    4: "fascinated by data, numbers and patterns",
    5: "interested in medicine and helping sick people",
    6: "dreams of starting their own business",
    7: "enjoys conducting experiments and research",
    8: "interested in laws, justice and rights",
    9: "enjoys creating videos, films or media content",
    10: "passionate about fitness and sports",
    11: "excited by Artificial Intelligence and Machine Learning",
    12: "likes analyzing markets and financial trends",
    13: "likes building things like machines or structures",
    14: "cares deeply about protecting the environment",
    15: "dreams of flying planes or working in aviation",
    16: "enjoys teaching and helping others learn",
    17: "enjoys performing or presenting in front of people",
    18: "passionate about fashion and style",
    19: "loves cooking and creating new dishes",
    20: "curious about how people think and behave",
    21: "interested in cybersecurity and protecting systems",
    22: "enjoys marketing products and creating campaigns",
    23: "wants to serve the country through government service",
    24: "enjoys designing buildings and interior spaces",
    25: "artistic and enjoys creative expression",
    26: "interested in medicines and pharmacy",
    27: "enjoys working with cloud computing and networks",
    28: "likes writing articles and reporting news",
    29: "enjoys planning and organizing events",
    30: "enjoys customer service and hospitality work",
  };

  // Build list of what user liked
  const likedThings = Object.entries(answers)
    .filter(([_, v]) => v === "right")
    .map(([id]) => questionTexts[parseInt(id)])
    .filter(Boolean);

  if (likedThings.length === 0) {
    return getFallbackCareers();
  }

  // STEP 2: Ask Gemini for ESCO search terms
  let searchTerms = [];
  try {
    const termPrompt = `A student said they like: ${likedThings.join(", ")}.

Give me 3 short job title keywords to search for careers matching their interests.
Reply ONLY with a JSON array of 3 strings. Example: ["software developer", "data analyst", "teacher"]
No explanation, just the JSON array.`;

    const termResult = await model.generateContent(termPrompt);
    const termText = termResult.response.text().trim();
    const jsonMatch = termText.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      searchTerms = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.log("Gemini term generation failed:", e.message);
    searchTerms = likedThings.slice(0, 3).map((t) => t.split(" ").slice(-2).join(" "));
  }

  console.log("🔍 Searching ESCO for:", searchTerms);

  // STEP 3: Fetch from ESCO API
  let escoResults = await fetchESCOCareers(searchTerms);
  console.log(`✅ ESCO returned ${escoResults.length} results`);

  // STEP 4: If ESCO fails/returns nothing, use our 50-career database
  let careersToScore = [];
  if (escoResults.length > 0) {
    careersToScore = escoResults.slice(0, 15).map((r) => ({
      name: r.preferredLabel || r.title,
      description: r.description?.en?.literal || r.preferredLabel,
      uri: r.uri,
      source: "ESCO API",
    }));
  } else {
    console.log("⚠️ ESCO returned nothing, using internal database");
    careersToScore = getInternalCareers().slice(0, 15);
  }

  // STEP 5: Ask Gemini to score and pick top 5
  let finalCareers = [];
  try {
    const scorePrompt = `A student likes: ${likedThings.join(", ")}.

Here are some career options:
${careersToScore.map((c, i) => `${i + 1}. ${c.name}: ${c.description?.substring(0, 100) || c.name}`).join("\n")}

Pick the TOP 5 most suitable careers for this student and give each a match percentage.
Reply ONLY with a JSON array like this (no extra text):
[
  {"rank": 1, "name": "Career Name", "matchScore": 94, "whyMatch": "one sentence reason"},
  {"rank": 2, "name": "Career Name", "matchScore": 88, "whyMatch": "one sentence reason"},
  {"rank": 3, "name": "Career Name", "matchScore": 82, "whyMatch": "one sentence reason"},
  {"rank": 4, "name": "Career Name", "matchScore": 76, "whyMatch": "one sentence reason"},
  {"rank": 5, "name": "Career Name", "matchScore": 71, "whyMatch": "one sentence reason"}
]`;

    const scoreResult = await model.generateContent(scorePrompt);
    const scoreText = scoreResult.response.text().trim();
    const jsonMatch = scoreText.match(/\[[\s\S]*?\]/);

    if (jsonMatch) {
      const scored = JSON.parse(jsonMatch[0]);

      // Merge Gemini scores with career details
      finalCareers = scored.map((item) => {
        const careerData =
          careersToScore.find(
            (c) => c.name?.toLowerCase() === item.name?.toLowerCase()
          ) || {};

        const internalData = getInternalCareerByName(item.name);

        return {
          id: item.rank,
          name: item.name,
          title: item.name,
          matchScore: item.matchScore,
          whyMatch: item.whyMatch,
          description:
            careerData.description ||
            internalData?.description ||
            `${item.name} professionals ${item.whyMatch}`,
          salary: internalData?.salary || "₹4-20 LPA",
          skills: internalData?.skills || ["Communication", "Problem Solving", "Domain Knowledge"],
          education: internalData?.education || "Relevant degree in the field",
          stream: internalData?.stream || "Based on your interests",
          growthRate: internalData?.growthRate || "Growing",
          category: internalData?.category || "Professional",
          source: careerData.source || "AI Matched",
        };
      });
    }
  } catch (e) {
    console.log("Gemini scoring failed:", e.message);
  }

  // If Gemini scoring failed too, return enriched internal matches
  if (finalCareers.length === 0) {
    console.log("⚠️ Using fallback internal matching");
    finalCareers = getSmartInternalMatch(likedThings);
  }

  return finalCareers.slice(0, 5);
}

// ============================================================
// AI INSIGHT - personalized message
// ============================================================
async function generateAIInsight(answers, careers) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const topCareers = careers.slice(0, 3).map((c) => c.name).join(", ");
    const rightCount = Object.values(answers).filter((v) => v === "right").length;

    const prompt = `You are a friendly career counselor for Indian high school students.

A student answered ${rightCount} out of 30 career interest questions.
Their top career matches are: ${topCareers}.

Write a 3-4 sentence personalized, encouraging insight. Be specific about their interests.
Keep it under 80 words. Use simple language. End with 🚀`;

    const result = await model.generateContent(prompt);
    return {
      insight: result.response.text().trim(),
      generatedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      insight: `Based on your responses, you show strong potential in ${careers[0]?.name || "your chosen field"}! Your unique combination of interests points to exciting career opportunities. Start exploring these paths and trust your instincts - you're on the right track! 🚀`,
      generatedAt: new Date().toISOString(),
    };
  }
}

// ============================================================
// INTERNAL 50-CAREER DATABASE (fallback)
// ============================================================
function getInternalCareers() {
  return [
    { name: "Software Engineer", category: "Technology", description: "Design and build software applications", salary: "₹6-25 LPA", skills: ["Programming", "Problem Solving", "Algorithms"], education: "B.Tech Computer Science", stream: "Science (PCM)", growthRate: "Very High" },
    { name: "Data Scientist", category: "Technology", description: "Analyze data to extract insights using ML", salary: "₹8-30 LPA", skills: ["Python", "Statistics", "Machine Learning"], education: "B.Tech/M.Sc Data Science", stream: "Science (PCM)", growthRate: "Very High" },
    { name: "AI/ML Engineer", category: "Technology", description: "Build artificial intelligence systems", salary: "₹10-35 LPA", skills: ["Deep Learning", "Python", "TensorFlow"], education: "B.Tech Computer Science", stream: "Science (PCM)", growthRate: "Extremely High" },
    { name: "Cybersecurity Analyst", category: "Technology", description: "Protect systems from cyber threats", salary: "₹6-20 LPA", skills: ["Network Security", "Ethical Hacking"], education: "B.Tech Cybersecurity", stream: "Science (PCM)", growthRate: "Very High" },
    { name: "UI/UX Designer", category: "Design", description: "Design user interfaces and experiences", salary: "₹4-15 LPA", skills: ["Figma", "User Research", "Prototyping"], education: "B.Des Design", stream: "Any", growthRate: "High" },
    { name: "Graphic Designer", category: "Design", description: "Create visual content for brands", salary: "₹3-12 LPA", skills: ["Adobe Suite", "Typography", "Creativity"], education: "B.Des Graphic Design", stream: "Any", growthRate: "Medium" },
    { name: "Doctor", category: "Healthcare", description: "Diagnose and treat patients", salary: "₹8-50 LPA", skills: ["Medical Knowledge", "Empathy", "Diagnosis"], education: "MBBS + MD", stream: "Science (PCB)", growthRate: "Stable" },
    { name: "Nurse", category: "Healthcare", description: "Provide direct patient care", salary: "₹3-12 LPA", skills: ["Patient Care", "Medical Procedures", "Empathy"], education: "B.Sc Nursing", stream: "Science (PCB)", growthRate: "High" },
    { name: "Pharmacist", category: "Healthcare", description: "Dispense medications and advise patients", salary: "₹3-10 LPA", skills: ["Pharmacology", "Patient Counseling"], education: "B.Pharm", stream: "Science (PCB)", growthRate: "Medium" },
    { name: "Psychologist", category: "Healthcare", description: "Assess and treat mental health", salary: "₹4-15 LPA", skills: ["Counseling", "Empathy", "Assessment"], education: "M.A. Psychology", stream: "Arts/Science", growthRate: "High" },
    { name: "Entrepreneur", category: "Business", description: "Start and grow your own business", salary: "₹0-50+ LPA", skills: ["Leadership", "Risk-taking", "Innovation"], education: "Any (MBA helpful)", stream: "Any", growthRate: "Variable" },
    { name: "Business Analyst", category: "Business", description: "Bridge business needs and technology", salary: "₹5-18 LPA", skills: ["Analysis", "SQL", "Communication"], education: "BBA/B.Tech + MBA", stream: "Any", growthRate: "High" },
    { name: "Marketing Manager", category: "Business", description: "Create and execute marketing strategies", salary: "₹6-22 LPA", skills: ["Digital Marketing", "Brand Strategy", "Analytics"], education: "BBA/MBA Marketing", stream: "Commerce/Any", growthRate: "Medium" },
    { name: "Financial Analyst", category: "Business", description: "Analyze financial data and guide decisions", salary: "₹4-15 LPA", skills: ["Financial Modeling", "Excel", "Analysis"], education: "B.Com/BBA Finance", stream: "Commerce", growthRate: "Medium" },
    { name: "Product Manager", category: "Business", description: "Lead product from idea to launch", salary: "₹8-30 LPA", skills: ["Strategy", "Agile", "Leadership"], education: "B.Tech/BBA + MBA", stream: "Any", growthRate: "Very High" },
    { name: "Content Writer", category: "Creative", description: "Create written content for digital platforms", salary: "₹3-10 LPA", skills: ["Writing", "SEO", "Research"], education: "BA English/Journalism", stream: "Any", growthRate: "Medium" },
    { name: "Video Editor", category: "Creative", description: "Edit video for social media and films", salary: "₹3-15 LPA", skills: ["Premiere Pro", "Storytelling", "Color Grading"], education: "Diploma Film/Media", stream: "Any", growthRate: "High" },
    { name: "Journalist", category: "Media", description: "Research and report news stories", salary: "₹3-15 LPA", skills: ["Writing", "Research", "Interviewing"], education: "BA/MA Journalism", stream: "Arts", growthRate: "Medium" },
    { name: "Social Media Manager", category: "Media", description: "Manage brand social media presence", salary: "₹4-18 LPA", skills: ["Content Creation", "Analytics", "Strategy"], education: "Any degree", stream: "Any", growthRate: "Very High" },
    { name: "Teacher", category: "Education", description: "Educate and mentor students", salary: "₹3-10 LPA", skills: ["Subject Expertise", "Communication", "Patience"], education: "B.Ed after graduation", stream: "Any", growthRate: "Stable" },
    { name: "Civil Engineer", category: "Engineering", description: "Design and build infrastructure", salary: "₹3-12 LPA", skills: ["AutoCAD", "Structural Analysis", "Project Management"], education: "B.Tech Civil", stream: "Science (PCM)", growthRate: "Medium" },
    { name: "Mechanical Engineer", category: "Engineering", description: "Design mechanical systems and machines", salary: "₹4-15 LPA", skills: ["CAD", "Thermodynamics", "Manufacturing"], education: "B.Tech Mechanical", stream: "Science (PCM)", growthRate: "Medium" },
    { name: "Architect", category: "Architecture", description: "Design buildings and spaces", salary: "₹4-20 LPA", skills: ["AutoCAD", "3D Modeling", "Design Thinking"], education: "B.Arch (5 years)", stream: "Science + Creative", growthRate: "Medium" },
    { name: "Interior Designer", category: "Architecture", description: "Design functional interior spaces", salary: "₹3-15 LPA", skills: ["Space Planning", "3D Visualization", "Creativity"], education: "B.Des Interior Design", stream: "Any", growthRate: "High" },
    { name: "Lawyer", category: "Law", description: "Represent clients and provide legal advice", salary: "₹4-50 LPA", skills: ["Legal Research", "Argumentation", "Ethics"], education: "LLB (5 years)", stream: "Any", growthRate: "Medium" },
    { name: "Research Scientist", category: "Science", description: "Conduct experiments to advance knowledge", salary: "₹5-25 LPA", skills: ["Scientific Method", "Lab Skills", "Analysis"], education: "M.Sc/PhD", stream: "Science", growthRate: "Medium" },
    { name: "Environmental Scientist", category: "Science", description: "Study and protect the environment", salary: "₹3-12 LPA", skills: ["Environmental Analysis", "GIS", "Field Research"], education: "B.Sc Environmental Science", stream: "Science (PCB/PCM)", growthRate: "High" },
    { name: "Pilot", category: "Aviation", description: "Fly aircraft for passenger transport", salary: "₹10-80 LPA", skills: ["Flying", "Navigation", "Decision Making"], education: "Commercial Pilot License", stream: "Science (PCM)", growthRate: "Medium" },
    { name: "Fashion Designer", category: "Fashion", description: "Create clothing and accessory designs", salary: "₹3-20 LPA", skills: ["Design", "Sketching", "Creativity"], education: "B.Des Fashion Design", stream: "Any", growthRate: "Medium" },
    { name: "Chef", category: "Hospitality", description: "Prepare meals and manage kitchen operations", salary: "₹3-25 LPA", skills: ["Cooking", "Creativity", "Kitchen Management"], education: "Culinary Arts diploma", stream: "Any", growthRate: "Medium" },
    { name: "Sports Coach", category: "Sports", description: "Train athletes to improve performance", salary: "₹3-20 LPA", skills: ["Sports Knowledge", "Training Methods", "Motivation"], education: "Degree in Physical Education", stream: "Any", growthRate: "Medium" },
    { name: "Event Manager", category: "Hospitality", description: "Plan and execute events", salary: "₹3-15 LPA", skills: ["Planning", "Coordination", "Creativity"], education: "Any degree + Event Management", stream: "Any", growthRate: "High" },
    { name: "Animator", category: "Creative", description: "Create animations for digital media", salary: "₹3-15 LPA", skills: ["Maya", "Blender", "Storyboarding"], education: "B.Des Animation", stream: "Any", growthRate: "High" },
    { name: "Biotechnologist", category: "Science", description: "Apply biology to develop products", salary: "₹3-15 LPA", skills: ["Lab Techniques", "Genetic Engineering"], education: "B.Tech Biotechnology", stream: "Science (PCB)", growthRate: "High" },
    { name: "Civil Services (IAS)", category: "Governance", description: "Serve in government administration", salary: "₹8-30 LPA", skills: ["Leadership", "Decision Making", "Ethics"], education: "Any graduation + UPSC", stream: "Any", growthRate: "Stable" },
    { name: "Cloud Engineer", category: "Technology", description: "Design and manage cloud infrastructure", salary: "₹7-25 LPA", skills: ["AWS", "Azure", "DevOps"], education: "B.Tech Computer Science", stream: "Science (PCM)", growthRate: "Very High" },
    { name: "HR Manager", category: "Business", description: "Manage recruitment and employee relations", salary: "₹4-18 LPA", skills: ["Recruitment", "Communication", "Leadership"], education: "BBA/MBA HR", stream: "Commerce/Arts", growthRate: "Medium" },
    { name: "Bank Manager", category: "Banking", description: "Manage bank branch operations", salary: "₹5-15 LPA", skills: ["Finance", "Customer Service", "Leadership"], education: "B.Com/BBA + banking exams", stream: "Commerce", growthRate: "Medium" },
    { name: "Physiotherapist", category: "Healthcare", description: "Help patients recover from injuries", salary: "₹3-10 LPA", skills: ["Anatomy", "Rehabilitation", "Patient Care"], education: "BPT (Physiotherapy)", stream: "Science (PCB)", growthRate: "High" },
    { name: "Fitness Trainer", category: "Sports", description: "Guide clients in exercise and wellness", salary: "₹2-12 LPA", skills: ["Exercise Science", "Nutrition", "Motivation"], education: "Fitness certifications", stream: "Any", growthRate: "High" },
  ];
}

function getInternalCareerByName(name) {
  const careers = getInternalCareers();
  return (
    careers.find((c) => c.name.toLowerCase() === name?.toLowerCase()) ||
    careers.find((c) => name?.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])) ||
    null
  );
}

function getSmartInternalMatch(likedThings) {
  const careers = getInternalCareers();
  const keywordMap = {
    coding: ["Software Engineer", "AI/ML Engineer", "Cloud Engineer"],
    technology: ["Software Engineer", "Cybersecurity Analyst", "Cloud Engineer"],
    design: ["UI/UX Designer", "Graphic Designer", "Interior Designer"],
    medical: ["Doctor", "Nurse", "Pharmacist", "Physiotherapist"],
    business: ["Entrepreneur", "Business Analyst", "Marketing Manager"],
    teaching: ["Teacher", "College Professor", "Corporate Trainer"],
    writing: ["Content Writer", "Journalist", "Social Media Manager"],
    data: ["Data Scientist", "Financial Analyst", "Business Analyst"],
    art: ["Graphic Designer", "Animator", "Fashion Designer"],
    sports: ["Sports Coach", "Fitness Trainer"],
    law: ["Lawyer", "Civil Services (IAS)"],
    environment: ["Environmental Scientist", "Biotechnologist"],
    cooking: ["Chef"],
    aviation: ["Pilot"],
    marketing: ["Marketing Manager", "Social Media Manager"],
    psychology: ["Psychologist", "HR Manager"],
  };

  const matchedNames = new Set();
  likedThings.forEach((thing) => {
    Object.entries(keywordMap).forEach(([keyword, careerNames]) => {
      if (thing.includes(keyword)) {
        careerNames.forEach((n) => matchedNames.add(n));
      }
    });
  });

  let matched = careers.filter((c) => matchedNames.has(c.name));

  // If not enough matches, add top careers
  if (matched.length < 5) {
    const extras = careers.filter((c) => !matchedNames.has(c.name)).slice(0, 5 - matched.length);
    matched = [...matched, ...extras];
  }

  return matched.slice(0, 5).map((c, i) => ({
    ...c,
    id: i + 1,
    title: c.name,
    matchScore: 90 - i * 5,
    whyMatch: `Matches your interest in ${likedThings[0] || "this field"}`,
    source: "AI Matched",
  }));
}

function getFallbackCareers() {
  const careers = getInternalCareers().slice(0, 5);
  return careers.map((c, i) => ({
    ...c,
    id: i + 1,
    title: c.name,
    matchScore: 85 - i * 3,
    whyMatch: "Based on general aptitude",
    source: "Internal Database",
  }));
}

module.exports = {
  getSmartRecommendations,
  generateAIInsight,
  getInternalCareers,
};
