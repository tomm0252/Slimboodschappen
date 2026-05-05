module.exports = async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
const { q } = req.query;
if (!q) return res.status(200).json({ status: “werkt!” });

try {
// Stap 1: token
const t = await fetch(“https://api.ah.nl/mobile-auth/v1/auth/token/anonymous”, {
method: “POST”,
headers: { “Content-Type”: “application/json”, “User-Agent”: “Appie/8.22.3” },
body: JSON.stringify({ clientId: “appie” })
});
const { access_token } = await t.json();

```
// Stap 2: zoeken — stuur de RAW response terug zodat we de structuur zien
const s = await fetch("https://api.ah.nl/mobile-services/product/search/v2?query=" + encodeURIComponent(q) + "&sortOn=RELEVANCE&size=5&page=0", {
  headers: {
    "Authorization": "Bearer " + access_token,
    "User-Agent": "Appie/8.22.3",
    "x-application": "AHWEBSHOP",
    "x-clientversion": "8.22.3",
    "Accept": "application/json"
  }
});
const raw = await s.json();

// Stuur de eerste card terug zodat we zien hoe het is opgebouwd
return res.status(200).json({
  totaal_cards: (raw.cards || []).length,
  eerste_card: raw.cards && raw.cards[0] ? raw.cards[0] : null,
  tweede_card: raw.cards && raw.cards[1] ? raw.cards[1] : null,
  keys_in_response: Object.keys(raw)
});
```

} catch(e) {
return res.status(200).json({ fout: e.message });
}
};