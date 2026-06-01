import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI service key is missing' }, { status: 500 });
    const prompt = `Summarize these manually entered wellness lab values for a user. No diagnosis. Return JSON only: {"summary": string, "highlights": string[], "questionsForDoctor": string[], "disclaimer": string}. Data: ${JSON.stringify(body).slice(0, 5000)}`;
    const res = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.2, messages: [{ role: 'system', content: 'Return valid JSON only. Do not diagnose.' }, { role: 'user', content: prompt }] }) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || 'Report summary failed' }, { status: 500 });
    const text = data?.choices?.[0]?.message?.content || '{}';
    try { return NextResponse.json(JSON.parse(text.replace(/```json|```/g, '').trim())); }
    catch { return NextResponse.json({ summary: text.slice(0, 800), highlights: [], questionsForDoctor: [], disclaimer: 'Not medical advice.' }); }
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Report summary failed' }, { status: 500 }); }
}
