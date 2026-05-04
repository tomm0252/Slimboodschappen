module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { q } = req.query;
  if (!q) return res.status(200).json({ status: "werkt!" });
  const resultaten = {};

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const t = await fetch("https://api.ah.nl/mobile-auth/v1/auth/token/anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Appie/8.22.3" },
      body: JSON.stringify({ clientId: "appie" }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const td = await t.json();
    if (td.access_token) {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 5000);
      const s = await fetch("https://api.ah.nl/mobile-services/product/search/v2?query=" + encodeURIComponent(q) + "&sortOn=RELEVANCE&size=5", {
        headers: { "Authorization": "Bearer " + td.access_token, "User-Agent": "Appie/8.22.3", "x-application": "AHWEBSHOP" },
        signal: controller2.signal
      });
      clearTimeout(timeout2);
      const d = await s.json();
      for (const c of d.cards || []) {
        for (const p of c.products || []) {
          if (p.price && p.price.now > 0) {
            resultaten["Albert Heijn"] = { naam: p.title, prijs: Math.round(p.price.now * 100), normaal: Math.round((p.price.was || p.price.now) * 100), aanbieding: p.price.was > p.price.now ? "Bonus" : null };
            break;
          }
        }
        if (resultaten["Albert Heijn"]) break;
      }
    }
  } catch(e) { resultaten["ah_fout"] = e.message; }

  try {
    const controller3 = new AbortController();
    const timeout3 = setTimeout(() => controller3.abort(), 5000);
    const j = await fetch("https://mobileapi.jumbo.com/v17/search?q=" + encodeURIComponent(q) + "&offset=0&limit=5", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      signal: controller3.signal
    });
    clearTimeout(timeout3);
    const jd = await j.json();
    for (const p of (jd.products && jd.products.data) || []) {
      if (p.prices && p.prices.price && p.prices.price.amount > 0) {
        resultaten["Jumbo"] = { naam: p.title, prijs: Math.round(p.prices.price.amount), normaal: Math.round((p.prices.promotionalPrice && p.prices.promotionalPrice.amount) || p.prices.price.amount), aanbieding: p.prices.promotionalPrice ? "Weekdeal" : null };
        break;
      }
    }
  } catch(e) { resultaten["jumbo_fout"] = e.message; }

  res.setHeader("Cache-Control", "public, max-age=1800");
  return res.status(200).json({ query: q, bijgewerktOp: new Date().toISOString(), resultaten });
};
