import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI service key is missing' }, { status: 500 });
    const prompt = `Create a simple 1-day meal plan. Indian + global friendly. Return JSON only: {"meals":[{"meal":string,"idea":string,"portionTip":string}],"prepTips":string[]}. Data:${JSON.stringify(body).slice(0,5000)}`;
    const res = await fetch('https://api.deepseek.com/chat/completions', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${apiKey}`}, body: JSON.stringify({model:'deepseek-chat', temperature:0.4, messages:[{role:'system', content:'Return valid JSON only. No diagnosis. No medical treatment.'},{role:'user', content:prompt}]}) });
    const data = await res.json(); if(!res.ok) return NextResponse.json({error:data?.error?.message || 'Meal planner failed'}, {status:500});
    const text = data?.choices?.[0]?.message?.content || '{}';
    try { return NextResponse.json(JSON.parse(text.replace(/```json|```/g,'').trim())); } catch { return NextResponse.json({meals:[{meal:'Plan', idea:text.slice(0,500), portionTip:'Adjust to your goals.'}], prepTips:[]}); }
  } catch(error:any){ return NextResponse.json({error:error?.message || 'Meal planner failed'}, {status:500}); }
}
