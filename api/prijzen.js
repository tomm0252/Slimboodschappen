module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { q } = req.query;
  if (!q) return res.status(200).json({ status: "werkt!" });
  const resultaten = {};
  try {
    const t = await fetch("https://api.ah.nl/mobile-auth/v1/auth/token/anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Appie/8.22.3" },
      body: JSON.stringify({ clientId: "appie" })
    });
    const td = await t.json();
    if (td.access_token) {
      const s = await fetch("https://api.ah.nl/mobile-services/product/search/v2?query=" + encodeURIComponent(q) + "&sortOn=RELEVANCE&size=5", {
        headers: { "Authorization": "Bearer " + td.access_token, "User-Agent": "Appie/8.22.3", "x-application": "AHWEBSHOP" }
      });
      const d = await s.json();
      for (const c of d.cards || []) {
        for (const p of c.products || []) {
          if (p.price && p.price.now > 0) {
            resultaten["Albert Heijn"] = {
              naam: p.title,
              prijs: Math.round(p.price.now * 100),
              normaal: Math.round((p.price.was || p.price.now) * 100),
              aanbieding: p.price.was > p.price.now ? "Bonus" : null
            };
            break;
          }
        }
        if (resultaten["Albert Heijn"]) break;
      }
    }
  } catch(e) {}
  try {
    const j = await fetch("https://mobileapi.jumbo.com/v17/search?q=" + encodeURIComponent(q) + "&offset=0&limit=5", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    const jd = await j.json();
    for (const p of (jd.products && jd.products.data) || []) {
      if (p.prices && p.prices.price && p.prices.price.amount > 0) {
        resultaten["Jumbo"] = {
          naam: p.title,
          prijs: Math.round(p.prices.price.amount),
          normaal: Math.round((p.prices.promotionalPrice && p.prices.promotionalPrice.amount) || p.prices.price.amount),
          aanbieding: p.prices.promotionalPrice ? "Weekdeal" : null
        };
        break;
      }
    }
  } catch(e) {}
  res.setHeader("Cache-Control", "public, max-age=1800");
  return res.status(200).json({
    query: q,
    bijgewerktOp: new Date().toISOString(),
    resultaten
  });
};
