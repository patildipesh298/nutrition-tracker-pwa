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
    const context = body.context || {};

    const systemPrompt = `You are NutriFamily Elder Pro AI Wellness Assistant. You provide safe, practical, general wellness guidance for nutrition, exercise, weight, elder care, hydration, sleep, and tracking habits. You are NOT a doctor and must not diagnose disease, prescribe medication, change medication, or replace a physician or registered dietitian. For diabetes, blood pressure, kidney disease, heart disease, thyroid, abnormal labs, pregnancy, severe symptoms, medication decisions, or urgent symptoms, recommend consulting a doctor/registered dietitian. Avoid extreme diets and unsafe exercise. Keep answers supportive, family-friendly, and easy to follow. Return valid JSON only.`;

    const userPrompt = `Analyze this user's wellness tracking data and return structured JSON.

Required JSON shape:
{
  "summary": "short friendly summary",
  "riskFlags": ["only important safety flags"],
  "foodSuggestions": ["specific food suggestions"],
  "exerciseSuggestions": ["safe exercise suggestions"],
  "weightSuggestions": ["weight trend or goal guidance"],
  "caregiverNotes": ["family/caregiver reminders"],
  "tomorrowPlan": ["3 to 6 practical actions"],
  "doctorDietitianQuestions": ["questions to ask clinician if applicable"],
  "disclaimer": "general wellness guidance only, not medical diagnosis"
}

User data:
${JSON.stringify(context, null, 2)}`;

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
        temperature: 0.35,
        max_tokens: 1400,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "DeepSeek API request failed" });
    }

    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { parsed = { summary: content, disclaimer: "General wellness guidance only; not medical diagnosis." }; }

    return res.status(200).json({ success: true, result: parsed });
  } catch (error) {
    return res.status(500).json({ error: error.message || "AI suggestions failed" });
  }
}
