"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Droplets,
  Gift,
  HeartPulse,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Utensils,
} from "lucide-react";
import NutrientBreakdown from "./NutrientBreakdown";
import { ExerciseLog, LabLog, MealLog, Profile, VitalLog } from "@/lib/types";
import { sumMeals, targets } from "@/lib/nutrition";
import { readLS, today, toast } from "@/lib/storage";
import {
  fetchExercisesForRange,
  fetchMealsForRange,
  fetchProfileStatus,
  fetchVitalsForRange,
} from "@/lib/supabaseData";
import {
  dailyWellnessScore,
  exerciseIntelligence,
  getLoggingStreak,
  healthTrends,
  mealReview,
  smartEmptyState,
} from "@/lib/smartFeatures";
import { achievementBadges, engagementSummary, todayQuests } from "@/lib/engagement";

const defaultProfile: Profile = {
  name: "Member",
  age: 35,
  gender: "male",
  height: 170,
  weight: 70,
  activity: 1.35,
  goal: "maintain",
  diet: "Balanced",
  cuisine: "Indian + Global",
  conditions: [],
  allergies: "",
  medicines: "",
  emergency: "",
  doctorNotes: "",
};
function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function labelDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}
function labelDate(d: Date) {
  return d.getDate();
}
function prettyDate(key: string) {
  const d = new Date(`${key}T12:00:00`);
  const now = today();
  if (key === now) return "Today";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function bmiCategory(v: number) {
  if (!v) return "Add height/weight";
  if (v < 18.5) return "Underweight";
  if (v < 25) return "Healthy";
  if (v < 30) return "Overweight";
  return "High";
}
function pct(value: number, max: number) {
  return Math.max(
    0,
    Math.min(100, Math.round((value / Math.max(max, 1)) * 100)),
  );
}

function DateStrip({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 6 + i);
        return d;
      }),
    [],
  );
  return (
    <div className="date-strip clean sliding" aria-label="Choose date">
      {days.map((d) => {
        const key = dateKey(d);
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={key === selected ? "active" : ""}
          >
            <span>{labelDay(d)}</span>
            <b>{labelDate(d)}</b>
          </button>
        );
      })}
    </div>
  );
}

function RingMetric({
  label,
  value,
  target,
  unit,
  emoji,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  emoji: string;
  tone: "calories" | "protein" | "carbs" | "fat";
}) {
  const progress = pct(value, target);
  return (
    <div className={`ring-metric ${tone}`}>
      <div className="ring-icon" aria-hidden="true">
        {emoji}
      </div>
      <div
        className="ring-visual"
        style={{ ["--pct" as any]: `${progress * 3.6}deg` }}
      >
        <span>{progress}%</span>
      </div>
      <b>
        {Math.round(value)}
        <small>{unit}</small>
      </b>
      <p>{label}</p>
      <em>
        Target {Math.round(target)}
        {unit}
      </em>
    </div>
  );
}

function MiniBarChart({
  data,
  labels,
  colors,
}: {
  data: number[];
  labels: string[];
  colors?: string[];
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="mini-bar-chart">
      {data.map((v, i) => (
        <div key={`${labels[i]}-${i}`} className="mini-bar-col">
          <span
            style={{
              height: `${Math.max(6, (v / max) * 94)}%`,
              background: colors?.[i],
            }}
          />
          <small>{labels[i]}</small>
        </div>
      ))}
    </div>
  );
}

export default function ClientDashboard() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [vitals, setVitals] = useState<VitalLog[]>([]);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [labs, setLabs] = useState<LabLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [reviewing, setReviewing] = useState(false);
  const [smartReview, setSmartReview] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setProfile(readLS("profile", defaultProfile));
      setMeals(readLS("foods", []));
      setVitals(readLS("vitals", []));
      setExercises(readLS("exercise_logs", []));
      setLabs(readLS("labs", []));
      try {
        const start = new Date(selectedDate);
        start.setDate(start.getDate() - 14);
        const end = new Date(selectedDate);
        end.setDate(end.getDate() + 1);
        const [status, cloudMeals, cloudVitals, cloudExercises] =
          await Promise.all([
            fetchProfileStatus(),
            fetchMealsForRange(dateKey(start), dateKey(end)),
            fetchVitalsForRange(dateKey(start), dateKey(end)),
            fetchExercisesForRange(dateKey(start), dateKey(end)),
          ]);
        if (status.profile) setProfile(status.profile);
        if (cloudMeals.length) setMeals(cloudMeals);
        if (cloudVitals.length) setVitals(cloudVitals);
        if (cloudExercises.length) setExercises(cloudExercises);
      } catch {
        toast("Using offline/local data. Sync will retry after refresh.");
      }
    }
    load();
  }, [selectedDate]);

  useEffect(() => {
    const refresh = () => {
      setMeals(readLS("foods", []));
      setExercises(readLS("exercise_logs", []));
      setVitals(readLS("vitals", []));
    };
    ["food-log-updated", "exercise-log-updated", "vitals-log-updated"].forEach(
      (e) => window.addEventListener(e, refresh),
    );
    return () =>
      [
        "food-log-updated",
        "exercise-log-updated",
        "vitals-log-updated",
      ].forEach((e) => window.removeEventListener(e, refresh));
  }, []);

  const dayMeals = meals.filter((x) => x.date === selectedDate);
  const dayVitals = vitals.filter((x) => x.date === selectedDate);
  const dayExercises = exercises.filter((x) => x.date === selectedDate);
  const t = targets(profile);
  const totals = sumMeals(dayMeals);
  const wellness = dailyWellnessScore(
    dayMeals,
    dayVitals,
    dayExercises,
    profile,
  );
  const streak = getLoggingStreak(meals, exercises, vitals);
  const movement = exerciseIntelligence(dayMeals, dayExercises, profile);
  const trends = healthTrends(meals, vitals, exercises, labs);
  const localReview = mealReview(dayMeals, profile);
  const empty = smartEmptyState("home", profile);
  const fatTarget = Math.max(40, Math.round((t.calories * 0.28) / 9));
  const carbsTarget = Math.max(120, Math.round((t.calories * 0.45) / 4));
  const vitalsToday = dayVitals[0];
  const calorieProgress = pct(totals.cal, t.calories);
  const caloriesRemaining = Math.max(0, Math.round(t.calories - totals.cal));
  const proteinRemaining = Math.max(0, Math.round(t.protein - totals.p));
  const waterProgress = pct(vitalsToday?.water || 0, 8);
  const fiberProgress = pct(totals.fiber, t.fiber);
  const sugarUsed = pct(totals.sugar, t.sugar);
  const moveMinutes = dayExercises.reduce((a, x) => a + (x.minutes || 0), 0);
  const moveCalories = dayExercises.reduce((a, x) => a + (x.calories || 0), 0);
  const mealSlotsLogged = new Set(dayMeals.map((m) => m.meal)).size;
  const activeDays = trends.days.filter((d: any) => d.move > 0).length;
  const selectedLabel = prettyDate(selectedDate);
  const bmi =
    profile.height && profile.weight
      ? +(profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
      : 0;
  const bmiPct = Math.max(
    0,
    Math.min(100, Math.round((((bmi || 18.5) - 14) / 26) * 100)),
  );
  const recentTrendDays = trends.days.slice(-7);
  const chartLabels = recentTrendDays.map((d: any) =>
    String(d.label || "").slice(0, 3),
  );
  const calorieBars = recentTrendDays.map((d: any) =>
    Math.round(d.calories || d.cal || 0),
  );
  const dashboardInsight = !dayMeals.length
    ? "Start by logging your first meal. The app will calculate calories, macros and wellness score from real data."
    : calorieProgress < 55
      ? "You are still under today’s calorie target. Add a balanced meal with protein and fiber."
      : calorieProgress > 115
        ? "Calories are above today’s target. Keep the next meal lighter and prioritize hydration or a gentle walk."
        : "You are tracking well today. Focus on protein, water and a consistent evening routine.";
  const quests = todayQuests({
    meals: dayMeals,
    vitals: dayVitals,
    exercises: dayExercises,
    profile,
  });
  const questSummary = engagementSummary(quests);
  const badges = achievementBadges({
    allMeals: meals,
    vitals,
    exercises,
  });
  const unlockedBadges = badges.filter((badge) => badge.unlocked).length;

  async function runSmartMealReview() {
    if (!dayMeals.length) return toast("Log food first to review meals.");
    setReviewing(true);
    try {
      const r = await fetch("/api/ai-meal-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          meals: dayMeals,
          vitals: dayVitals,
          exercises: dayExercises,
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "Smart review failed");
      setSmartReview(d);
      toast("Meal review ready");
    } catch (e: any) {
      toast(e?.message || "Using local meal review for now.");
      setSmartReview(null);
    } finally {
      setReviewing(false);
    }
  }

  const review = smartReview || {
    title: localReview.title,
    score: localReview.score,
    tips: localReview.notes,
  };

  return (
    <div className="page-wrap dashboard-page">
      <section className="mobile-hero card mb-5 p-5 sm:p-7">
        <div className="hero-head">
          <div>
            <p className="eyebrow">{selectedLabel} plan</p>
            <h1>{selectedLabel}</h1>
            <p className="micro mt-1">
              Hi {profile.name || "Member"}, simple nutrition tracking for your
              day.
            </p>
          </div>
          <div className="streak-pill">🔥 {Math.max(streak.streak, 0)}</div>
        </div>
        <DateStrip selected={selectedDate} onSelect={setSelectedDate} />
      </section>

      <section
        className="ring-metric-grid mb-5"
        aria-label="Main nutrition rings"
      >
        <RingMetric
          label="Calories"
          value={totals.cal}
          target={t.calories}
          unit=" kcal"
          emoji="🔥"
          tone="calories"
        />
        <RingMetric
          label="Protein"
          value={totals.p}
          target={t.protein}
          unit="g"
          emoji="🍗"
          tone="protein"
        />
        <RingMetric
          label="Carbs"
          value={totals.c}
          target={carbsTarget}
          unit="g"
          emoji="🌾"
          tone="carbs"
        />
        <RingMetric
          label="Fats"
          value={totals.f}
          target={fatTarget}
          unit="g"
          emoji="🥑"
          tone="fat"
        />
      </section>

      <section
        className="focus-strip card mb-5 p-4"
        aria-label="Daily focus summary"
      >
        <div className="focus-copy">
          <p className="eyebrow">Daily focus</p>
          <h2>{dashboardInsight}</h2>
        </div>
        <div className="focus-metrics">
          <span>
            <Target size={16} />
            <b>{caloriesRemaining}</b>
            <small>kcal left</small>
          </span>
          <span>
            <Utensils size={16} />
            <b>{proteinRemaining}g</b>
            <small>protein left</small>
          </span>
          <span>
            <Droplets size={16} />
            <b>{waterProgress}%</b>
            <small>water goal</small>
          </span>
          <span>
            <TrendingUp size={16} />
            <b>{activeDays}/7</b>
            <small>active days</small>
          </span>
        </div>
      </section>

      <section className="engagement-panel card mb-5 p-5">
        <div className="engagement-head">
          <div>
            <p className="eyebrow">Make today fun</p>
            <h2>Daily quests that build healthy habits</h2>
            <p>
              Small wins make the app useful every day. No crash diets, no pressure — just simple nutrition habits.
            </p>
          </div>
          <div className="points-orb" aria-label={`${questSummary.earned} points earned`}>
            <Trophy />
            <b>{questSummary.earned}</b>
            <span>points</span>
          </div>
        </div>
        <div className="quest-grid mt-4">
          {quests.slice(0, 4).map((quest) => (
            <Link className={`quest-card ${quest.tone}`} href={quest.href} key={quest.id}>
              <div className="quest-top">
                <span className="quest-emoji">{quest.icon}</span>
                {quest.done ? <CheckCircle2 className="done-icon" /> : <Sparkles className="spark-icon" />}
              </div>
              <b>{quest.title}</b>
              <p>{quest.description}</p>
              <i><em style={{ width: `${quest.progress}%` }} /></i>
              <small>{quest.done ? `Completed · +${quest.points}` : `${quest.progress}% · ${quest.cta}`}</small>
            </Link>
          ))}
        </div>
        <div className="badge-strip mt-4">
          <div>
            <Gift />
            <span>
              <b>{unlockedBadges}/{badges.length} badges unlocked</b>
              <small>{questSummary.label}. Keep logging to unlock more.</small>
            </span>
          </div>
          <div className="badge-list-mini">
            {badges.slice(0, 6).map((badge) => (
              <span className={badge.unlocked ? "unlocked" : ""} key={badge.id} title={badge.detail}>{badge.icon}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-[.82fr_1.18fr]">
        <div className="score-card card p-5">
          <div className="score-head">
            <div>
              <p className="eyebrow">Daily wellness</p>
              <h2>{wellness.label}</h2>
            </div>
            <b>{wellness.score}</b>
          </div>
          <div className="score-bars">
            <div>
              <span>Nutrition</span>
              <i>
                <b style={{ width: `${wellness.nutrition}%` }} />
              </i>
              <strong>{wellness.nutrition}</strong>
            </div>
            <div>
              <span>Water</span>
              <i>
                <b style={{ width: `${wellness.water}%` }} />
              </i>
              <strong>{wellness.water}</strong>
            </div>
            <div>
              <span>Movement</span>
              <i>
                <b style={{ width: `${wellness.movement}%` }} />
              </i>
              <strong>{wellness.movement}</strong>
            </div>
          </div>
          <div className="score-explain">
            {(wellness.reasons || []).map((reason: string) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-brand-700">Smart meal review</p>
              <h2 className="section-title mt-1">{review.title}</h2>
            </div>
            <button
              className="btn btn-primary !py-2"
              disabled={reviewing}
              onClick={runSmartMealReview}
            >
              {reviewing ? "Reviewing..." : "Smart Review"}
            </button>
          </div>
          <div className="mt-4 rounded-3xl bg-slate-50 p-4">
            <b className="text-2xl">{review.score}/10</b>
            <div className="mt-2 grid gap-2">
              {(review.tips || []).slice(0, 3).map((x: string, i: number) => (
                <p key={i} className="text-sm font-semibold text-slate-600">
                  • {x}
                </p>
              ))}
            </div>
            <p className="micro mt-3">
              Wellness guidance only. Not medical advice.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_.8fr]">
        <NutrientBreakdown meals={dayMeals} profile={profile} />
        <div className="grid gap-4">
          <div className="card p-5">
            <p className="eyebrow">Next best action</p>
            <h2 className="section-title mt-1">
              {dayMeals.length ? movement.title : empty.title}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {dayMeals.length ? movement.text : empty.text}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="btn btn-soft" href="/food">
                Open food
              </Link>
              <Link className="btn btn-ghost" href="/exercise">
                Move
              </Link>
            </div>
          </div>
          <div className="card p-5">
            <p className="eyebrow">Health quick look</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="mini-stat block">
                <b>{vitalsToday?.water || 0}/8</b>
                <span>water</span>
              </div>
              <div className="mini-stat block">
                <b>{moveMinutes}</b>
                <span>move min</span>
              </div>
              <div className="mini-stat block">
                <b>{fiberProgress}%</b>
                <span>fiber</span>
              </div>
              <div className="mini-stat block">
                <b>{sugarUsed}%</b>
                <span>sugar used</span>
              </div>
            </div>
          </div>
          <div className="bmi-card card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Your BMI</p>
                <h2>
                  {bmi || "--"} <span>{bmiCategory(bmi)}</span>
                </h2>
              </div>
              <HeartPulse size={22} />
            </div>
            <div className="bmi-scale">
              <i style={{ left: `${bmiPct}%` }} />
            </div>
            <div className="bmi-legend">
              <span>Under</span>
              <span>Healthy</span>
              <span>Over</span>
              <span>High</span>
            </div>
            <p className="micro mt-3">
              BMI is a screening metric, not a diagnosis. Use it with body
              composition and clinician guidance.
            </p>
          </div>
          <div className="chart-card card p-5">
            <p className="eyebrow">7-day calories</p>
            <h2 className="section-title mt-1">Weekly intake</h2>
            <MiniBarChart data={calorieBars} labels={chartLabels} />
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title">Meals today</h2>
          {dayMeals.length ? (
            <div className="mt-3 grid gap-2">
              {dayMeals.slice(0, 5).map((m) => (
                <div className="compact-log-row" key={m.id}>
                  <span>
                    <b>{m.name}</b>
                    <small>
                      {m.meal} · {m.qty}
                    </small>
                  </span>
                  <strong>{Math.round(m.cal)} kcal</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="micro mt-3">
              No meal logged yet. Tap the floating + button to add food quickly.
            </p>
          )}
          <div className="meal-completion mt-4">
            <span style={{ width: `${pct(mealSlotsLogged, 4)}%` }} />
            <small>{mealSlotsLogged}/4 meal categories logged</small>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="section-title">Progress summary</h2>
          <div className="mt-4 grid gap-3">
            <div className="trend-card blue">
              <b>{Math.round(trends.avgCalories || 0)} kcal</b>
              <p className="micro">daily calorie average</p>
            </div>
            <div className="trend-card green">
              <b>{activeDays}/7 days</b>
              <p className="micro">movement consistency</p>
            </div>
            <div className="trend-card orange">
              <b>{Math.round(trends.avgWater || 0)} glasses</b>
              <p className="micro">average hydration</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
