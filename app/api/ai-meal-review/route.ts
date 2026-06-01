import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI service key is missing' }, { status: 500 });
    const prompt = `You are Eatlyte, a wellness nutrition assistant. Give a short non-medical meal review. Return JSON only: {"score": number 1-10, "title": string, "tips": string[], "caution": string}. Data: ${JSON.stringify(body).slice(0, 5000)}`;
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.3, messages: [{ role: 'system', content: 'Return valid JSON only. Do not diagnose or provide medical treatment.' }, { role: 'user', content: prompt }] })
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || 'Meal review failed' }, { status: 500 });
    const text = data?.choices?.[0]?.message?.content || '{}';
    try { return NextResponse.json(JSON.parse(text.replace(/```json|```/g, '').trim())); }
    catch { return NextResponse.json({ score: 7, title: 'Meal reviewed', tips: [text.slice(0, 500)], caution: 'Wellness guidance only.' }); }
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Meal review failed' }, { status: 500 }); }
}
