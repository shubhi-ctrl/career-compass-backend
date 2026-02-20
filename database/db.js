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

// FTS trigger helpers (populated after import)
module.exports = db;
