const fetch = require("node-fetch");

async function getCareersFromESCO() {
  try {
    const response = await fetch(
      "https://ec.europa.eu/esco/api/resource/occupation?language=en&limit=1000"
    );

    const data = await response.json();

    const careers = data._embedded.results.map((career) => ({
      id: career.uri,
      title: career.title,
      description: career.description?.en || "",
    }));

    return careers;
  } catch (error) {
    console.error("ESCO fetch error:", error);
    return [];
  }
}

module.exports = { getCareersFromESCO };
