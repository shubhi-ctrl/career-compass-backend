const express = require("express");
const multer = require("multer");
const { analyzeCareerTask } = require("../controllers/analysisController");

const router = express.Router();

// Memory storage — passes image buffer directly to Claude API
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpeg, png, webp, gif)"));
    }
  },
});

// POST /api/analysis/career-task
router.post("/career-task", upload.single("image"), analyzeCareerTask);

module.exports = router;
