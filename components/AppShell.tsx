"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Camera,
  Droplets,
  Dumbbell,
  FileText,
  HeartPulse,
  Home,
  Lightbulb,
  LogOut,
  Mic,
  Moon,
  Plus,
  Salad,
  Sun,
  ScanBarcode,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  fetchProfileStatus,
  insertMeal,
  insertExercise,
  defaultProfile,
} from "@/lib/supabaseData";
import { getSupabase } from "@/lib/supabaseClient";
import { id, today, toast, readLS, writeLS } from "@/lib/storage";
import type { ExerciseLog, MealLog } from "@/lib/types";
import { LOCAL_FOODS } from "@/lib/foods";
import { EXERCISES } from "@/lib/exercises";
import { foodSmartFlags, servingHint } from "@/lib/wellnessInsights";

const nav = [
  ["/dashboard", "Home", Home],
  ["/food", "Food", Salad],
  ["/tracking", "Vitals", HeartPulse],
  ["/exercise", "Move", Dumbbell],
  ["/family", "Family", Users],
  ["/reports", "Reports", FileText],
  ["/coach", "Insights", Lightbulb],
] as const;

const mobileNav = [
  ["/dashboard", "Home", Home],
  ["/food", "Food", Salad],
  ["/reports", "Progress", BarChart3],
  ["/family", "Groups", Users],
  ["/profile", "Profile", UserRound],
] as const;

const publicPaths = ["/", "/login", "/privacy", "/terms", "/disclaimer", "/support", "/accept-invite", "/shared-report"];
const isPublicPath = (path: string) => publicPaths.includes(path);
const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];
type QuickMode =
  | "menu"
  | "voice"
  | "photo"
  | "barcode"
  | "manual"
  | "exercise"
  | "water"
  | "vitals"
  | "report";

function speechRecognition(): any {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

function parseServing(serving = "") {
  const g = String(serving).match(/(\d+(?:\.\d+)?)\s*g/i);
  const ml = String(serving).match(/(\d+(?:\.\d+)?)\s*ml/i);
  return {
    amount: g ? +g[1] : ml ? +ml[1] : 100,
    unit: g ? "g" : ml ? "ml" : "g",
  };
}

function scaleFood(
  food: any,
  amount: number,
  unit: string,
  meal: string,
): MealLog {
  const base = parseServing(food.serving);
  const normalizedAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
  const factor =
    unit === "serving"
      ? normalizedAmount
      : normalizedAmount / (base.amount || 100);
  return asMealLog({
    meal,
    name: food.name,
    qty: `${normalizedAmount} ${unit}`,
    cal: +((food.cal || 0) * factor).toFixed(1),
    p: +((food.p || 0) * factor).toFixed(1),
    c: +((food.c || 0) * factor).toFixed(1),
    f: +((food.f || 0) * factor).toFixed(1),
    fiber: +((food.fiber || 0) * factor).toFixed(1),
    sugar: +((food.sugar || 0) * factor).toFixed(1),
    sodium: Math.round((food.sodium || 0) * factor),
    source: "Food database",
  });
}

function estimateExerciseCalories(minutes: number, met: number, weightKg = 70) {
  return Math.max(1, Math.round(((met * 3.5 * weightKg) / 200) * minutes));
}

function asMealLog(partial: Partial<MealLog>): MealLog {
  return {
    id: partial.id || id(),
    date: partial.date || today(),
    meal: partial.meal || "Snacks",
    name: partial.name || "Food item",
    qty: partial.qty || "1 serving",
    cal: Number(partial.cal || 0),
    p: Number(partial.p || 0),
    c: Number(partial.c || 0),
    f: Number(partial.f || 0),
    fiber: Number(partial.fiber || 0),
    sugar: Number(partial.sugar || 0),
    sodium: Number(partial.sodium || 0),
    source: partial.source || "Quick Add",
  };
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMode, setQuickMode] = useState<QuickMode>("menu");
  const [checking, setChecking] = useState(true);
  const [savingQuick, setSavingQuick] = useState(false);
  const [meal, setMeal] = useState("Breakfast");
  const [query, setQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [barcode, setBarcode] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [quickAmount, setQuickAmount] = useState(100);
  const [quickUnit, setQuickUnit] = useState("g");
  const [exerciseMinutes, setExerciseMinutes] = useState(10);
  const [profile, setProfile] = useState(defaultProfile);
  const [exerciseName, setExerciseName] = useState("Post-meal walk");
  const [vitalGlucose, setVitalGlucose] = useState("");
  const [vitalBp, setVitalBp] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (
      q
        ? LOCAL_FOODS.filter((f) =>
            `${f.name} ${f.group} ${f.tags.join(" ")}`
              .toLowerCase()
              .includes(q),
          )
        : LOCAL_FOODS.slice(0, 8)
    ).slice(0, 8);
  }, [query]);

  useEffect(() => {
    const saved = readLS<"light" | "dark">("eatlyte-theme", "light");
    const next = saved === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    writeLS("eatlyte-theme", next);
  }

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ message: string }>;
      setToastMessage(custom.detail.message);
      window.setTimeout(() => setToastMessage(""), 2800);
    };
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, []);

  useEffect(() => {
    let alive = true;
    async function guard() {
      setChecking(true);
      try {
        const status = await fetchProfileStatus();
        if (!alive) return;
        if (!status.user && !publicPaths.includes(path))
          router.replace("/login");
        // Only first-time users with no profile row are forced to create a profile.
        // Existing users should not be trapped on profile because of optional/incomplete fields.
        else if (status.user && !status.hasProfile && path !== "/profile")
          router.replace("/profile?new=1");
      } finally {
        if (alive) setChecking(false);
      }
    }
    guard();
    return () => {
      alive = false;
    };
  }, [path, router]);

  const onPublicPage = isPublicPath(path);
  const showFab = !onPublicPage && path !== "/profile";

  async function logout() {
    const sb = getSupabase();
    try {
      await sb?.auth.signOut();
    } finally {
      setQuickOpen(false);
      router.replace("/login");
    }
  }

  async function saveMeal(log: MealLog) {
    setSavingQuick(true);
    try {
      const saved = await insertMeal(log);
      const existing = readLS<MealLog[]>("foods", []);
      writeLS("foods", [saved || log, ...existing]);
      toast(`${log.name} added to ${log.meal}`);
      setQuickOpen(false);
      setQuickMode("menu");
      window.dispatchEvent(new CustomEvent("food-log-updated"));
    } catch (e: any) {
      toast(e?.message || "Unable to save food. Please try again.");
    } finally {
      setSavingQuick(false);
    }
  }

  async function addLocalFood(food: (typeof LOCAL_FOODS)[number]) {
    await saveMeal(scaleFood(food, quickAmount, quickUnit, meal));
  }

  async function addManual() {
    if (!manualName.trim()) return toast("Enter food name first");
    await saveMeal(
      asMealLog({
        meal,
        name: manualName.trim(),
        qty: `${quickAmount} ${quickUnit}`,
        cal: Number(manualCalories || 0),
        source: "Manual",
      }),
    );
    setManualName("");
    setManualCalories("");
  }

  async function parseVoiceText(text: string) {
    if (!text.trim()) return toast("Say or type what you ate first");
    setSavingQuick(true);
    try {
      const res = await fetch("/api/ai-food-logger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const item = Array.isArray(data?.foods)
        ? data.foods[0]
        : Array.isArray(data?.items)
          ? data.items[0]
          : data?.item || data;
      const qty =
        item?.qty ||
        item?.serving ||
        `${item?.quantity || 1} ${item?.unit || "serving"}`;
      await saveMeal(
        asMealLog({
          meal: item?.meal || meal,
          name: item?.name || item?.food || text,
          qty,
          cal: item?.calories || item?.cal || 0,
          p: item?.protein_g || item?.p || 0,
          c: item?.carbs_g || item?.c || 0,
          f: item?.fat_g || item?.f || 0,
          fiber: item?.fiber_g || 0,
          sugar: item?.sugar_g || 0,
          sodium: item?.sodium_mg || 0,
          source: "Smart food parser",
        }),
      );
      setVoiceText("");
    } catch (e: any) {
      toast(e?.message || "Smart food logger failed. Add manually for now.");
    } finally {
      setSavingQuick(false);
    }
  }

  function startVoice() {
    const SR = speechRecognition();
    if (!SR)
      return toast(
        "Voice is not supported on this browser. Type the meal instead.",
      );
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      setVoiceText(text);
      parseVoiceText(text);
    };
    rec.onerror = () => toast("Voice capture failed. Try typing the meal.");
    rec.start();
  }

  async function analyzePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingQuick(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch("/api/photo-food-analyzer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: reader.result, meal }),
          });
          const data = await res.json();
          const item = Array.isArray(data?.foods)
            ? data.foods[0]
            : Array.isArray(data?.items)
              ? data.items[0]
              : data?.item || data;
          await saveMeal(
            asMealLog({
              meal,
              name: item?.name || item?.dish || "Meal photo",
              qty: item?.qty || item?.serving || "estimated serving",
              cal: item?.calories || item?.cal || 0,
              p: item?.protein_g || item?.p || 0,
              c: item?.carbs_g || item?.c || 0,
              f: item?.fat_g || item?.f || 0,
              fiber: item?.fiber_g || 0,
              sugar: item?.sugar_g || 0,
              sodium: item?.sodium_mg || 0,
              source: "Smart photo analysis",
            }),
          );
        } catch (err: any) {
          toast(err?.message || "Photo analysis failed. Add manually for now.");
        } finally {
          setSavingQuick(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast(err?.message || "Could not read image.");
      setSavingQuick(false);
    }
  }

  async function lookupBarcode() {
    if (!barcode.trim()) return toast("Enter or scan a barcode number");
    setSavingQuick(true);
    try {
      const res = await fetch(
        `/api/barcode-lookup?code=${encodeURIComponent(barcode.trim())}`,
      );
      const data = await res.json();
      const product = data?.product || data;
      const n = product?.nutriments || {};
      await saveMeal(
        asMealLog({
          meal,
          name: product?.product_name || product?.name || `Barcode ${barcode}`,
          qty: product?.serving_size || product?.serving || "1 serving",
          cal:
            n["energy-kcal_serving"] ||
            n["energy-kcal_100g"] ||
            product?.calories ||
            0,
          p: n.proteins_serving || n.proteins_100g || 0,
          c: n.carbohydrates_serving || n.carbohydrates_100g || 0,
          f: n.fat_serving || n.fat_100g || 0,
          fiber: n.fiber_serving || n.fiber_100g || 0,
          sugar: n.sugars_serving || n.sugars_100g || 0,
          sodium: n.sodium_serving
            ? n.sodium_serving * 1000
            : n.sodium_100g
              ? n.sodium_100g * 1000
              : 0,
          source: "Barcode",
        }),
      );
      setBarcode("");
    } catch (e: any) {
      toast(e?.message || "Barcode lookup failed. Add manually.");
    } finally {
      setSavingQuick(false);
    }
  }

  async function addQuickExercise(name = exerciseName) {
    const found = EXERCISES.find((e) => e.name === name) || EXERCISES[1];
    const minutes = Number(exerciseMinutes || found.minutes || 10);
    const log: ExerciseLog = {
      id: id(),
      date: today(),
      name: found.name,
      minutes,
      effort: found.level || "Easy",
      calories: estimateExerciseCalories(
        minutes,
        found.met,
        Number(profile.weight || 70),
      ),
    };
    setSavingQuick(true);
    try {
      const saved = await insertExercise(log);
      const existing = readLS<ExerciseLog[]>("exercise_logs", []);
      writeLS("exercise_logs", [saved || log, ...existing]);
      toast(`${log.name} logged`);
      setQuickOpen(false);
      setQuickMode("menu");
      window.dispatchEvent(new CustomEvent("exercise-log-updated"));
    } catch (e: any) {
      toast(e?.message || "Unable to save exercise. Please try again.");
    } finally {
      setSavingQuick(false);
    }
  }

  function addQuickWater() {
    const vitals = readLS<any[]>("vitals", []);
    const existing = vitals.find((v) => v.date === today()) || {
      id: id(),
      date: today(),
      bpSys: 0,
      bpDia: 0,
      glucose: 0,
      pulse: 0,
      water: 0,
      steps: 0,
      symptoms: "",
    };
    const next = [
      { ...existing, water: Number(existing.water || 0) + 1 },
      ...vitals.filter((v) => v.date !== today()),
    ];
    writeLS("vitals", next);
    toast("Water logged");
    setQuickOpen(false);
    setQuickMode("menu");
    window.dispatchEvent(new CustomEvent("vitals-log-updated"));
  }

  function saveQuickVital() {
    const vitals = readLS<any[]>("vitals", []);
    const existing = vitals.find((v) => v.date === today()) || {
      id: id(),
      date: today(),
      bpSys: 0,
      bpDia: 0,
      glucose: 0,
      pulse: 0,
      water: 0,
      steps: 0,
      symptoms: "",
    };
    const bp = vitalBp.match(/(\d+)\s*\/?\s*(\d+)?/);
    const next = [
      {
        ...existing,
        glucose: vitalGlucose ? Number(vitalGlucose) : existing.glucose,
        bpSys: bp ? Number(bp[1]) : existing.bpSys,
        bpDia: bp?.[2] ? Number(bp[2]) : existing.bpDia,
      },
      ...vitals.filter((v) => v.date !== today()),
    ];
    writeLS("vitals", next);
    setVitalGlucose("");
    setVitalBp("");
    toast("Vitals logged locally");
    setQuickOpen(false);
    setQuickMode("menu");
    window.dispatchEvent(new CustomEvent("vitals-log-updated"));
  }

  const openQuick = (mode: QuickMode = "menu") => {
    setQuickMode(mode);
    setQuickOpen(true);
  };

  return (
    <>
      <header className="topnav">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-black tracking-tight"
            aria-label="Eatlyte home"
          >
            <img
              src="/logo-mark.svg"
              alt="Eatlyte"
              className="nf-logo h-11 w-11 rounded-2xl shadow-soft"
            />
          </Link>
          {!onPublicPage && (
            <nav className="desktop-only items-center gap-1">
              {nav.map(([href, label, Icon]) => (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-2xl px-3 py-2 text-sm font-bold ${path === href ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-white"}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon size={16} />
                    {label}
                  </span>
                </Link>
              ))}
              <button
                type="button"
                onClick={toggleTheme}
                className="btn btn-ghost !py-2"
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <Link href="/profile" className="btn btn-ghost !py-2">
                Profile
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn btn-soft ml-1 !py-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="safe-bottom">
        {checking ? (
          <div className="page-wrap">
            <div className="card p-5 text-sm font-bold text-slate-600">
              Preparing your wellness space...
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {showFab && (
        <div className="fab-wrap">
          <button
            aria-label="Open quick add menu"
            className="fab-main"
            onClick={() =>
              quickOpen ? setQuickOpen(false) : openQuick("menu")
            }
          >
            {quickOpen ? <X /> : <Plus />}
          </button>
        </div>
      )}

      {quickOpen && showFab && (
        <div className="quick-backdrop" onClick={() => setQuickOpen(false)}>
          <section
            className="quick-panel card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="micro font-black uppercase tracking-[.16em] text-brand-700">
                  Quick add
                </p>
                <h2 className="text-2xl font-black tracking-[-.04em]">
                  What do you want to log?
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Choose food, movement, vitals, water, or report. Meal timing
                  appears only for food actions.
                </p>
              </div>
              <button className="icon-btn" onClick={() => setQuickOpen(false)}>
                <X size={18} />
              </button>
            </div>
            {["voice", "photo", "barcode", "manual"].includes(quickMode) && (
              <div className="mt-3">
                <p className="micro mb-2 font-black uppercase tracking-[.14em] text-slate-500">
                  Meal category
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {meals.map((m) => (
                    <button
                      key={m}
                      className={`meal-chip ${meal === m ? "active" : ""}`}
                      onClick={() => setMeal(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {quickMode === "menu" && (
              <div className="quick-action-grid mt-4">
                <button onClick={() => openQuick("voice")}>
                  <Mic /> <b>Describe food</b>
                  <span>Type or speak meal</span>
                </button>
                <button onClick={() => openQuick("photo")}>
                  <Camera /> <b>Meal photo</b>
                  <span>Smart photo analysis</span>
                </button>
                <button onClick={() => openQuick("barcode")}>
                  <ScanBarcode /> <b>Barcode</b>
                  <span>Packaged food</span>
                </button>
                <button onClick={() => openQuick("manual")}>
                  <Search /> <b>Search/custom</b>
                  <span>Find or create food</span>
                </button>
                <button onClick={() => openQuick("exercise")}>
                  <Dumbbell /> <b>Exercise</b>
                  <span>Walk, yoga, gym</span>
                </button>
                <button onClick={addQuickWater}>
                  <Droplets /> <b>Water</b>
                  <span>1 glass quick log</span>
                </button>
                <button onClick={() => openQuick("vitals")}>
                  <HeartPulse /> <b>Vitals</b>
                  <span>BP or glucose</span>
                </button>
                <button onClick={() => router.push("/reports")}>
                  <FileText /> <b>Report</b>
                  <span>Upload lab report</span>
                </button>
              </div>
            )}
            {quickMode === "voice" && (
              <div className="mt-4 space-y-3">
                <button
                  className="btn btn-primary w-full"
                  disabled={savingQuick}
                  onClick={startVoice}
                >
                  <Mic size={18} /> Start speaking
                </button>
                <input
                  className="input"
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  placeholder="Or type: 2 idli and sambar for breakfast"
                />
                <button
                  className="btn btn-soft w-full"
                  disabled={savingQuick}
                  onClick={() => parseVoiceText(voiceText)}
                >
                  {savingQuick ? "Adding..." : "Add from text"}
                </button>
              </div>
            )}
            {quickMode === "photo" && (
              <div className="mt-4 scanner-preview">
                <div className="scan-corners">
                  <Camera className="mx-auto mb-3" />
                  <p className="text-sm font-bold">
                    Scan your meal
                  </p>
                  <p className="micro mt-1">
                    Use a clear top view. Review estimates before saving.
                  </p>
                  <input
                    className="mt-4 w-full text-sm"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={analyzePhoto}
                  />
                  {savingQuick && (
                    <p className="micro mt-2">Analyzing and saving...</p>
                  )}
                </div>
              </div>
            )}
            {quickMode === "barcode" && (
              <div className="mt-4 space-y-3">
                <input
                  className="input"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Enter barcode number"
                  inputMode="numeric"
                />
                <button
                  className="btn btn-primary w-full"
                  disabled={savingQuick}
                  onClick={lookupBarcode}
                >
                  {savingQuick ? "Looking up..." : "Add barcode food"}
                </button>
              </div>
            )}
            {quickMode === "manual" && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-[1fr_92px_92px] gap-2">
                  <input
                    className="input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search apple, Costco yogurt, Amul dahi..."
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(+e.target.value)}
                  />
                  <select
                    className="input"
                    value={quickUnit}
                    onChange={(e) => setQuickUnit(e.target.value)}
                  >
                    <option>g</option>
                    <option>ml</option>
                    <option>serving</option>
                    <option>bowl</option>
                    <option>cup</option>
                    <option>glass</option>
                    <option>piece</option>
                  </select>
                </div>
                <div className="max-h-56 overflow-auto rounded-3xl border border-slate-100">
                  {suggestions.map((food) => {
                    const flags = foodSmartFlags(food, profile);
                    return (
                      <button
                        key={food.name}
                        className="quick-food-row"
                        onClick={() => addLocalFood(food)}
                      >
                        <span>
                          <b>{food.name}</b>
                          <small>
                            {quickAmount} {quickUnit} · base {food.serving}
                          </small>
                          <small>{servingHint(food)}</small>
                          {flags.length > 0 && (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {flags.map((flag) => (
                                <i
                                  key={flag.label}
                                  className={`smart-flag ${flag.tone}`}
                                >
                                  {flag.label}
                                </i>
                              ))}
                            </span>
                          )}
                        </span>
                        <em>Add</em>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <input
                    className="input"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Custom food"
                  />
                  <input
                    className="input"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="Cal"
                    inputMode="numeric"
                  />
                </div>
                <button
                  className="btn btn-soft w-full"
                  disabled={savingQuick}
                  onClick={addManual}
                >
                  Add custom food
                </button>
              </div>
            )}
            {quickMode === "exercise" && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <select
                    className="input"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                  >
                    {EXERCISES.map((e) => (
                      <option key={e.name}>{e.name}</option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={exerciseMinutes}
                    onChange={(e) => setExerciseMinutes(+e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary w-full"
                  disabled={savingQuick}
                  onClick={() => addQuickExercise()}
                >
                  {savingQuick ? "Saving..." : "Log exercise"}
                </button>
                <button
                  className="btn btn-soft w-full"
                  onClick={() => router.push("/exercise")}
                >
                  Open full Move page
                </button>
              </div>
            )}
            {quickMode === "vitals" && (
              <div className="mt-4 space-y-3">
                <input
                  className="input"
                  value={vitalBp}
                  onChange={(e) => setVitalBp(e.target.value)}
                  placeholder="BP e.g. 120/80"
                />
                <input
                  className="input"
                  value={vitalGlucose}
                  onChange={(e) => setVitalGlucose(e.target.value)}
                  placeholder="Glucose e.g. 110"
                  inputMode="numeric"
                />
                <button
                  className="btn btn-primary w-full"
                  onClick={saveQuickVital}
                >
                  Save vitals
                </button>
                <button
                  className="btn btn-soft w-full"
                  onClick={() => router.push("/tracking")}
                >
                  Open full Vitals page
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {!onPublicPage && (
        <nav className="tabbar">
          <div className="tabbar-inner">
            {mobileNav.map(([href, label, Icon]) => (
              <Link
                className={path === href ? "active" : ""}
                key={href}
                href={href}
              >
                <Icon className="mx-auto mb-1" size={19} />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </>
  );
}
