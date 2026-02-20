const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// DB lives in the database/ folder (writable on both local and Render free tier)
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "careers.db");
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS occupations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    onet_code   TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    bright_outlook INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS skills (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    onet_code   TEXT NOT NULL,
    skill_name  TEXT NOT NULL,
    importance  REAL,
    FOREIGN KEY (onet_code) REFERENCES occupations(onet_code)
  );

  CREATE TABLE IF NOT EXISTS education (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    onet_code       TEXT NOT NULL,
    category        TEXT,
    education_level TEXT,
    percentage      REAL,
    FOREIGN KEY (onet_code) REFERENCES occupations(onet_code)
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS occupations_fts USING fts5(
    onet_code UNINDEXED,
    title,
    description,
    content='occupations',
    content_rowid='id'
  );
`);

// Auth + progress tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    career_title    TEXT NOT NULL,
    tasks_json      TEXT,
    analysis_result TEXT,
    updated_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, career_title)
  );
`);

module.exports = db;
