const express = require("express");
const router = express.Router();
const { register, login, saveProgress, getProgress, requireAuth } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/progress", requireAuth, saveProgress);
router.get("/progress", requireAuth, getProgress);

module.exports = router;
