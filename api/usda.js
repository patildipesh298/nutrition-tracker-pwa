export default async function handler(req, res) {
  const q = req.query.q || '';
  const key = process.env.USDA_API_KEY;
  if (!key) return res.status(500).json({ error: 'USDA_API_KEY missing in Vercel environment variables' });
  if (!q) return res.status(400).json({ error: 'Missing q' });
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}&query=${encodeURIComponent(q)}&pageSize=15`;
    const r = await fetch(url, { headers: { accept: 'application/json' } });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
