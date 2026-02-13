const express = require("express");
const router = express.Router();
const careerController = require("../controllers/careerController");

// POST: Get career suggestions based on assessment
router.post("/suggestions", careerController.getSuggestions);

// GET: Get all available careers (optional)
router.get("/all", careerController.getAllCareers);

module.exports = router;