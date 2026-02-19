/**
 * O*NET Web Services Integration
 * Auth: HTTP Basic (Username + Password)
 * Docs: https://services.onetcenter.org/
 */

const ONET_BASE_URL = "https://services.onetcenter.org/ws";

function onetHeaders() {
  const credentials = Buffer.from(
    `${process.env.ONET_USERNAME}:${process.env.ONET_PASSWORD}`
  ).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    Accept: "application/json",
  };
}

/**
 * Search O*NET for occupations matching a career title
 */
async function searchOccupations(query) {
  try {
    const url = `${ONET_BASE_URL}/search?keyword=${encodeURIComponent(query)}&client=career-compass`;
    const res = await fetch(url, { headers: onetHeaders() });
    if (!res.ok) throw new Error(`O*NET search failed: ${res.status}`);
    const data = await res.json();
    return (data.occupation || []).slice(0, 3).map((o) => ({
      code: o.code,
      title: o.title,
    }));
  } catch (err) {
    console.error("O*NET search error:", err.message);
    return [];
  }
}

/**
 * Get detailed occupation data: skills, tasks, outlook
 */
async function getOccupationDetails(socCode) {
  try {
    const [summaryRes, skillsRes, outlookRes] = await Promise.all([
      fetch(`${ONET_BASE_URL}/occupations/${socCode}/summary`, { headers: onetHeaders() }),
      fetch(`${ONET_BASE_URL}/occupations/${socCode}/skills`, { headers: onetHeaders() }),
      fetch(`${ONET_BASE_URL}/occupations/${socCode}/outlook`, { headers: onetHeaders() }),
    ]);

    const summary = summaryRes.ok ? await summaryRes.json() : null;
    const skills = skillsRes.ok ? await skillsRes.json() : null;
    const outlook = outlookRes.ok ? await outlookRes.json() : null;

    return {
      description: summary?.description || "",
      brightOutlook: summary?.bright_outlook || false,
      tasks: (summary?.task || []).slice(0, 5).map((t) => t.name || t.statement || t),
      topSkills: (skills?.element || [])
        .sort((a, b) => (b.score?.value || 0) - (a.score?.value || 0))
        .slice(0, 6)
        .map((s) => s.name),
      outlook: outlook
        ? {
            category: outlook.category || "",
            description: outlook.description || "",
          }
        : null,
    };
  } catch (err) {
    console.error("O*NET detail error:", err.message);
    return null;
  }
}

/**
 * Full enrichment: search for career → get details on best match
 */
async function enrichCareerWithOnet(careerTitle) {
  const matches = await searchOccupations(careerTitle);
  if (!matches.length) return null;

  const best = matches[0];
  const details = await getOccupationDetails(best.code);

  return {
    onetCode: best.code,
    onetTitle: best.title,
    onetUrl: `https://www.onetonline.org/link/summary/${best.code}`,
    ...details,
  };
}

module.exports = { searchOccupations, getOccupationDetails, enrichCareerWithOnet };
