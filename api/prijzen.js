module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { q } = req.query;
  if (!q) return res.status(200).json({ status: "werkt!" });
  const log = [];

  try {
    log.push("AH token ophalen...");
    const t = await fetch("https://api.ah.nl/mobile-auth/v1/auth/token/anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Appie/8.22.3" },
      body: JSON.stringify({ clientId: "appie" })
    });
    log.push("AH token status: " + t.status);
    const td = await t.json();
    log.push("AH token keys: " + Object.keys(td).join(","));
    if (td.access_token) {
      log.push("AH zoeken...");
      const s = await fetch("https://api.ah.nl/mobile-services/product/search/v2?query=" + encodeURIComponent(q) + "&sortOn=RELEVANCE&size=5", {
        headers: { "Authorization": "Bearer " + td.access_token, "User-Agent": "Appie/8.22.3", "x-application": "AHWEBSHOP" }
      });
      log.push("AH zoek status: " + s.status);
      const d = await s.json();
      log.push("AH cards: " + (d.cards || []).length);
    }
  } catch(e) { log.push("AH FOUT: " + e.message); }

  try {
    log.push("Jumbo zoeken...");
    const j = await fetch("https://mobileapi.jumbo.com/v17/search?q=" + encodeURIComponent(q) + "&offset=0&limit=5", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    log.push("Jumbo status: " + j.status);
    const jd = await j.json();
    log.push("Jumbo producten: " + ((jd.products && jd.products.data) || []).length);
  } catch(e) { log.push("Jumbo FOUT: " + e.message); }

  return res.status(200).json({ query: q, log });
};
