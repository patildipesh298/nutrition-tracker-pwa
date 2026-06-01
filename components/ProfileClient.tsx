'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from './PageHeader';
import { Profile } from '@/lib/types';
import { readLS, toast, writeLS } from '@/lib/storage';
import { targets } from '@/lib/nutrition';
import { defaultProfile, fetchProfileStatus, upsertProfile } from '@/lib/supabaseData';
import { getSupabase } from '@/lib/supabaseClient';

export default function ProfileClient() {
  const router = useRouter();
  const search = useSearchParams();
  const isNew = search.get('new') === '1';
  const [p, setP] = useState<Profile>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const local = readLS('profile', defaultProfile);
      try {
        const status = await fetchProfileStatus();
        setP(status.profile || local || defaultProfile);
      } catch {
        setP(local || defaultProfile);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const t = targets(p);

  async function logout() {
    const sb = getSupabase();
    await sb?.auth.signOut();
    router.replace('/login');
  }

  async function save() {
    if (!p.name.trim()) return toast('Please enter full name');
    if (!p.age || !p.height || !p.weight) return toast('Please complete age, height and weight');
    setSaving(true);
    try {
      await upsertProfile(p);
      writeLS('profile', p);
      toast('Profile saved. Your dashboard is now personalized.');
      router.replace('/dashboard');
    } catch (e: any) {
      const message = e?.message || 'Profile could not be saved. Please check Supabase RLS policies.';
      toast(message);
      console.error('Profile save failed', e);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof Profile, v: any) => setP({ ...p, [k]: v });

  if (loading) return <div className="page-wrap"><div className="card p-5 text-sm font-bold text-slate-600">Loading profile...</div></div>;

  return <div className="page-wrap">
    {isNew && <section className="onboarding-banner mb-4">
      <span>Step 1 of 2</span>
      <h1>Create your wellness profile</h1>
      <p>This is required for new users so calories, sugar awareness, protein targets, elder reminders and smart suggestions are personalized.</p>
    </section>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <PageHeader title={isNew ? 'Welcome to Eatlyte' : 'Profile'} subtitle="Complete this once. You can update it anytime as goals, diet, medicines or health conditions change." />
      <button type="button" onClick={logout} className="btn btn-soft w-full sm:w-auto">Logout</button>
    </div>
    <div className="desktop-grid">
      <section className="card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">Full name *</span><input className="input" value={p.name} onChange={e => set('name', e.target.value)} placeholder="Dad, Mom, Pratik..." /></label>
          <label><span className="label">Age *</span><input className="input" type="number" value={p.age} onChange={e => set('age', +e.target.value)} /></label>
          <label><span className="label">Gender</span><select className="input" value={p.gender} onChange={e => set('gender', e.target.value)}><option>male</option><option>female</option><option>other</option></select></label>
          <label><span className="label">Height cm *</span><input className="input" type="number" value={p.height} onChange={e => set('height', +e.target.value)} /></label>
          <label><span className="label">Weight kg *</span><input className="input" type="number" value={p.weight} onChange={e => set('weight', +e.target.value)} /></label>
          <label><span className="label">Activity</span><select className="input" value={p.activity} onChange={e => set('activity', +e.target.value)}><option value={1.2}>Sedentary</option><option value={1.375}>Light activity</option><option value={1.55}>Moderate</option><option value={1.725}>Very active</option></select></label>
          <label><span className="label">Goal</span><select className="input" value={p.goal} onChange={e => set('goal', e.target.value)}><option value="maintain">Maintain weight</option><option value="loss">Weight loss</option><option value="gain">Muscle gain</option><option value="elder-maintain">Balanced maintenance</option></select></label>
          <label><span className="label">Diet</span><select className="input" value={p.diet} onChange={e => set('diet', e.target.value)}><option>Vegetarian</option><option>Non-vegetarian</option><option>Eggetarian</option><option>Vegan</option><option>Jain</option></select></label>
          <label><span className="label">Cuisine</span><select className="input" value={p.cuisine} onChange={e => set('cuisine', e.target.value)}><option>Indian</option><option>Mixed Indian + Global</option><option>Global</option></select></label>
          <label><span className="label">Allergies / restrictions</span><input className="input" value={p.allergies} onChange={e => set('allergies', e.target.value)} placeholder="peanuts, low salt..." /></label>
          <label className="sm:col-span-2"><span className="label">Conditions</span><select multiple className="input min-h-32" value={p.conditions} onChange={e => set('conditions', Array.from(e.target.selectedOptions).map(o => o.value))}><option value="diabetes">Diabetes / sugar</option><option value="hypertension">High BP</option><option value="cholesterol">Cholesterol</option><option value="kidney">Kidney concern</option><option value="thyroid">Thyroid</option><option value="arthritis">Joint pain</option><option value="heart">Heart condition</option></select></label>
          <label className="sm:col-span-2"><span className="label">Medicines</span><textarea className="input" value={p.medicines} onChange={e => set('medicines', e.target.value)} /></label>
          <label className="sm:col-span-2"><span className="label">Doctor / dietitian notes</span><textarea className="input" value={p.doctorNotes} onChange={e => set('doctorNotes', e.target.value)} /></label>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary mt-4 w-full">{saving ? 'Saving...' : 'Save profile and continue'}</button>
        <p className="micro mt-3">Wellness guidance is informational only and not a substitute for medical advice.</p>
      </section>
      <section className="card p-5">
        <h2 className="section-title">Personal targets</h2>
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl bg-brand-50 p-4"><b>{t.calories}</b><p className="micro">target calories/day</p></div>
          <div className="rounded-2xl bg-blue-50 p-4"><b>{t.protein}g</b><p className="micro">protein target</p></div>
          <div className="rounded-2xl bg-amber-50 p-4"><b>{t.sugar}g</b><p className="micro">sugar awareness limit</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><b>{t.sodium}mg</b><p className="micro">sodium limit</p></div>
        </div>
        <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700"><b>Why profile first?</b><p className="mt-1">A profile helps the app personalize calories, macros, diabetes-aware suggestions, elder health reminders and weekly reports.</p></div>
      </section>
    </div>
  </div>;
}
