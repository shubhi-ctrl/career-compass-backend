/**
 * O*NET Data Import Script
 * Run once: node database/import.js
 *
 * Reads three O*NET tab-delimited text files from database/onet_raw/ and
 * bulk-inserts them into careers.db (SQLite).
 *
 * Files needed (already downloaded):
 *   database/onet_raw/occupation_data.txt  – 1,016 occupations
 *   database/onet_raw/skills.txt           – skills with importance scores
 *   database/onet_raw/education.txt        – education level distributions
 *   database/onet_raw/bright_outlook.txt  – bright-outlook occupation list
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const db = require("./db");

const RAW = path.join(__dirname, "onet_raw");  // always relative to database/

// ── Helpers ────────────────────────────────────────────────────────────────

function parseTSV(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];
        let headers = null;
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath, "utf8"),
            crlfDelay: Infinity,
        });
        rl.on("line", (line) => {
            if (!line.trim()) return;
            const cols = line.split("\t");
            if (!headers) {
                headers = cols;
                return;
            }
            const obj = {};
            headers.forEach((h, i) => (obj[h.trim()] = (cols[i] || "").trim()));
            rows.push(obj);
        });
        rl.on("close", () => resolve(rows));
        rl.on("error", reject);
    });
}

// ── Main import ────────────────────────────────────────────────────────────

async function run() {
    console.log("🗂  Reading O*NET raw files...");

    const [occupations, skills, education, brightOutlook] = await Promise.all([
        parseTSV(path.join(RAW, "occupation_data.txt")),
        parseTSV(path.join(RAW, "skills.txt")),
        parseTSV(path.join(RAW, "education.txt")),
        parseTSV(path.join(RAW, "bright_outlook.txt")),
    ]);

    console.log(`✅ Parsed: ${occupations.length} occupations, ${skills.length} skill rows, ${education.length} education rows, ${brightOutlook.length} bright-outlook entries`);

    // Build bright-outlook lookup set
    const brightSet = new Set(brightOutlook.map((r) => r["O*NET-SOC Code"]));

    // ── 1. Import occupations ─────────────────────────────────────────────────
    console.log("📥 Importing occupations...");
    const insertOcc = db.prepare(`
    INSERT OR REPLACE INTO occupations (onet_code, title, description, bright_outlook)
    VALUES (@onet_code, @title, @description, @bright_outlook)
  `);

    const importOccupations = db.transaction(() => {
        for (const row of occupations) {
            insertOcc.run({
                onet_code: row["O*NET-SOC Code"],
                title: row["Title"],
                description: row["Description"],
                bright_outlook: brightSet.has(row["O*NET-SOC Code"]) ? 1 : 0,
            });
        }
    });
    importOccupations();
    console.log(`   ✔ ${occupations.length} occupations inserted`);

    // ── 2. Import skills (keep only importance scale "IM", top skills per occ) ─
    console.log("📥 Importing skills...");
    // Filter: Scale ID = IM (importance), recommendation not suppressed
    const importantSkills = skills.filter(
        (r) => r["Scale ID"] === "IM" && r["Recommend Suppress"] !== "Y"
    );

    const insertSkill = db.prepare(`
    INSERT INTO skills (onet_code, skill_name, importance)
    VALUES (@onet_code, @skill_name, @importance)
  `);

    const importSkills = db.transaction(() => {
        // Clear first in case of re-run
        db.prepare("DELETE FROM skills").run();
        for (const row of importantSkills) {
            insertSkill.run({
                onet_code: row["O*NET-SOC Code"],
                skill_name: row["Element Name"],
                importance: parseFloat(row["Data Value"]) || 0,
            });
        }
    });
    importSkills();
    console.log(`   ✔ ${importantSkills.length} skill rows inserted`);

    // ── 3. Import education ───────────────────────────────────────────────────
    console.log("📥 Importing education data...");
    // Keep only "RW" (required for work) category
    const edRows = education.filter((r) => r["Scale ID"] === "RW");

    const insertEd = db.prepare(`
    INSERT INTO education (onet_code, category, education_level, percentage)
    VALUES (@onet_code, @category, @education_level, @percentage)
  `);

    const importEd = db.transaction(() => {
        db.prepare("DELETE FROM education").run();
        for (const row of edRows) {
            insertEd.run({
                onet_code: row["O*NET-SOC Code"],
                category: row["Category"] || null,
                education_level: row["Element Name"],
                percentage: parseFloat(row["Data Value"]) || 0,
            });
        }
    });
    importEd();
    console.log(`   ✔ ${edRows.length} education rows inserted`);

    // ── 4. Rebuild FTS index ──────────────────────────────────────────────────
    console.log("🔍 Rebuilding full-text search index...");
    db.exec(`
    INSERT OR REPLACE INTO occupations_fts(rowid, onet_code, title, description)
    SELECT id, onet_code, title, description FROM occupations;
  `);
    console.log("   ✔ FTS index built");

    // ── Summary ───────────────────────────────────────────────────────────────
    const total = db.prepare("SELECT COUNT(*) as c FROM occupations").get().c;
    const brightCount = db.prepare("SELECT COUNT(*) as c FROM occupations WHERE bright_outlook=1").get().c;
    console.log(`\n🎉 Import complete!`);
    console.log(`   Total occupations : ${total}`);
    console.log(`   Bright outlook    : ${brightCount}`);
    console.log(`   DB path           : ${path.join(__dirname, "careers.db")}`);

    db.close();
}

run().catch((err) => {
    console.error("❌ Import failed:", err);
    process.exit(1);
});
