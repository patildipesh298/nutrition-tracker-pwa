import { NextRequest, NextResponse } from 'next/server';

function safeJson(text: string) {
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({
        success: true,
        food: {
          name: 'Nutrition label food', serving: '1 serving', cal: 0, p: 0, c: 0, f: 0, fiber: 0, sugar: 0, sodium: 0,
          note: 'OPENAI_API_KEY is missing. Enter label values manually.'
        },
        warning: 'Configure OPENAI_API_KEY in Vercel to scan labels automatically.'
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
        temperature: 0,
        max_tokens: 700,
        messages: [
          { role: 'system', content: 'You extract nutrition facts from food label images. Return valid JSON only. Do not invent values that are not visible.' },
          { role: 'user', content: [
            { type: 'text', text: 'Read this nutrition label. Return {"food":{"name":"","serving":"","cal":0,"p":0,"c":0,"f":0,"fiber":0,"sugar":0,"sodium":0,"potassium":0,"calcium":0,"iron":0,"vitaminA":0,"vitaminC":0},"warnings":[]}. Units: calories kcal, macros grams, sodium/potassium/calcium/iron mg unless the label clearly states otherwise. If product name is not visible use Nutrition label food.' },
            { type: 'image_url', image_url: { url: imageBase64, detail: 'high' } }
          ]}
        ]
      })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || 'Label scanner failed' }, { status: response.status });
    const parsed = safeJson(data?.choices?.[0]?.message?.content || '') || {};
    return NextResponse.json({ success: true, ...parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Label scanner failed' }, { status: 500 });
  }
}
