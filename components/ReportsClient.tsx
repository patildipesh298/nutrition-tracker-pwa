"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Droplets,
  FileText,
  HeartPulse,
  Scale,
  Sparkles,
  Utensils,
} from "lucide-react";
import PageHeader from "./PageHeader";
import { ExerciseLog, LabLog, MealLog, Profile, VitalLog } from "@/lib/types";
import { id, readLS, today, toast, writeLS } from "@/lib/storage";
import { sumMeals, targets } from "@/lib/nutrition";
import { defaultProfile } from "@/lib/supabaseData";

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function pct(value: number, target: number) {
  return Math.max(
    0,
    Math.min(100, Math.round((value / Math.max(target, 1)) * 100)),
  );
}
function bmiCategory(v: number) {
  if (!v) return "Add profile";
  if (v < 18.5) return "Underweight";
  if (v < 25) return "Healthy";
  if (v < 30) return "Overweight";
  return "High";
}

function BarChart({
  series,
  labels,
  type = "single",
}: {
  series: number[][];
  labels: string[];
  type?: "single" | "stacked";
}) {
  const max = Math.max(...series.flat(), 1);
  const stackedMax = Math.max(
    ...labels.map((_, i) => series.reduce((a, s) => a + (s[i] || 0), 0)),
    1,
  );
  return (
    <div className={`progress-chart ${type}`}>
      {labels.map((label, i) => {
        const total = type === "stacked" ? stackedMax : max;
        return (
          <div className="progress-chart-col" key={`${label}-${i}`}>
            <div className="progress-chart-stack">
              {series.map((s, j) => (
                <span
                  key={j}
                  className={`seg seg-${j}`}
                  style={{
                    height: `${Math.max(s[i] ? 5 : 0, ((s[i] || 0) / total) * 100)}%`,
                  }}
                />
              ))}
            </div>
            <small>{label}</small>
          </div>
        );
      })}
    </div>
  );
}

function ChangeRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  const direction =
    value > 0 ? "Increase" : value < 0 ? "Decrease" : "No change";
  return (
    <div className="change-row">
      <span>{label}</span>
      <i />
      <b>
        {Math.abs(value).toFixed(1)} {unit}
      </b>
      <em>{direction}</em>
    </div>
  );
}

export default function ReportsClient() {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [vitals, setVitals] = useState<VitalLog[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [logs, setLogs] = useState<LabLog[]>([]);
  const [lab, setLab] = useState<LabLog>({ id: "", date: today(), notes: "" });
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMeals(readLS("foods", []));
    setExercises(readLS("exercise_logs", []));
    setVitals(readLS("vitals", []));
    setProfile(readLS("profile", defaultProfile));
    setLogs(readLS("labs", []));
  }, []);

  function save() {
    const n = [{ ...lab, id: lab.id || id() }, ...logs];
    setLogs(n);
    writeLS("labs", n);
    setLab({ id: "", date: today(), notes: "" });
    toast("Report values saved");
  }
  async function summarize() {
    if (!logs.length) return toast("Save at least one report first.");
    setLoading(true);
    try {
      const r = await fetch("/api/ai-report-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: logs.slice(0, 5) }),
      });
      const d = await r.json();
      if (!r.ok || d.error)
        throw new Error(d.error || "Smart report summary failed");
      setSummary(d);
      toast("Report summary ready");
    } catch (e: any) {
      toast(e?.message || "Could not generate summary.");
    } finally {
      setLoading(false);
    }
  }

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 6 + i);
        return {
          key: dateKey(d),
          label: d
            .toLocaleDateString(undefined, { weekday: "short" })
            .slice(0, 3),
        };
      }),
    [],
  );
  const t = targets(profile);
  const daily = week.map((d) => {
    const dayMeals = meals.filter((m) => m.date === d.key);
    const s = sumMeals(dayMeals);
    const burned = exercises
      .filter((e) => e.date === d.key)
      .reduce((a, e) => a + (e.calories || 0), 0);
    const water = vitals.find((v) => v.date === d.key)?.water || 0;
    return { ...d, ...s, burned, water };
  });
  const labels = daily.map((d) => d.label);
  const consumed = daily.map((d) => Math.round(d.cal || 0));
  const burned = daily.map((d) => Math.round(d.burned || 0));
  const protein = daily.map((d) => Math.round(d.p || 0));
  const carbs = daily.map((d) => Math.round(d.c || 0));
  const fats = daily.map((d) => Math.round(d.f || 0));
  const water = daily.map((d) => Number(d.water || 0));
  const totalConsumed = consumed.reduce((a, x) => a + x, 0);
  const totalBurned = burned.reduce((a, x) => a + x, 0);
  const avgCalories = Math.round(totalConsumed / 7);
  const todayTotals = daily[daily.length - 1];
  const bmi =
    profile.height && profile.weight
      ? +(profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
      : 0;
  const bmiPct = Math.max(
    0,
    Math.min(100, Math.round((((bmi || 18.5) - 14) / 26) * 100)),
  );
  const latestLab = logs[0];

  return (
    <div className="page-wrap progress-page">
      <PageHeader
        title="Progress"
        subtitle="Simple charts for calories, macros, water, movement, BMI and reports."
        action={
          <button
            className="btn btn-primary"
            onClick={summarize}
            disabled={loading}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {loading ? "Summarizing..." : "Smart Summary"}
          </button>
        }
      />

      <section className="progress-summary-grid mb-5">
        <div className="progress-kpi card">
          <Utensils />
          <b>{avgCalories}</b>
          <span>Daily avg kcal</span>
        </div>
        <div className="progress-kpi card">
          <Activity />
          <b>{totalBurned}</b>
          <span>Weekly burned</span>
        </div>
        <div className="progress-kpi card">
          <Droplets />
          <b>{Math.round(water.reduce((a, x) => a + x, 0) / 7)}</b>
          <span>Avg water glasses</span>
        </div>
        <div className="progress-kpi card">
          <Scale />
          <b>{bmi || "--"}</b>
          <span>BMI · {bmiCategory(bmi)}</span>
        </div>
      </section>

      <section className="card p-5 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Weekly energy</p>
            <h2 className="section-title mt-1">Consumed vs burned</h2>
          </div>
          <b className="progress-delta">
            {totalConsumed - totalBurned >= 0 ? "+" : ""}
            {totalConsumed - totalBurned} kcal
          </b>
        </div>
        <BarChart series={[burned, consumed]} labels={labels} />
        <div className="chart-legend">
          <span className="burned">Burned</span>
          <span className="consumed">Consumed</span>
        </div>
      </section>

      <section className="card p-5 mb-5">
        <p className="eyebrow">Macro balance</p>
        <h2 className="section-title mt-1">Protein, carbs and fats</h2>
        <BarChart
          series={[protein, carbs, fats]}
          labels={labels}
          type="stacked"
        />
        <div className="chart-legend">
          <span className="protein">Protein</span>
          <span className="carbs">Carbs</span>
          <span className="fats">Fats</span>
        </div>
        <div className="progress-targets">
          <span>
            Protein today{" "}
            <b>
              {Math.round(todayTotals.p || 0)}/{Math.round(t.protein)}g
            </b>
          </span>
          <span>
            Calories today <b>{pct(todayTotals.cal || 0, t.calories)}%</b>
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 mb-5">
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
            BMI is not a diagnosis. It is one simple trend marker.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="section-title">Expenditure changes</h2>
          <div className="change-list">
            <ChangeRow
              label="3 day"
              value={
                burned.slice(-3).reduce((a, x) => a + x, 0) / 3 -
                (burned.slice(-6, -3).reduce((a, x) => a + x, 0) / 3 || 0)
              }
              unit="cal"
            />
            <ChangeRow label="7 day" value={totalBurned / 7} unit="cal" />
            <ChangeRow
              label="Calories avg"
              value={avgCalories - t.calories}
              unit="cal"
            />
            <ChangeRow
              label="Water avg"
              value={water.reduce((a, x) => a + x, 0) / 7 - 8}
              unit="glasses"
            />
          </div>
        </div>
      </section>

      <section className="card p-5 mb-5">
        <p className="eyebrow">Report values</p>
        <h2 className="section-title mt-1">Doctor-ready lab summary</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="mini-stat">
            HbA1c <b>{latestLab?.hbA1c || "--"}</b>
          </div>
          <div className="mini-stat">
            Fasting glucose <b>{latestLab?.fastingGlucose || "--"}</b>
          </div>
          <div className="mini-stat">
            Cholesterol <b>{latestLab?.cholesterol || "--"}</b>
          </div>
          <div className="mini-stat">
            Vitamin D <b>{latestLab?.vitaminD || "--"}</b>
          </div>
        </div>
        {summary ? (
          <p className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            {summary.summary}
          </p>
        ) : (
          <p className="micro mt-4">
            Add lab values below, then generate a simple discussion summary.
            This does not replace a doctor.
          </p>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <FileText className="text-slate-600" />
          <h2 className="section-title">Add report values</h2>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Date</span>
            <input
              className="input"
              type="date"
              value={lab.date}
              onChange={(e) => setLab({ ...lab, date: e.target.value })}
            />
          </label>
          <label>
            <span className="label">HbA1c</span>
            <input
              className="input"
              type="number"
              value={lab.hbA1c || ""}
              onChange={(e) => setLab({ ...lab, hbA1c: +e.target.value })}
            />
          </label>
          <label>
            <span className="label">Fasting glucose</span>
            <input
              className="input"
              type="number"
              value={lab.fastingGlucose || ""}
              onChange={(e) =>
                setLab({ ...lab, fastingGlucose: +e.target.value })
              }
            />
          </label>
          <label>
            <span className="label">Cholesterol</span>
            <input
              className="input"
              type="number"
              value={lab.cholesterol || ""}
              onChange={(e) => setLab({ ...lab, cholesterol: +e.target.value })}
            />
          </label>
          <label>
            <span className="label">Vitamin D</span>
            <input
              className="input"
              type="number"
              value={lab.vitaminD || ""}
              onChange={(e) => setLab({ ...lab, vitaminD: +e.target.value })}
            />
          </label>
          <label>
            <span className="label">Notes</span>
            <input
              className="input"
              value={lab.notes || ""}
              onChange={(e) => setLab({ ...lab, notes: e.target.value })}
            />
          </label>
        </div>
        <button className="btn btn-primary mt-4 w-full" onClick={save}>
          Save report
        </button>
      </section>
    </div>
  );
}
