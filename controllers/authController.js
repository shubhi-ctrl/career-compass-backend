const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/db");

const JWT_SECRET = process.env.JWT_SECRET || "career-compass-secret-2024";

// ── REGISTER ────────────────────────────────────────────────────────────────
exports.register = (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ success: false, error: "name, email and password are required" });

    if (password.length < 6)
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });

    try {
        const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
        if (existing) return res.status(409).json({ success: false, error: "Email already registered" });

        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, hash);
        const userId = result.lastInsertRowid;

        const token = jwt.sign({ userId, email, name }, JWT_SECRET, { expiresIn: "30d" });
        res.json({ success: true, token, user: { id: userId, name, email } });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ success: false, error: "Registration failed" });
    }
};

// ── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, error: "email and password are required" });

    try {
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        if (!user) return res.status(401).json({ success: false, error: "Invalid email or password" });

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, error: "Invalid email or password" });

        const token = jwt.sign({ userId: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "30d" });
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, error: "Login failed" });
    }
};

// ── SAVE PROGRESS ────────────────────────────────────────────────────────────
exports.saveProgress = (req, res) => {
    const { careerTitle, tasksJson, analysisResult } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: "Not authenticated" });

    try {
        db.prepare(`
      INSERT INTO user_progress (user_id, career_title, tasks_json, analysis_result, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, career_title) DO UPDATE SET
        tasks_json = excluded.tasks_json,
        analysis_result = excluded.analysis_result,
        updated_at = excluded.updated_at
    `).run(userId, careerTitle, tasksJson, analysisResult);
        res.json({ success: true });
    } catch (err) {
        console.error("Save progress error:", err);
        res.status(500).json({ success: false, error: "Failed to save progress" });
    }
};

// ── GET PROGRESS ─────────────────────────────────────────────────────────────
exports.getProgress = (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: "Not authenticated" });

    try {
        const rows = db.prepare("SELECT * FROM user_progress WHERE user_id = ?").all(userId);
        res.json({ success: true, progress: rows });
    } catch (err) {
        console.error("Get progress error:", err);
        res.status(500).json({ success: false, error: "Failed to get progress" });
    }
};

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
exports.requireAuth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ success: false, error: "No token provided" });
    const token = header.replace("Bearer ", "");
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.userName = decoded.name;
        next();
    } catch {
        res.status(401).json({ success: false, error: "Invalid token" });
    }
};
