const express = require("express");
const router = express.Router();
const careerController = require("../controllers/careerController");

// Assessment endpoints
router.get("/assessment/questions", careerController.getQuestions);
router.post("/assessment/submit", careerController.submitAssessment);

// Read endpoints
router.get("/all", careerController.getAllCareers);
router.get("/search", careerController.searchCareers);
router.get("/bright-outlook", careerController.getBrightOutlook);

// Try Career Out Validation
router.post("/validate-task", careerController.validateCareerTask);
router.post("/exploration-summary", careerController.getCareerExplorationSummary);
router.post("/suggestions", careerController.getSuggestions);

// Admin CRUD (POST before /:id to avoid route conflicts)
router.post("/", careerController.createCareer);
router.put("/:id", careerController.updateCareer);
router.delete("/:id", careerController.deleteCareer);

// Single career (must come after specific named routes)
router.get("/:id", careerController.getCareerById);

module.exports = router;
