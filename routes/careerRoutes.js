const express = require("express");
const router = express.Router();
const careerController = require("../controllers/careerController");

// Assessment endpoints
router.get("/assessment/questions", careerController.getQuestions);
router.post("/assessment/submit", careerController.submitAssessment);


router.get("/all", careerController.getAllCareers);
router.get("/search", careerController.searchCareers);
router.get("/:id", careerController.getCareerById);

// Try Career Out Validation (NEW!)
router.post("/validate-task", careerController.validateCareerTask);
router.post("/exploration-summary", careerController.getCareerExplorationSummary);

module.exports = router;
