export default async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “GET, OPTIONS”);
if (req.method === “OPTIONS”) return res.status(200).end();

const { q } = req.query;
if (!q) return res.status(400).json({ error: “Geef zoekterm op via ?q=…” });

const resultaten = {};

try {
const ah = await zoekAH(q);
if (ah) resultaten[“Albert Heijn”] = ah;
} catch (e) { console.log(“AH fout:”, e.message); }

try {
const jumbo = await zoekJumbo(q);
if (jumbo) resultaten[“Jumbo”] = jumbo;
} catch (e) { console.log(“Jumbo fout:”, e.message); }

res.setHeader(“Cache-Control”, “public, max-age=1800”);
return res.status(200).json({
query: q,
bijgewerktOp: new Date().toISOString(),
resultaten,
});
}

async function zoekAH(query) {
const tokenRes = await fetch(
“https://api.ah.nl/mobile-auth/v1/auth/token/anonymous”,
{
method: “POST”,
headers: { “Content-Type”: “application/json”, “User-Agent”: “Appie/8.22.3” },
body: JSON.stringify({ clientId: “appie” }),
}
);
if (!tokenRes.ok) return null;
const tokenData = await tokenRes.json();
const token = tokenData.access_token;
if (!token) return null;

const zoekRes = await fetch(
`https://api.ah.nl/mobile-services/product/search/v2?query=${encodeURIComponent(query)}&sortOn=RELEVANCE&size=5`,
{
headers: {
Authorization: `Bearer ${token}`,
“User-Agent”: “Appie/8.22.3”,
“x-application”: “AHWEBSHOP”,
},
}
);
if (!zoekRes.ok) return null;
const data = await zoekRes.json();

for (const card of data.cards || []) {
for (const p of card.products || []) {
const prijs = p.price?.now;
if (!prijs || prijs <= 0) continue;
const normaal = p.price?.was || prijs;
return {
naam: p.title || query,
prijs: Math.round(prijs * 100),
normaal: Math.round(normaal * 100),
aanbieding: normaal > prijs ? “Bonus” : null,
inhoud: p.unitSize || “”,
};
}
}
return null;
}

async function zoekJumbo(query) {
const res = await fetch(
`https://mobileapi.jumbo.com/v17/search?q=${encodeURIComponent(query)}&offset=0&limit=5&sort=relevance`,
{
headers: {
“User-Agent”: “Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)”,
Accept: “application/json”,
},
}
);
if (!res.ok) return null;
const data = await res.json();

for (const p of data.products?.data || []) {
const prijs = p.prices?.price?.amount;
if (!prijs || prijs <= 0) continue;
const normaal = p.prices?.promotionalPrice?.amount || prijs;
return {
naam: p.title || query,
prijs: Math.round(prijs),
normaal: Math.round(normaal),
aanbieding: normaal > prijs ? “Weekdeal” : null,
inhoud: p.quantity || “”,
};
}
return null;
}
