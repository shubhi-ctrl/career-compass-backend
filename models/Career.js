/**
 * Career Model – thin data-access layer over the SQLite DB.
 * All queries go through here; controllers never touch `db` directly.
 */

const db = require("../database/db");

// ── Read ───────────────────────────────────────────────────────────────────

/** Return all occupations with their top-5 skills aggregated */
function getAll({ limit = 100, offset = 0 } = {}) {
    const rows = db
        .prepare(
            `SELECT o.onet_code, o.title, o.description, o.bright_outlook,
              GROUP_CONCAT(s.skill_name, ', ') AS skills
       FROM occupations o
       LEFT JOIN (
         SELECT onet_code, skill_name
         FROM skills
         WHERE importance >= 3.0
         ORDER BY importance DESC
       ) s ON s.onet_code = o.onet_code
       GROUP BY o.onet_code
       ORDER BY o.title
       LIMIT ? OFFSET ?`
        )
        .all(limit, offset);

    return rows.map(formatRow);
}

/** Total count of occupations */
function count() {
    return db.prepare("SELECT COUNT(*) as c FROM occupations").get().c;
}

/** Get a single occupation by onet_code or numeric id */
function getById(id) {
    const byCode = db
        .prepare(
            `SELECT o.onet_code, o.title, o.description, o.bright_outlook,
              GROUP_CONCAT(s.skill_name, ', ') AS skills
       FROM occupations o
       LEFT JOIN (
         SELECT onet_code, skill_name
         FROM skills
         WHERE importance >= 2.5
         ORDER BY importance DESC
       ) s ON s.onet_code = o.onet_code
       WHERE o.onet_code = ? OR o.id = ?
       GROUP BY o.onet_code`
        )
        .get(id, id);

    if (!byCode) return null;

    // Also attach top education levels
    const edLevels = db
        .prepare(
            `SELECT education_level, percentage
       FROM education
       WHERE onet_code = ?
       ORDER BY percentage DESC
       LIMIT 3`
        )
        .all(byCode.onet_code);

    return { ...formatRow(byCode), education: edLevels };
}

/** Full-text search across title + description */
function search(keyword, { limit = 20 } = {}) {
    // Escape FTS special chars
    const safe = keyword.replace(/["*]/g, "");
    const rows = db
        .prepare(
            `SELECT o.onet_code, o.title, o.description, o.bright_outlook,
              GROUP_CONCAT(s.skill_name, ', ') AS skills
       FROM occupations_fts fts
       JOIN occupations o ON o.onet_code = fts.onet_code
       LEFT JOIN (
         SELECT onet_code, skill_name
         FROM skills
         WHERE importance >= 3.0
         ORDER BY importance DESC
       ) s ON s.onet_code = o.onet_code
       WHERE occupations_fts MATCH ?
       GROUP BY o.onet_code
       ORDER BY rank
       LIMIT ?`
        )
        .all(`"${safe}"*`, limit);

    return rows.map(formatRow);
}

/** Get bright-outlook occupations */
function getBrightOutlook({ limit = 50 } = {}) {
    const rows = db
        .prepare(
            `SELECT o.onet_code, o.title, o.description, o.bright_outlook,
              GROUP_CONCAT(s.skill_name, ', ') AS skills
       FROM occupations o
       LEFT JOIN (
         SELECT onet_code, skill_name
         FROM skills
         WHERE importance >= 3.0
         ORDER BY importance DESC
       ) s ON s.onet_code = o.onet_code
       WHERE o.bright_outlook = 1
       GROUP BY o.onet_code
       ORDER BY o.title
       LIMIT ?`
        )
        .all(limit);

    return rows.map(formatRow);
}

// ── Write (admin CRUD) ─────────────────────────────────────────────────────

/** Add a custom occupation */
function create({ onet_code, title, description, bright_outlook = 0 }) {
    if (!title) throw new Error("title is required");
    const code = onet_code || `CUSTOM-${Date.now()}`;
    const info = db
        .prepare(
            `INSERT INTO occupations (onet_code, title, description, bright_outlook)
       VALUES (@onet_code, @title, @description, @bright_outlook)`
        )
        .run({ onet_code: code, title, description, bright_outlook });

    // Update FTS
    db.prepare(
        `INSERT INTO occupations_fts(rowid, onet_code, title, description)
     VALUES (?, ?, ?, ?)`
    ).run(info.lastInsertRowid, code, title, description);

    return getById(code);
}

/** Update an occupation by onet_code or id */
function update(id, fields) {
    const existing = getById(id);
    if (!existing) return null;

    const allowed = ["title", "description", "bright_outlook"];
    const updates = Object.fromEntries(
        Object.entries(fields).filter(([k]) => allowed.includes(k))
    );
    if (!Object.keys(updates).length) return existing;

    const setClauses = Object.keys(updates)
        .map((k) => `${k} = @${k}`)
        .join(", ");

    db.prepare(`UPDATE occupations SET ${setClauses} WHERE onet_code = @onet_code`).run({
        ...updates,
        onet_code: existing.onet_code,
    });

    // Rebuild FTS entry
    db.prepare(
        `INSERT OR REPLACE INTO occupations_fts(rowid, onet_code, title, description)
     SELECT id, onet_code, title, description FROM occupations WHERE onet_code = ?`
    ).run(existing.onet_code);

    return getById(existing.onet_code);
}

/** Delete an occupation */
function remove(id) {
    const existing = getById(id);
    if (!existing) return false;
    db.prepare("DELETE FROM skills WHERE onet_code = ?").run(existing.onet_code);
    db.prepare("DELETE FROM education WHERE onet_code = ?").run(existing.onet_code);
    db.prepare("DELETE FROM occupations WHERE onet_code = ?").run(existing.onet_code);
    return true;
}

// ── Formatter ──────────────────────────────────────────────────────────────

function formatRow(row) {
    return {
        onet_code: row.onet_code,
        title: row.title,
        description: row.description,
        bright_outlook: !!row.bright_outlook,
        skills: row.skills ? row.skills.split(", ") : [],
    };
}

module.exports = { getAll, count, getById, search, getBrightOutlook, create, update, remove };
