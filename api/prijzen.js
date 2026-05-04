module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { q } = req.query;

  if (!q) {
    return res.status(200).json({ status: "Server werkt!", gebruik: "Voeg ?q=melk toe" });
  }

  const resultaten = {};

  try {
    const tokenRes = await fetch("https://api.ah.nl/mobile-auth/v1/auth/token/anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Appie/8.22.3" },
      body: JSON.stringify({ clientId: "appie" }),
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    if (token) {
      const zoekRes = await fetch(
        "https://api.ah.nl/mobile-services/product/search/v2?query=" + encodeURIComponent(q) + "&sortOn=RELEVANCE&size=5",
        {
          headers: {
            Authorization: "Bearer " + token,
            "User-Agent": "Appie/8.22.3",
            "x-application": "AHWEBSHOP",
          },
        }
      );
      const data = await zoekRes.json();
      for (const card of data.cards || []) {
        for (const p of card.products || []) {
          const prijs = p.price && p.price.now;
          if (!prijs || prijs <= 0) continue;
          const normaal = (p.price && p.price.was) || prijs;
          resultaten["Albert Heijn"] = {
            naam: p.title || q,
            prijs: Math.round(prijs * 100),
            normaal: Math.round(normaal * 100),
            aanbieding: normaal > prijs ? "Bonus" : null,
            inhoud: p.unitSize || "",
          };
          break;
        }
        if (resultaten["Albert Heijn"]) break;
      }
    }
  } catch(e) {
    resultaten["ah_fout"] = e.message;
  }

  try {
    const jumboRes = await fetch(
      "https://mobileapi.jumbo.com/v17/search?q=" + encodeURIComponent(q) + "&offset=0&limit=5&sort=relevance",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );
    const data = await jumboRes.json();
    for (const p of (data.products && data.products.data) || []) {
      const prijs = p.prices && p.prices.price && p.prices.price.amount;
      if (!prijs || prijs <= 0) continue;
      const normaal = (p.prices && p.prices.promotionalPrice && p.prices.promotionalPrice.amount) || prijs;
      resultaten["Jumbo"] = {
        naam: p.title || q,
        prijs: Math.round(prijs),
        normaal: Math.round(normaal),
        aanbieding: normaal > prijs ? "Weekdeal" : null,
        inhoud: p.quantity || "",
      };
      break;
    }
  } catch(e) {
    resultaten["jumbo_fout"] = e.message;
  }

  res.setHeader("Cache-Control", "public, max-age=1800");
  return res.status(200).json({
    query: q,
    bijgewerktOp: new Date().toISOString(),
    resultaten,
  });
};
