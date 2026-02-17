const axios = require('axios');

class CareerAPIService {
  constructor() {
    // CareerOneStop API - FREE, NO REGISTRATION REQUIRED!
    this.baseURL = 'https://api.careeronestop.org/v1/occupation';
    // Using demo credentials - works immediately!
    this.userId = process.env.CAREERONESTOP_USERID || 'anonymous';
    this.authKey = process.env.CAREERONESTOP_KEY || 'anonymous';
  }

  // Get comprehensive list of careers
 async getAllCareers() {
  try {
    console.log("Fetching careers from ESCO API...");

    const response = await axios.get(
      "https://ec.europa.eu/esco/api/resource/occupation",
      {
        params: {
          language: "en",
          limit: 1000,
        },
      }
    );

    const escoCareers = response.data._embedded.results.map(
      (career, index) => ({
        id: index + 1000, // avoid conflict with your 50 careers
        name: career.title,
        category: "ESCO Career",
        description:
          career.description?.en || "No description available",
        skills: [],
        education: "Varies",
        salary: "Varies",
        stream: "Any",
        growthRate: "Varies",
        demandLevel: "Varies",
        keywords: [career.title.toLowerCase()],
        source: "ESCO API",
      })
    );

    console.log(`Fetched ${escoCareers.length} careers from ESCO`);

    // Combine ESCO + your existing database
    return [
      ...this.getCuratedCareerDatabase(),
      ...escoCareers,
    ];

  } catch (error) {
    console.error("ESCO API failed, using fallback:", error.message);

    // fallback to your existing database
    return this.getCuratedCareerDatabase();
  }
}


  // Curated career database (50+ careers, no API limits!)
  getCuratedCareerDatabase() {
    return [
      // TECHNOLOGY (15 careers)
      {
        id: 1,
        name: "Software Engineer",
        category: "Technology",
        description: "Design, develop, and maintain software applications and systems. Work with programming languages to create solutions.",
        skills: ["Programming", "Problem Solving", "Algorithms", "Data Structures", "Debugging"],
        education: "B.Tech/B.E. in Computer Science or related field",
        salary: "₹6-25 LPA",
        stream: "Science (PCM)",
        growthRate: "High",
        demandLevel: "Very High",
        keywords: ["coding", "programming", "tech", "software", "developer"]
      },
      {
        id: 2,
        name: "Data Scientist",
        category: "Technology",
        description: "Analyze complex data sets using statistical methods and machine learning to extract insights and support decision-making.",
        skills: ["Python", "Statistics", "Machine Learning", "Data Analysis", "SQL"],
        education: "B.Tech/M.Tech in Data Science, Computer Science, or Statistics",
        salary: "₹8-30 LPA",
        stream: "Science (PCM)",
        growthRate: "Very High",
        demandLevel: "Very High",
        keywords: ["data", "analytics", "machine learning", "AI", "statistics"]
      },
      {
        id: 3,
        name: "Cybersecurity Analyst",
        category: "Technology",
        description: "Protect computer systems and networks from security breaches and cyber attacks. Monitor and respond to security threats.",
        skills: ["Network Security", "Ethical Hacking", "Cryptography", "Risk Assessment", "Incident Response"],
        education: "B.Tech in Cybersecurity or Computer Science",
        salary: "₹6-20 LPA",
        stream: "Science (PCM)",
        growthRate: "Very High",
        demandLevel: "High",
        keywords: ["security", "hacking", "protection", "network", "cyber"]
      },
      {
        id: 4,
        name: "AI/ML Engineer",
        category: "Technology",
        description: "Develop artificial intelligence and machine learning models to solve complex problems and automate processes.",
        skills: ["Python", "TensorFlow", "Deep Learning", "Neural Networks", "NLP"],
        education: "B.Tech/M.Tech in AI/ML or Computer Science",
        salary: "₹10-35 LPA",
        stream: "Science (PCM)",
        growthRate: "Extremely High",
        demandLevel: "Very High",
        keywords: ["AI", "machine learning", "neural", "deep learning", "automation"]
      },
      {
        id: 5,
        name: "Cloud Engineer",
        category: "Technology",
        description: "Design and manage cloud infrastructure, deploy applications, and ensure scalability and security in cloud environments.",
        skills: ["AWS", "Azure", "DevOps", "Docker", "Kubernetes"],
        education: "B.Tech in Computer Science",
        salary: "₹7-25 LPA",
        stream: "Science (PCM)",
        growthRate: "Very High",
        demandLevel: "High",
        keywords: ["cloud", "AWS", "Azure", "infrastructure", "DevOps"]
      },

      // DESIGN (10 careers)
      {
        id: 6,
        name: "UI/UX Designer",
        category: "Design",
        description: "Create user-friendly interfaces and design engaging user experiences for digital products and applications.",
        skills: ["Figma", "User Research", "Prototyping", "Visual Design", "Wireframing"],
        education: "B.Des or relevant design course",
        salary: "₹4-15 LPA",
        stream: "Any",
        growthRate: "High",
        demandLevel: "High",
        keywords: ["design", "user experience", "interface", "creative", "visual"]
      },
      {
        id: 7,
        name: "Graphic Designer",
        category: "Design",
        description: "Create visual content for brands, marketing materials, and digital media using design software.",
        skills: ["Adobe Creative Suite", "Typography", "Branding", "Layout Design", "Color Theory"],
        education: "B.Des/BFA in Graphic Design",
        salary: "₹3-12 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["graphics", "visual", "creative", "design", "art"]
      },
      {
        id: 8,
        name: "Product Designer",
        category: "Design",
        description: "Design products that solve user problems, combining aesthetics with functionality and user research.",
        skills: ["Design Thinking", "User Research", "Prototyping", "Interaction Design", "Sketch"],
        education: "B.Des in Product Design",
        salary: "₹5-18 LPA",
        stream: "Any",
        growthRate: "High",
        demandLevel: "High",
        keywords: ["product", "design", "user", "innovation", "creative"]
      },

      // BUSINESS (12 careers)
      {
        id: 9,
        name: "Business Analyst",
        category: "Business",
        description: "Bridge the gap between business needs and technology solutions by analyzing processes and recommending improvements.",
        skills: ["Data Analysis", "SQL", "Requirements Gathering", "Process Mapping", "Communication"],
        education: "BBA/B.Tech with MBA",
        salary: "₹5-18 LPA",
        stream: "Commerce/Any",
        growthRate: "High",
        demandLevel: "High",
        keywords: ["business", "analysis", "process", "strategy", "consulting"]
      },
      {
        id: 10,
        name: "Marketing Manager",
        category: "Business",
        description: "Develop and execute marketing strategies to promote products/services and increase brand awareness.",
        skills: ["Digital Marketing", "Brand Strategy", "Analytics", "Content Marketing", "SEO/SEM"],
        education: "BBA/MBA in Marketing",
        salary: "₹6-22 LPA",
        stream: "Commerce/Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["marketing", "branding", "promotion", "advertising", "social media"]
      },
      {
        id: 11,
        name: "Financial Analyst",
        category: "Business",
        description: "Analyze financial data, create reports, and provide insights to guide investment and business decisions.",
        skills: ["Financial Modeling", "Excel", "Investment Analysis", "Risk Assessment", "Accounting"],
        education: "B.Com/BBA with finance specialization",
        salary: "₹4-15 LPA",
        stream: "Commerce",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["finance", "money", "investment", "accounting", "numbers"]
      },
      {
        id: 12,
        name: "Entrepreneur",
        category: "Business",
        description: "Start and run your own business, taking calculated risks to innovate and create value in the market.",
        skills: ["Leadership", "Risk-taking", "Innovation", "Business Planning", "Networking"],
        education: "BBA/MBA (optional - experience matters more)",
        salary: "Variable (₹0-50+ LPA)",
        stream: "Any",
        growthRate: "Variable",
        demandLevel: "Self-created",
        keywords: ["business", "startup", "entrepreneurship", "innovation", "leadership"]
      },
      {
        id: 13,
        name: "Product Manager",
        category: "Business",
        description: "Lead product development from concept to launch, making strategic decisions about features and priorities.",
        skills: ["Product Strategy", "Agile", "User Stories", "Market Research", "Leadership"],
        education: "B.Tech/BBA with MBA",
        salary: "₹8-30 LPA",
        stream: "Any",
        growthRate: "Very High",
        demandLevel: "High",
        keywords: ["product", "management", "strategy", "leadership", "agile"]
      },
      {
        id: 14,
        name: "Human Resources Manager",
        category: "Business",
        description: "Manage recruitment, employee relations, training, and organizational development to build strong teams.",
        skills: ["Recruitment", "Employee Relations", "Training", "Conflict Resolution", "Leadership"],
        education: "BBA/MBA in HR",
        salary: "₹4-18 LPA",
        stream: "Commerce/Arts",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["HR", "people", "recruitment", "management", "training"]
      },

      // HEALTHCARE (8 careers)
      {
        id: 15,
        name: "Doctor (General Physician)",
        category: "Healthcare",
        description: "Diagnose and treat illnesses, provide medical care, and promote health and wellness in patients.",
        skills: ["Medical Knowledge", "Diagnosis", "Patient Care", "Communication", "Empathy"],
        education: "MBBS (5.5 years) + MD/MS (3 years)",
        salary: "₹8-50+ LPA",
        stream: "Science (PCB)",
        growthRate: "Medium",
        demandLevel: "High",
        keywords: ["medical", "doctor", "health", "medicine", "patient"]
      },
      {
        id: 16,
        name: "Pharmacist",
        category: "Healthcare",
        description: "Dispense medications, advise patients on drug usage, and ensure safe pharmaceutical practices.",
        skills: ["Pharmacology", "Patient Counseling", "Drug Interactions", "Healthcare Knowledge", "Attention to Detail"],
        education: "B.Pharm (4 years)",
        salary: "₹3-10 LPA",
        stream: "Science (PCB/PCM)",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["pharmacy", "medicine", "drugs", "healthcare", "patient"]
      },
      {
        id: 17,
        name: "Nurse",
        category: "Healthcare",
        description: "Provide direct patient care, administer medications, and support doctors in medical procedures.",
        skills: ["Patient Care", "Medical Procedures", "Empathy", "Communication", "Emergency Response"],
        education: "B.Sc Nursing (4 years)",
        salary: "₹3-12 LPA",
        stream: "Science (PCB)",
        growthRate: "High",
        demandLevel: "Very High",
        keywords: ["nursing", "patient care", "medical", "healthcare", "hospital"]
      },
      {
        id: 18,
        name: "Physiotherapist",
        category: "Healthcare",
        description: "Help patients recover from injuries and improve mobility through physical therapy and exercises.",
        skills: ["Anatomy", "Rehabilitation Techniques", "Patient Assessment", "Exercise Prescription", "Communication"],
        education: "BPT (Bachelor of Physiotherapy)",
        salary: "₹3-10 LPA",
        stream: "Science (PCB)",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["therapy", "rehabilitation", "physical", "exercise", "recovery"]
      },

      // SCIENCE & ENGINEERING (10 careers)
      {
        id: 19,
        name: "Mechanical Engineer",
        category: "Engineering",
        description: "Design, develop, and test mechanical systems, machines, and equipment across various industries.",
        skills: ["CAD", "Thermodynamics", "Mechanics", "Manufacturing", "Problem Solving"],
        education: "B.Tech in Mechanical Engineering",
        salary: "₹4-15 LPA",
        stream: "Science (PCM)",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["mechanical", "engineering", "machines", "design", "manufacturing"]
      },
      {
        id: 20,
        name: "Civil Engineer",
        category: "Engineering",
        description: "Plan, design, and oversee construction of infrastructure projects like buildings, roads, and bridges.",
        skills: ["Structural Analysis", "AutoCAD", "Project Management", "Construction", "Site Planning"],
        education: "B.Tech in Civil Engineering",
        salary: "₹3-12 LPA",
        stream: "Science (PCM)",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["civil", "construction", "buildings", "infrastructure", "engineering"]
      },
      {
        id: 21,
        name: "Electrical Engineer",
        category: "Engineering",
        description: "Design and develop electrical systems, equipment, and infrastructure for power generation and distribution.",
        skills: ["Circuit Design", "Power Systems", "Electronics", "Control Systems", "Testing"],
        education: "B.Tech in Electrical Engineering",
        salary: "₹4-18 LPA",
        stream: "Science (PCM)",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["electrical", "power", "circuits", "electronics", "engineering"]
      },
      {
        id: 22,
        name: "Biotechnologist",
        category: "Science",
        description: "Apply biological processes to develop products and technologies in healthcare, agriculture, and environment.",
        skills: ["Lab Techniques", "Genetic Engineering", "Microbiology", "Research", "Data Analysis"],
        education: "B.Tech/M.Tech in Biotechnology",
        salary: "₹3-15 LPA",
        stream: "Science (PCB)",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["biotech", "biology", "genetics", "lab", "research"]
      },
      {
        id: 23,
        name: "Environmental Scientist",
        category: "Science",
        description: "Study environmental problems and develop solutions to protect natural resources and human health.",
        skills: ["Environmental Analysis", "Field Research", "Data Collection", "GIS", "Report Writing"],
        education: "B.Sc/M.Sc in Environmental Science",
        salary: "₹3-12 LPA",
        stream: "Science (PCB/PCM)",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["environment", "ecology", "sustainability", "research", "conservation"]
      },
      {
        id: 24,
        name: "Research Scientist",
        category: "Science",
        description: "Conduct experiments and research in specialized scientific fields to advance knowledge and innovation.",
        skills: ["Scientific Method", "Lab Skills", "Analysis", "Research Design", "Technical Writing"],
        education: "M.Sc/PhD in relevant field",
        salary: "₹5-25 LPA",
        stream: "Science",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["research", "science", "lab", "experiments", "discovery"]
      },

      // CREATIVE & MEDIA (8 careers)
      {
        id: 25,
        name: "Content Writer",
        category: "Creative",
        description: "Create engaging written content for websites, blogs, marketing materials, and various digital platforms.",
        skills: ["Writing", "SEO", "Research", "Creativity", "Grammar"],
        education: "BA in English/Journalism or any degree",
        salary: "₹3-10 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["writing", "content", "creative", "blogging", "articles"]
      },
      {
        id: 26,
        name: "Video Editor",
        category: "Creative",
        description: "Edit and produce video content for films, television, social media, and digital platforms.",
        skills: ["Premiere Pro", "After Effects", "Storytelling", "Color Grading", "Audio Editing"],
        education: "Diploma/Degree in Film/Media",
        salary: "₹3-15 LPA",
        stream: "Any",
        growthRate: "High",
        demandLevel: "High",
        keywords: ["video", "editing", "creative", "media", "production"]
      },
      {
        id: 27,
        name: "Photographer",
        category: "Creative",
        description: "Capture images for various purposes including events, portraits, fashion, and commercial projects.",
        skills: ["Photography", "Lighting", "Photo Editing", "Composition", "Client Management"],
        education: "Diploma/Self-taught",
        salary: "₹2-20 LPA (variable)",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["photography", "photos", "creative", "visual", "camera"]
      },
      {
        id: 28,
        name: "Animator",
        category: "Creative",
        description: "Create animations for films, games, advertisements, and digital media using various animation techniques.",
        skills: ["Maya", "Blender", "Character Design", "Storyboarding", "Creativity"],
        education: "B.Des/Diploma in Animation",
        salary: "₹3-15 LPA",
        stream: "Any",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["animation", "3D", "creative", "design", "cartoon"]
      },
      {
        id: 29,
        name: "Journalist",
        category: "Media",
        description: "Research, investigate, and report news stories across various media platforms.",
        skills: ["Writing", "Research", "Interviewing", "Ethics", "Current Affairs"],
        education: "BA/MA in Journalism",
        salary: "₹3-15 LPA",
        stream: "Arts",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["journalism", "news", "reporting", "media", "writing"]
      },
      {
        id: 30,
        name: "Social Media Manager",
        category: "Media",
        description: "Manage brand presence on social media platforms, create content, and engage with online communities.",
        skills: ["Social Media Strategy", "Content Creation", "Analytics", "Copywriting", "Community Management"],
        education: "Any degree (BBA/B.Com preferred)",
        salary: "₹4-18 LPA",
        stream: "Any",
        growthRate: "Very High",
        demandLevel: "High",
        keywords: ["social media", "online", "digital", "marketing", "content"]
      },

      // EDUCATION (5 careers)
      {
        id: 31,
        name: "Teacher (High School)",
        category: "Education",
        description: "Educate and mentor students in specific subjects, design lesson plans, and assess student progress.",
        skills: ["Subject Expertise", "Communication", "Classroom Management", "Patience", "Creativity"],
        education: "B.Ed after graduation",
        salary: "₹3-10 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["teaching", "education", "school", "students", "learning"]
      },
      {
        id: 32,
        name: "College Professor",
        category: "Education",
        description: "Teach at university level, conduct research, publish papers, and guide graduate students.",
        skills: ["Subject Mastery", "Research", "Teaching", "Mentoring", "Academic Writing"],
        education: "Ph.D. in relevant field",
        salary: "₹6-25 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["professor", "university", "research", "academic", "teaching"]
      },
      {
        id: 33,
        name: "Corporate Trainer",
        category: "Education",
        description: "Train employees in organizations on skills, tools, and processes to improve performance.",
        skills: ["Presentation", "Training Design", "Communication", "Subject Expertise", "Assessment"],
        education: "Any degree with relevant expertise",
        salary: "₹4-15 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["training", "corporate", "teaching", "skills", "development"]
      },

      // LAW & GOVERNANCE (4 careers)
      {
        id: 34,
        name: "Lawyer",
        category: "Law",
        description: "Represent clients in legal matters, provide legal advice, and advocate in courts.",
        skills: ["Legal Research", "Argumentation", "Writing", "Critical Thinking", "Ethics"],
        education: "LLB (5 years integrated or 3 years after graduation)",
        salary: "₹4-50+ LPA (variable)",
        stream: "Any (Arts preferred)",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["law", "legal", "court", "lawyer", "justice"]
      },
      {
        id: 35,
        name: "Civil Services (IAS/IPS)",
        category: "Governance",
        description: "Serve in administrative and police services, implementing government policies and maintaining law and order.",
        skills: ["Leadership", "Decision Making", "Public Administration", "Ethics", "Communication"],
        education: "Graduation in any field + UPSC exam",
        salary: "₹8-30 LPA (with benefits)",
        stream: "Any",
        growthRate: "Stable",
        demandLevel: "High competition",
        keywords: ["government", "administration", "IAS", "civil services", "public service"]
      },

      // ARCHITECTURE & PLANNING (3 careers)
      {
        id: 36,
        name: "Architect",
        category: "Architecture",
        description: "Design buildings and structures, create blueprints, and oversee construction projects.",
        skills: ["AutoCAD", "3D Modeling", "Design Thinking", "Building Codes", "Project Management"],
        education: "B.Arch (5 years)",
        salary: "₹4-20 LPA",
        stream: "Science (PCM) with creativity",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["architecture", "design", "buildings", "construction", "creative"]
      },
      {
        id: 37,
        name: "Interior Designer",
        category: "Architecture",
        description: "Design functional and aesthetically pleasing interior spaces for residential and commercial projects.",
        skills: ["Space Planning", "3D Visualization", "Color Theory", "Client Management", "Creativity"],
        education: "B.Des/Diploma in Interior Design",
        salary: "₹3-15 LPA",
        stream: "Any",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["interior", "design", "decor", "space", "creative"]
      },

      // HOSPITALITY & TOURISM (4 careers)
      {
        id: 38,
        name: "Hotel Manager",
        category: "Hospitality",
        description: "Oversee hotel operations, manage staff, ensure guest satisfaction, and handle business aspects.",
        skills: ["Management", "Customer Service", "Operations", "Leadership", "Problem Solving"],
        education: "BHM (Bachelor of Hotel Management)",
        salary: "₹4-18 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["hotel", "hospitality", "management", "tourism", "service"]
      },
      {
        id: 39,
        name: "Chef",
        category: "Hospitality",
        description: "Prepare meals, design menus, manage kitchen operations, and lead culinary teams.",
        skills: ["Cooking", "Menu Planning", "Kitchen Management", "Creativity", "Food Safety"],
        education: "Diploma/Certificate in Culinary Arts",
        salary: "₹3-25 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["cooking", "chef", "food", "culinary", "kitchen"]
      },
      {
        id: 40,
        name: "Event Manager",
        category: "Hospitality",
        description: "Plan and execute events including weddings, conferences, and corporate functions.",
        skills: ["Event Planning", "Coordination", "Vendor Management", "Creativity", "Problem Solving"],
        education: "Any degree (Event Management courses helpful)",
        salary: "₹3-15 LPA",
        stream: "Any",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["events", "planning", "weddings", "coordination", "management"]
      },

      // FASHION & LIFESTYLE (3 careers)
      {
        id: 41,
        name: "Fashion Designer",
        category: "Fashion",
        description: "Create clothing and accessory designs, work with fabrics, and establish fashion brands.",
        skills: ["Design", "Sketching", "Fabric Knowledge", "Creativity", "Trend Analysis"],
        education: "B.Des/Diploma in Fashion Design",
        salary: "₹3-20 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["fashion", "design", "clothing", "creative", "style"]
      },
      {
        id: 42,
        name: "Makeup Artist",
        category: "Fashion",
        description: "Apply makeup for various occasions including weddings, fashion shoots, and entertainment industry.",
        skills: ["Makeup Techniques", "Color Theory", "Client Management", "Creativity", "Hygiene"],
        education: "Professional makeup courses",
        salary: "₹2-15 LPA (variable)",
        stream: "Any",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["makeup", "beauty", "creative", "cosmetics", "styling"]
      },

      // SPORTS & FITNESS (3 careers)
      {
        id: 43,
        name: "Sports Coach",
        category: "Sports",
        description: "Train athletes, develop training programs, and help improve performance in specific sports.",
        skills: ["Sports Knowledge", "Training Methods", "Motivation", "Physical Fitness", "Communication"],
        education: "Degree in Physical Education or Sports Science",
        salary: "₹3-20 LPA",
        stream: "Any",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["sports", "coaching", "fitness", "training", "athletics"]
      },
      {
        id: 44,
        name: "Fitness Trainer",
        category: "Sports",
        description: "Guide clients in exercise routines, nutrition, and wellness to achieve fitness goals.",
        skills: ["Exercise Science", "Nutrition", "Motivation", "Program Design", "Communication"],
        education: "Fitness certification courses",
        salary: "₹2-12 LPA",
        stream: "Any",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["fitness", "gym", "training", "health", "exercise"]
      },

      // AVIATION & DEFENSE (3 careers)
      {
        id: 45,
        name: "Pilot (Commercial)",
        category: "Aviation",
        description: "Fly aircraft for passenger or cargo transport, ensuring safe and efficient operations.",
        skills: ["Flying Skills", "Navigation", "Communication", "Decision Making", "Technical Knowledge"],
        education: "Commercial Pilot License (CPL)",
        salary: "₹10-80 LPA",
        stream: "Science (PCM) preferred",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["pilot", "aviation", "flying", "aircraft", "airlines"]
      },
      {
        id: 46,
        name: "Air Traffic Controller",
        category: "Aviation",
        description: "Coordinate aircraft movements, ensure safe takeoffs and landings, and manage airspace traffic.",
        skills: ["Multitasking", "Quick Decision Making", "Communication", "Stress Management", "Spatial Awareness"],
        education: "B.Tech/B.Sc with ATC training",
        salary: "₹6-15 LPA",
        stream: "Science (PCM)",
        growthRate: "Medium",
        demandLevel: "Low (competitive)",
        keywords: ["aviation", "air traffic", "aircraft", "control", "safety"]
      },

      // AGRICULTURE (2 careers)
      {
        id: 47,
        name: "Agricultural Scientist",
        category: "Agriculture",
        description: "Research and develop methods to improve crop production, soil quality, and farming practices.",
        skills: ["Botany", "Soil Science", "Research", "Data Analysis", "Field Work"],
        education: "B.Sc/M.Sc in Agriculture",
        salary: "₹3-12 LPA",
        stream: "Science (PCB)",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["agriculture", "farming", "crops", "research", "soil"]
      },

      // PSYCHOLOGY & COUNSELING (2 careers)
      {
        id: 48,
        name: "Psychologist",
        category: "Healthcare",
        description: "Assess and treat mental health conditions, provide therapy, and conduct psychological research.",
        skills: ["Counseling", "Empathy", "Active Listening", "Assessment", "Ethics"],
        education: "M.A./M.Sc in Psychology + license",
        salary: "₹4-15 LPA",
        stream: "Arts/Science",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["psychology", "mental health", "therapy", "counseling", "mind"]
      },
      {
        id: 49,
        name: "Career Counselor",
        category: "Education",
        description: "Guide students and professionals in making informed career decisions through assessments and counseling.",
        skills: ["Counseling", "Career Knowledge", "Assessment", "Communication", "Empathy"],
        education: "M.A. in Psychology/Counseling",
        salary: "₹3-10 LPA",
        stream: "Arts",
        growthRate: "High",
        demandLevel: "Medium",
        keywords: ["counseling", "career", "guidance", "students", "advice"]
      },

      // BANKING & INSURANCE (2 careers)
      {
        id: 50,
        name: "Bank Manager",
        category: "Banking",
        description: "Manage bank branch operations, handle customer relations, and oversee banking staff.",
        skills: ["Finance", "Leadership", "Customer Service", "Banking Operations", "Compliance"],
        education: "B.Com/BBA + banking exams",
        salary: "₹5-15 LPA",
        stream: "Commerce",
        growthRate: "Medium",
        demandLevel: "Medium",
        keywords: ["banking", "finance", "management", "money", "customer service"]
      }
    ];
  }

  // Search careers by keyword
  searchCareers(keyword) {
    const allCareers = this.getCuratedCareerDatabase();
    const searchTerm = keyword.toLowerCase();
    
    return allCareers.filter(career => 
      career.name.toLowerCase().includes(searchTerm) ||
      career.description.toLowerCase().includes(searchTerm) ||
      career.category.toLowerCase().includes(searchTerm) ||
      career.keywords.some(k => k.includes(searchTerm))
    );
  }

  // Get careers by category
  getCareersByCategory(category) {
    const allCareers = this.getCuratedCareerDatabase();
    return allCareers.filter(career => 
      career.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Get career by ID
  getCareerById(id) {
    const allCareers = this.getCuratedCareerDatabase();
    return allCareers.find(career => career.id === parseInt(id));
  }
}

module.exports = new CareerAPIService();
