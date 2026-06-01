'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Edit3, Flame, FlameKindling, Plus, Timer, Weight } from 'lucide-react';
import { EXERCISES } from '@/lib/exercises';
import PageHeader from './PageHeader';
import { id, readLS, today, toast, writeLS } from '@/lib/storage';
import type { ExerciseLog } from '@/lib/types';
import { defaultProfile, fetchExercisesForRange, fetchMealsForRange, fetchProfileStatus, insertExercise } from '@/lib/supabaseData';
import type { MealLog } from '@/lib/types';
import { movementFromFood } from '@/lib/wellnessInsights';

type ExerciseItem = (typeof EXERCISES)[number];
const exerciseList: ExerciseItem[] = [...EXERCISES];
function estimateCalories(minutes: number, met: number, weightKg = 70) { return Math.round((met * 3.5 * weightKg / 200) * minutes); }

export default function ExerciseClient() {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [profile, setProfile] = useState(defaultProfile);
  const [filter, setFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState(today());
  const [customName, setCustomName] = useState('');
  const [customMinutes, setCustomMinutes] = useState('20');
  const [customEffort, setCustomEffort] = useState('Moderate');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const local = readLS<ExerciseLog[]>('exercise_logs', []);
      setLogs(local);
      try {
        const start = new Date(selectedDate); start.setDate(start.getDate() - 7);
        const [cloud, cloudMeals, status] = await Promise.all([fetchExercisesForRange(start.toISOString().slice(0,10), selectedDate), fetchMealsForRange(selectedDate, selectedDate), fetchProfileStatus()]);
        if (cloud.length) setLogs(cloud);
        if (cloudMeals.length) setMeals(cloudMeals);
        if (status.profile) setProfile(status.profile);
      } catch { /* keep local fallback */ }
    }
    load();
  }, [selectedDate]);

  const todayLogs = logs.filter(l => l.date === selectedDate);
  const totals = useMemo(() => todayLogs.reduce((a,l)=>({minutes:a.minutes+l.minutes, calories:a.calories+l.calories}), {minutes:0, calories:0}), [todayLogs]);
  const movementIdea = movementFromFood(meals);
  const exerciseTypes = ['All', ...Array.from(new Set(exerciseList.map(e => e.type)))];
  const filteredExercises = filter === 'All' ? exerciseList : exerciseList.filter(e => e.type === filter);

  async function save(log: ExerciseLog) {
    setSaving(true);
    try {
      const saved = await insertExercise(log);
      const next = [saved || log, ...logs];
      setLogs(next);
      writeLS('exercise_logs', next);
      toast(`${log.name} logged`);
    } catch (e: any) { toast(e?.message || 'Exercise could not be saved.'); }
    finally { setSaving(false); }
  }

  function addExercise(exercise: ExerciseItem, minutesOverride?: number) {
    const mins = minutesOverride || exercise.minutes;
    save({ id: id(), date: selectedDate, name: exercise.name, minutes: mins, effort: exercise.level, calories: estimateCalories(mins, exercise.met, Number(profile.weight || 70)) });
  }

  function addCustom() {
    if (!customName.trim()) return toast('Enter exercise name');
    const mins = Number(customMinutes || 0);
    if (!mins) return toast('Enter minutes');
    const met = customEffort === 'Easy' ? 2.2 : customEffort === 'Hard' ? 5.5 : 3.5;
    save({ id: id(), date: selectedDate, name: customName.trim(), minutes: mins, effort: customEffort, calories: estimateCalories(mins, met, Number(profile.weight || 70)) });
    setCustomName('');
  }

  return (
    <div className="page-wrap">
      <PageHeader title="Log Exercise" subtitle="Choose a quick workout style or describe your activity. Estimates are for wellness planning only." />

      <section className="exercise-choice-grid mb-5" aria-label="Exercise logging options">
        <button type="button" onClick={() => addExercise(exerciseList.find(e => e.type === 'Cardio') || exerciseList[0], 20)}>
          <span><FlameKindling size={28}/></span><b>Run</b><small>Running, jogging, brisk walk</small>
        </button>
        <button type="button" onClick={() => addExercise(exerciseList.find(e => e.type === 'Strength') || exerciseList[0], 30)}>
          <span><Weight size={28}/></span><b>Weight lifting</b><small>Machines, free weights, bodyweight</small>
        </button>
        <button type="button" onClick={() => document.getElementById('custom-activity-input')?.focus()}>
          <span><Edit3 size={28}/></span><b>Describe</b><small>Write your workout in text</small>
        </button>
        <button type="button" onClick={() => document.getElementById('custom-activity-input')?.focus()}>
          <span><Flame size={28}/></span><b>Manual</b><small>Enter calories or minutes</small>
        </button>
      </section>

      <section className="card motivation-card mb-5 p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_.8fr] md:items-center">
          <div>
            <p className="micro font-black uppercase tracking-[.16em] text-brand-700">Today&apos;s movement</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-.05em]">Small movement, big progress</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">{movementIdea.text} Calories use your profile weight for better estimates.</p>
            <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="input mt-4 max-w-52" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-white p-4 shadow-soft"><Timer className="mb-2 text-blue-600"/><b className="text-3xl">{totals.minutes}</b><p className="micro">minutes logged</p></div>
            <div className="rounded-3xl bg-white p-4 shadow-soft"><Flame className="mb-2 text-orange-500"/><b className="text-3xl">{totals.calories}</b><p className="micro">est. calories</p></div>
          </div>
        </div>
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary !rounded-full" onClick={() => { const found = exerciseList.find(e => e.name === movementIdea.name) || exerciseList[1]; addExercise(found, movementIdea.minutes); }}>Log suggested {movementIdea.minutes}m</button></div>
      </section>

      <section className="card mb-5 p-5">
        <h2 className="section-title">Quick custom activity</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_130px_auto]">
          <input id="custom-activity-input" className="input" value={customName} onChange={e=>setCustomName(e.target.value)} placeholder="Walking, gym, cycling, yoga..." />
          <input className="input" value={customMinutes} onChange={e=>setCustomMinutes(e.target.value)} inputMode="numeric" placeholder="Minutes" />
          <select className="input" value={customEffort} onChange={e=>setCustomEffort(e.target.value)}><option>Easy</option><option>Moderate</option><option>Hard</option></select>
          <button className="btn btn-primary" disabled={saving} onClick={addCustom}><Plus size={18}/> Add</button>
        </div>
      </section>

      {todayLogs.length > 0 && <section className="card mb-5 p-5">
        <h2 className="section-title">Logged today</h2>
        <div className="mt-3 grid gap-2">{todayLogs.map(l => <div key={l.id} className="exercise-log-row"><span><b>{l.name}</b><br/>{l.minutes} min · {l.effort}</span><strong>{l.calories} cal</strong></div>)}</div>
      </section>}

      <section className="card mb-5 p-4"><div className="flex flex-wrap gap-2">{exerciseTypes.map(type => <button key={type} className={`habit-chip ${filter === type ? 'done' : ''}`} onClick={() => setFilter(type)}>{type}</button>)}</div></section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredExercises.map((exercise) => (
          <div key={exercise.name} className="card p-5">
            <span className="pill"><Dumbbell size={14}/> {exercise.level} · {exercise.type}</span>
            <h2 className="mt-3 text-xl font-black">{exercise.name}</h2>
            <p className="micro mt-1">{exercise.minutes} min · MET {exercise.met} · ~{estimateCalories(exercise.minutes, exercise.met, Number(profile.weight || 70))} cal</p>
            <p className="mt-3 text-sm text-slate-600">{exercise.notes || 'Move comfortably and stop if you feel pain or dizziness.'}</p>
            <a className="btn btn-soft mt-4 w-full" href={exercise.video} target="_blank" rel="noreferrer">Watch guide</a>
            <button className="btn btn-primary mt-2 w-full" disabled={saving} onClick={() => addExercise(exercise)} type="button">Add activity</button>
          </div>
        ))}
      </div>
    </div>
  );
}
