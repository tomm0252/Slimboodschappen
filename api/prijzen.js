export default async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “GET, OPTIONS”);
if (req.method === “OPTIONS”) return res.status(200).end();

const { q, winkels } = req.query;
if (!q) return res.status(400).json({ error: “Geef zoekterm op via ?q=…” });

const gewensteWinkels = (winkels || “ah,jumbo,plus,dirk,deka,aldi”).split(”,”);
const resultaten = {};

try {
const taken = [];

```
if (gewensteWinkels.includes("ah")) {
  taken.push(
    zoekAH(q).then(r => { if (r) resultaten["Albert Heijn"] = r; }).catch(() => {})
  );
}
if (gewensteWinkels.includes("jumbo")) {
  taken.push(
    zoekJumbo(q).then(r => { if (r) resultaten["Jumbo"] = r; }).catch(() => {})
  );
}
if (gewensteWinkels.some(w => ["plus","dirk","deka","aldi","hoogvliet","vomar"].includes(w))) {
  taken.push(
    zoekOverig(q, gewensteWinkels).then(r => Object.assign(resultaten, r)).catch(() => {})
  );
}

await Promise.allSettled(taken);

res.setHeader("Cache-Control", "public, max-age=3600");
return res.status(200).json({
  query: q,
  bijgewerktOp: new Date().toISOString(),
  resultaten,
});
```

} catch (err) {
return res.status(500).json({ error: err.message });
}
}

// ── ALBERT HEIJN ──────────────────────────────────────────────────────────────
async function zoekAH(query) {
try {
// Anoniem token ophalen — geen login nodig
const tokenRes = await fetch(“https://api.ah.nl/mobile-auth/v1/auth/token/anonymous”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“User-Agent”: “Appie/8.22.3”,
},
body: JSON.stringify({ clientId: “appie” }),
});
if (!tokenRes.ok) return null;
const { access_token } = await tokenRes.json();

```
// Producten zoeken
const zoekRes = await fetch(
  `https://api.ah.nl/mobile-services/product/search/v2?query=${encodeURIComponent(query)}&sortOn=RELEVANCE&size=5`,
  {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "Appie/8.22.3",
      "x-application": "AHWEBSHOP",
    },
  }
);
if (!zoekRes.ok) return null;
const data = await zoekRes.json();

for (const card of data.cards || []) {
  for (const p of card.products || []) {
    const prijs = p.price?.now;
    if (!prijs) continue;
    const normaal = p.price?.was || prijs;
    return {
      naam: p.title,
      prijs: Math.round(prijs * 100),
      normaal: Math.round(normaal * 100),
      aanbieding: normaal > prijs ? "Bonus" : null,
      inhoud: p.unitSize || "",
    };
  }
}
return null;
```

} catch (e) {
return null;
}
}

// ── JUMBO ─────────────────────────────────────────────────────────────────────
async function zoekJumbo(query) {
try {
const res = await fetch(
`https://mobileapi.jumbo.com/v17/search?q=${encodeURIComponent(query)}&offset=0&limit=5&sort=relevance`,
{ headers: { “User-Agent”: “Mozilla/5.0”, Accept: “application/json” } }
);
if (!res.ok) return null;
const data = await res.json();

```
for (const p of data.products?.data || []) {
  const prijs = p.prices?.price?.amount;
  if (!prijs) continue;
  const normaal = p.prices?.promotionalPrice?.amount || prijs;
  return {
    naam: p.title,
    prijs: Math.round(prijs),
    normaal: Math.round(normaal),
    aanbieding: normaal > prijs ? "Weekdeal" : null,
    inhoud: p.quantity || "",
  };
}
return null;
```

} catch (e) {
return null;
}
}

// ── OVERIGE WINKELS VIA CHECKJEBON DATA ──────────────────────────────────────
const WINKEL_MAP = {
plus: “Plus”, dirk: “Dirk”, deka: “Dekamarkt”,
aldi: “Aldi”, hoogvliet: “Hoogvliet”, vomar: “Vomar”,
};

let _cjbCache = null;
let _cjbTijd = 0;

async function laadCjb() {
if (_cjbCache && Date.now() - _cjbTijd < 3600000) return _cjbCache;
try {
const res = await fetch(
“https://raw.githubusercontent.com/supermarkt/checkjebon/main/data/supermarkets.json”
);
if (!res.ok) return null;
_cjbCache = await res.json();
_cjbTijd = Date.now();
return _cjbCache;
} catch (e) {
return null;
}
}

async function zoekOverig(query, gewensteWinkels) {
const data = await laadCjb();
if (!data) return {};
const resultaten = {};
const q = query.toLowerCase().trim();
const woorden = q.split(/\s+/).filter(w => w.length > 2);

for (const supermarkt of data) {
const code = supermarkt.key?.toLowerCase();
const appNaam = WINKEL_MAP[code];
if (!appNaam || !gewensteWinkels.includes(code)) continue;

```
let beste = null;
let besteScore = Infinity;

for (const product of supermarkt.products || []) {
  const titel = (product.title || "").toLowerCase();
  if (!woorden.every(w => titel.includes(w))) continue;
  const score = titel.length;
  if (score < besteScore) { besteScore = score; beste = product; }
}

if (beste?.price) {
  const prijs = Math.round(beste.price * 100);
  const normaal = beste.originalPrice ? Math.round(beste.originalPrice * 100) : prijs;
  resultaten[appNaam] = {
    naam: beste.title,
    prijs,
    normaal,
    aanbieding: normaal > prijs ? "Aanbieding" : null,
    inhoud: beste.unitSize || "",
  };
}
```

}
return resultaten;
}
