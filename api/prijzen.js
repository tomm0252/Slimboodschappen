module.exports = async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
const { q } = req.query;
return res.status(200).json({
status: “werkt!”,
query: q || “geen zoekterm”,
tijd: new Date().toISOString()
});
};
