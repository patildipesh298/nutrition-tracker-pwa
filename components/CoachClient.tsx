'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChefHat, RefreshCw, ShoppingCart, Sparkles } from 'lucide-react';
import PageHeader from './PageHeader';
import { ExerciseLog, MealLog, Profile, VitalLog } from '@/lib/types';
import { riskNotes, sumMeals, targets } from '@/lib/nutrition';
import { readLS, today, toast } from '@/lib/storage';
import { dailyWellnessScore, grocerySuggestions, mealPlanSuggestions, mealReview } from '@/lib/smartFeatures';

export default function CoachClient() {
  const [profile, setProfile] = useState<Profile>({} as any);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [vitals, setVitals] = useState<VitalLog[]>([]);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [groceryAi, setGroceryAi] = useState<any>(null);
  const [mealPlanAi, setMealPlanAi] = useState<any>(null);
  const [loading, setLoading] = useState('');

  useEffect(() => {
    setProfile(readLS<Profile>('profile', {} as any));
    setMeals(readLS<MealLog[]>('foods', []).filter(x => x.date === today()));
    setVitals(readLS<VitalLog[]>('vitals', []).filter(x => x.date === today()));
    setExercises(readLS<ExerciseLog[]>('exercise_logs', []).filter(x => x.date === today()));
  }, []);

  const t = targets(profile); const s = sumMeals(meals); const wellness = dailyWellnessScore(meals, vitals, exercises, profile); const review = mealReview(meals, profile);
  const localGroceries = grocerySuggestions(meals, profile); const localMeals = mealPlanSuggestions(profile);
  const guidance = useMemo(() => [...riskNotes(meals, vitals, profile), `Calories today: ${Math.round(s.cal)} / ${t.calories}.`, `Protein today: ${Math.round(s.p)}g / ${t.protein}g.`], [meals, vitals, profile, s.cal, s.p, t.calories, t.protein]);

  async function callAi(kind: 'grocery' | 'meal') {
    setLoading(kind);
    try {
      const url = kind === 'grocery' ? '/api/ai-grocery-planner' : '/api/ai-meal-planner';
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, meals, vitals, exercises }) });
      const d = await r.json(); if (!r.ok || d.error) throw new Error(d.error || 'Smart planner failed');
      if (kind === 'grocery') setGroceryAi(d); else setMealPlanAi(d);
      toast('Planner ready');
    } catch (e: any) { toast(e?.message || 'Using smart local planner for now.'); }
    finally { setLoading(''); }
  }

  return <div className="page-wrap">
    <PageHeader title="Wellness Insights" subtitle="Smart meal review, grocery ideas and meal planning for meal review, grocery ideas and meal planning. Wellness guidance only." action={<button className="btn btn-primary" onClick={() => location.reload()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</button>} />
    <section className="mb-5 grid gap-4 md:grid-cols-[.8fr_1.2fr]"><div className="card bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white"><Sparkles/><p className="mt-3 text-xs font-black uppercase tracking-[.18em] opacity-80">Wellness score</p><b className="mt-2 block text-6xl tracking-[-.08em]">{wellness.score}</b><p className="font-bold opacity-90">{wellness.label}</p><div className="mt-4 grid gap-2 text-sm font-bold"><div className="flex justify-between"><span>Nutrition</span><span>{wellness.nutrition}%</span></div><div className="flex justify-between"><span>Water</span><span>{wellness.water}%</span></div><div className="flex justify-between"><span>Movement</span><span>{wellness.movement}%</span></div></div></div><div className="card p-5"><h2 className="section-title">Smart meal review</h2><div className="mt-4 rounded-3xl bg-slate-50 p-4"><b className="text-3xl">{review.score}/10</b><p className="mt-1 font-black text-slate-900">{review.title}</p><div className="mt-3 grid gap-2">{review.notes.map((p, i) => <p key={i} className="text-sm font-semibold text-slate-600">• {p}</p>)}</div></div></div></section>
    <section className="card mb-5 p-5"><h2 className="section-title">Today’s guidance</h2><div className="mt-4 grid gap-3">{guidance.map((p, i) => <div key={i} className="rounded-2xl bg-gradient-to-r from-brand-50 to-white p-4 text-sm font-semibold text-slate-700 ring-1 ring-brand-100">{p}</div>)}</div></section>
    <section className="mb-5 grid gap-4 md:grid-cols-2"><div className="card p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShoppingCart className="text-green-600"/><h2 className="section-title">Smart grocery suggestions</h2></div><button onClick={() => callAi('grocery')} disabled={loading === 'grocery'} className="btn btn-soft !py-2">{loading === 'grocery' ? 'Creating...' : 'Generate'}</button></div>{groceryAi?.sections ? <div className="mt-4 grid gap-3">{groceryAi.sections.map((s: any, i: number) => <div key={i} className="rounded-2xl bg-green-50 p-4"><b>{s.title}</b><p className="micro mt-1">{(s.items || []).join(' · ')}</p></div>)}</div> : <div className="mt-4 flex flex-wrap gap-2">{localGroceries.map(x => <span key={x} className="rounded-full bg-green-50 px-3 py-2 text-sm font-black text-green-700 ring-1 ring-green-100">{x}</span>)}</div>}</div><div className="card p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ChefHat className="text-indigo-600"/><h2 className="section-title">Meal planning</h2></div><button onClick={() => callAi('meal')} disabled={loading === 'meal'} className="btn btn-soft !py-2">{loading === 'meal' ? 'Planning...' : 'Generate'}</button></div><div className="mt-4 grid gap-3">{(mealPlanAi?.meals || localMeals).map((x: any, i: number) => <div key={i} className="rounded-2xl bg-indigo-50 p-4"><b>{x.meal}</b><p className="mt-1 text-sm font-semibold text-slate-700">{x.idea}</p><p className="micro mt-1">{x.portionTip || x.note}</p></div>)}</div></div></section>
    <section className="card p-5"><div className="flex items-center gap-2"><CalendarDays className="text-orange-500"/><h2 className="section-title">Reminder suggestions</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><b>Meal reminder</b><p className="micro">Breakfast, lunch and dinner logging nudges.</p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><b>Water reminder</b><p className="micro">Simple hydration nudges through the day.</p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><b>Vitals reminder</b><p className="micro">BP/glucose reminders for elder wellness.</p></div></div><p className="micro mt-4">Native push reminders will be enabled in the Android build using Capacitor notifications.</p></section>
  </div>;
}
