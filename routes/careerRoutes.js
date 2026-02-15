const express = require("express");
const router = express.Router();
const careerController = require("../controllers/careerController");

// Assessment endpoints
router.get("/assessment/questions", careerController.getQuestions);
router.post("/assessment/submit", careerController.submitAssessment);

// Career endpoints
router.post("/suggestions", careerController.getSuggestions);
router.get("/all", careerController.getAllCareers);
router.get("/:id", careerController.getCareerById);

module.exports = router;
