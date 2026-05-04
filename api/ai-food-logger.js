export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing DEEPSEEK_API_KEY in Vercel environment variables." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const text = String(body.text || "").slice(0, 1200).trim();
    const defaultMeal = body.defaultMeal || "Snacks";

    if (!text) return res.status(400).json({ error: "Food sentence is required." });

    const systemPrompt = `You are a food logging parser for NutriFamily Elder Pro. Extract food items from natural language voice text. Do not give medical advice. Return valid JSON only. If uncertain, still return best-effort items with lower confidence. Use meal values exactly: Breakfast, Lunch, Dinner, Snacks. Use unit values preferably: g, ml, serving, cup, bowl, piece, glass, tbsp, tsp. Do not calculate nutrition.`;

    const userPrompt = `Parse this food logging sentence into JSON.

Sentence: ${text}
Default meal if not mentioned: ${defaultMeal}

Return JSON shape only:
{
  "foods": [
    {
      "name": "simple food name without quantity words",
      "quantity": 1,
      "unit": "g/ml/serving/cup/bowl/piece/glass/tbsp/tsp",
      "meal": "Breakfast/Lunch/Dinner/Snacks",
      "time": "time mentioned or empty string",
      "confidence": 0.0
    }
  ]
}

Examples:
"Add 2 chapatis and 250 ml milk for breakfast" => chapati quantity 2 unit serving meal Breakfast; milk quantity 250 unit ml meal Breakfast.
"I had 150 grams rice and one bowl dal for lunch" => rice 150 g Lunch; dal 1 bowl Lunch.`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 700,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "DeepSeek food parser failed" });
    }

    let parsed = { foods: [] };
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = { foods: [] };
    }

    const allowedMeals = new Set(["Breakfast", "Lunch", "Dinner", "Snacks"]);
    const foods = Array.isArray(parsed.foods) ? parsed.foods.slice(0, 12).map((item) => ({
      name: String(item.name || "").replace(/[^a-zA-Z0-9\s&'-]/g, "").trim(),
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      unit: String(item.unit || "serving").toLowerCase().trim(),
      meal: allowedMeals.has(item.meal) ? item.meal : defaultMeal,
      time: String(item.time || "").slice(0, 50),
      confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0.7))
    })).filter((item) => item.name) : [];

    return res.status(200).json({ success: true, foods });
  } catch (error) {
    return res.status(500).json({ error: error.message || "AI food logger failed" });
  }
}
