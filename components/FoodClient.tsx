'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from './PageHeader';
import MetricCard from './MetricCard';
import NutrientBreakdown from './NutrientBreakdown';
import { LOCAL_FOODS } from '@/lib/foods';
import { MealLog } from '@/lib/types';
import { id, readLS, round, today, toast, writeLS } from '@/lib/storage';
import { sumMeals } from '@/lib/nutrition';
import { deleteMeal, fetchMealsForRange, fetchProfileStatus, insertMeal, defaultProfile } from '@/lib/supabaseData';
import { foodSmartFlags, servingHint, smartMealSuggestion, movementFromFood } from '@/lib/wellnessInsights';

type Food = typeof LOCAL_FOODS[number];
type AddMode = 'search' | 'manual' | 'describe' | 'mealPhoto' | 'barcode' | 'label';
const ADD_MODES: AddMode[] = ['search', 'manual', 'describe', 'mealPhoto', 'barcode', 'label'];
function isAddMode(value: string | null): value is AddMode {
  return Boolean(value && ADD_MODES.includes(value as AddMode));
}

const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const units = ['g', 'ml', 'serving', 'bowl', 'cup', 'glass', 'piece'];
const foodCatalog = Array.from(LOCAL_FOODS) as Food[];

function parseServing(serving = '') {
  const g = String(serving).match(/(\d+(?:\.\d+)?)\s*g/i);
  const ml = String(serving).match(/(\d+(?:\.\d+)?)\s*ml/i);
  return { amount: g ? +g[1] : ml ? +ml[1] : 100, unit: g ? 'g' : ml ? 'ml' : 'g' };
}

function scaleFood(f: any, amount: number, unit: string, meal: string, date: string): MealLog {
  const base = parseServing(f.serving);
  const normalizedAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
  const factor = unit === 'serving' ? normalizedAmount : normalizedAmount / (base.amount || 100);
  // Scale a micronutrient only when the source food actually carries it, so we never invent values.
  const micro = (key: string, decimals = 0) =>
    f?.[key] === undefined || f?.[key] === null || f?.[key] === ''
      ? undefined
      : +((Number(f[key]) || 0) * factor).toFixed(decimals);
  return {
    id: id(),
    date,
    meal,
    name: f.name,
    qty: `${normalizedAmount} ${unit}`,
    cal: +((f.cal || 0) * factor).toFixed(1),
    p: +((f.p || 0) * factor).toFixed(1),
    c: +((f.c || 0) * factor).toFixed(1),
    f: +((f.f || 0) * factor).toFixed(1),
    fiber: +((f.fiber || 0) * factor).toFixed(1),
    sugar: +((f.sugar || 0) * factor).toFixed(1),
    sodium: Math.round((f.sodium || 0) * factor),
    potassium: micro('potassium'),
    calcium: micro('calcium'),
    iron: micro('iron', 1),
    vitaminA: micro('vitaminA', 1),
    vitaminC: micro('vitaminC', 1),
    source: f.source || 'Food database',
  };
}

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function getBarcodeDetector() {
  if (typeof window === 'undefined') return null;
  return (window as any).BarcodeDetector || null;
}

function parseSentence(text: string, defaultMeal: string) {
  const detectedMeal = meals.find((m) => text.toLowerCase().includes(m.toLowerCase())) || defaultMeal;
  return text
    .replace(/for breakfast|for lunch|for dinner|for snacks/ig, '')
    .split(/,| and | with /i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d+(?:\.\d+)?)\s*(g|ml|cup|bowl|glass|piece|serving|chapatis?|rotis?)?\s*(.*)$/i);
      return {
        name: (match?.[3] || part).replace(/^(of|a|an)\s+/, '').trim(),
        quantity: match ? +match[1] : 1,
        unit: (match?.[2] || 'serving').replace(/chapatis?|rotis?/i, 'serving'),
        meal: detectedMeal,
        confidence: 0.7,
      };
    });
}

function nutritionFromApiProduct(product: any) {
  const n = product?.nutriments || product?.nutrition || {};
  const serving = product?.serving_size || product?.serving || '100g';
  const name = product?.product_name || product?.name || product?.generic_name || 'Scanned packaged food';
  return {
    name,
    brand: product?.brands || product?.brand || '',
    serving,
    cal: +(n['energy-kcal_serving'] || n['energy-kcal_100g'] || n.calories || n.cal || 0),
    p: +(n.proteins_serving || n.proteins_100g || n.protein || 0),
    c: +(n.carbohydrates_serving || n.carbohydrates_100g || n.carbs || 0),
    f: +(n.fat_serving || n.fat_100g || n.fat || 0),
    fiber: +(n.fiber_serving || n.fiber_100g || n.fiber || 0),
    sugar: +(n.sugars_serving || n.sugars_100g || n.sugar || 0),
    sodium: +(n.sodium_serving || n.sodium_100g || n.sodium || 0) * ((n.sodium_serving || n.sodium_100g) ? 1000 : 1),
    source: 'Barcode scan',
  };
}

export default function FoodClient() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [profile, setProfile] = useState(defaultProfile);
  const [selectedDate, setSelectedDate] = useState(today());
  const [mode, setMode] = useState<AddMode>('search');
  const [query, setQuery] = useState('');
  const [meal, setMeal] = useState('Lunch');
  const [amount, setAmount] = useState(100);
  const [unit, setUnit] = useState('g');
  const [voice, setVoice] = useState('');
  const [parsed, setParsed] = useState<any[]>([]);
  const [photo, setPhoto] = useState<any>(null);
  const [photoStatus, setPhotoStatus] = useState('Upload a clear meal photo. Review estimates before saving.');
  const [labelScan, setLabelScan] = useState<any>(null);
  const [labelStatus, setLabelStatus] = useState('Upload a clear nutrition facts label. We will extract serving size and nutrients.');
  const [manual, setManual] = useState({ name: '', cal: '', p: '', c: '', f: '', fiber: '', sugar: '', sodium: '', potassium: '', calcium: '', iron: '', vitaminA: '', vitaminC: '', qty: '100', unit: 'g' });
  const [showManualMicros, setShowManualMicros] = useState(false);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [photoPreview, setPhotoPreview] = useState('');
  const [labelPreview, setLabelPreview] = useState('');
  const [barcodeSupported, setBarcodeSupported] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [barcodeCode, setBarcodeCode] = useState('');
  const [barcodeStatus, setBarcodeStatus] = useState('Scan or enter a UPC/EAN barcode from packaged food.');
  const [barcodeProduct, setBarcodeProduct] = useState<any>(null);
  const [barcodeQty, setBarcodeQty] = useState(1);
  const [remoteFoods, setRemoteFoods] = useState<any[]>([]);
  const [remoteSearchLoading, setRemoteSearchLoading] = useState(false);
  const [remoteSearchNote, setRemoteSearchNote] = useState('');
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (isAddMode(requestedMode)) setMode(requestedMode);
    setLogs(readLS('foods', []));
    setMicSupported(Boolean(getSpeechRecognition()));
    setBarcodeSupported(Boolean(getBarcodeDetector()) && Boolean(navigator?.mediaDevices?.getUserMedia));
    fetchMealsForRange(selectedDate, selectedDate).then(cloud => { if (cloud.length) setLogs(cloud); }).catch(() => {});
    fetchProfileStatus().then(status => { if (status.profile) setProfile(status.profile); }).catch(() => {});
    if (requestedMode === 'voice') { setMode('search'); setVoice(''); setTimeout(() => document.getElementById('voice-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }
    return () => {
      recognitionRef.current?.stop?.();
      stopBarcodeScanner();
    };
  }, [searchParams, selectedDate]);

  const localResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    return foodCatalog
      .filter((f) => !q || f.name.toLowerCase().includes(q) || (f.group || '').toLowerCase().includes(q) || (f.tags || []).join(' ').toLowerCase().includes(q))
      .slice(0, 12);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setRemoteFoods([]); setRemoteSearchNote(''); setRemoteSearchLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRemoteSearchLoading(true);
      setRemoteSearchNote('Searching expanded nutrition databases...');
      try {
        const res = await fetch(`/api/food-search?query=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Food search failed');
        const apiFoods = Array.isArray(data.foods) ? data.foods : [];
        setRemoteFoods(apiFoods);
        setRemoteSearchNote(apiFoods.length ? 'Showing app database plus verified/branded results when available.' : 'No expanded database match yet. Try a simpler food or brand name.');
      } catch (err: any) {
        if (err?.name !== 'AbortError') setRemoteSearchNote('Using built-in database. External lookup is temporarily unavailable.');
      } finally {
        setRemoteSearchLoading(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const results = useMemo(() => {
    const byKey = new Map<string, any>();
    [...localResults, ...remoteFoods].forEach((food: any) => {
      const key = `${String(food.name || '').toLowerCase()}|${String(food.brand || '').toLowerCase()}|${String(food.serving || '').toLowerCase()}`;
      if (!byKey.has(key)) byKey.set(key, food);
    });
    return Array.from(byKey.values()).slice(0, 24);
  }, [localResults, remoteFoods]);

  const dayLogs = logs.filter((x) => x.date === selectedDate);
  const totals = sumMeals(dayLogs);
  const smartSuggestion = smartMealSuggestion(dayLogs, profile);
  const movementSuggestion = movementFromFood(dayLogs);

  function save(next: MealLog[]) { setLogs(next); writeLS('foods', next); }
  async function persistAndSave(log: MealLog, message: string) {
    save([log, ...logs]);
    try { const cloud = await insertMeal(log); if (cloud) save([cloud, ...logs]); } catch { toast('Saved locally. Cloud sync will need retry.'); return; }
    toast(message);
  }
  function add(f: any) { const log = scaleFood(f, amount, unit, meal, selectedDate); persistAndSave(log, `${f.name} added to ${meal}`); }

  function setModeAndReset(nextMode: AddMode) {
    setMode(nextMode);
    setParsed([]);
    if (nextMode !== 'barcode') stopBarcodeScanner();
  }

  function startVoiceCapture() {
    const SR = getSpeechRecognition();
    if (!SR) { setMicSupported(false); toast('Microphone is not supported in this browser. Type the meal instead.'); return; }
    try {
      const rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onstart = () => { setListening(true); toast('Listening... speak your meal now.'); };
      rec.onresult = (event: any) => { const text = Array.from(event.results).map((r: any) => r[0]?.transcript || '').join(' ').trim(); if (text) setVoice(text); };
      rec.onerror = (event: any) => { setListening(false); toast(event?.error === 'not-allowed' ? 'Microphone permission blocked. Allow microphone access in browser settings.' : 'Could not hear clearly. Try again or type the meal.'); };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec; rec.start();
    } catch { setListening(false); toast('Microphone could not start. Allow microphone access and try again.'); }
  }

  async function parseVoice() {
    const text = voice.trim(); if (!text) return toast('Enter or speak a food sentence first');
    try {
      const r = await fetch('/api/ai-food-logger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, defaultMeal: meal }) });
      const d = await r.json(); setParsed(d.foods?.length ? d.foods : parseSentence(text, meal)); toast('Meal parsed. Review and save.');
    } catch { setParsed(parseSentence(text, meal)); toast('Meal parsed locally. Review and save.'); }
  }

  function confirmParsed() {
    let next = [...logs];
    parsed.forEach((p) => {
      const found = foodCatalog.find((x) => x.name.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(x.name.split('/')[0].trim().toLowerCase()));
      const f = found || { name: p.name, cal: 120, p: 4, c: 18, f: 4, fiber: 2, sugar: 3, sodium: 120, serving: '100g', source: 'Estimate' };
      next = [scaleFood(f, +p.quantity || 1, p.unit || 'serving', p.meal || meal, selectedDate), ...next];
    });
    save(next); setParsed([]); setVoice(''); toast('Meal saved to diary');
    parsed.forEach(async (p) => {
      const found = foodCatalog.find((x) => x.name.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(x.name.split('/')[0].trim().toLowerCase()));
      const f = found || { name: p.name, cal: 120, p: 4, c: 18, f: 4, fiber: 2, sugar: 3, sodium: 120, serving: '100g', source: 'Smart estimate' };
      try { await insertMeal(scaleFood(f, +p.quantity || 1, p.unit || 'serving', p.meal || meal, selectedDate)); } catch {}
    });
  }

  async function analyzePhoto(file: File | null) {
    if (!file) return; setPhoto(null); setPhotoPreview(URL.createObjectURL(file)); setPhotoStatus('Analyzing meal photo...');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const r = await fetch('/api/photo-food-analyzer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: reader.result, meal, context: 'mobile web meal analysis' }) });
        const d = await r.json();
        if (!r.ok || d.error) { setPhotoStatus(d.error || 'Photo scanner failed.'); toast('Photo scanner failed. Check API key or image quality.'); return; }
        setPhoto(d); setPhotoStatus('Analysis complete. Review the food cards and save.'); toast('Photo scanned successfully.');
      } catch { setPhotoStatus('Photo scanner failed. Check environment keys in Vercel.'); }
    };
    reader.readAsDataURL(file);
  }

  function savePhotoFoods() {
    const items = photo?.foods || photo?.items || [];
    let next = [...logs];
    const created = items.map((x: any) => ({ id: id(), date: selectedDate, meal, name: x.name || 'Photo food', qty: x.servingText || `${x.amount || 100} ${x.unit || 'g'}`, cal: +(x.cal || x.calories || 0), p: +(x.p || x.protein || 0), c: +(x.c || x.carbs || 0), f: +(x.f || x.fat || 0), fiber: +(x.fiber || 0), sugar: +(x.sugar || 0), sodium: +(x.sodium || 0), source: 'Smart meal photo' }));
    created.forEach((log: MealLog) => next = [log, ...next]);
    save(next); setPhoto(null); setPhotoPreview(''); toast('Photo meal saved to diary');
    created.forEach(async (log: MealLog) => { try { await insertMeal(log); } catch {} });
  }

  async function lookupBarcode(code = barcodeCode) {
    const clean = code.trim();
    if (!clean) return toast('Enter or scan a barcode first');
    setBarcodeStatus('Looking up product...');
    try {
      const r = await fetch(`/api/barcode-lookup?code=${encodeURIComponent(clean)}`);
      const d = await r.json();
      if (!r.ok || d.error || !d.product) { setBarcodeProduct(null); setBarcodeStatus(d.error || 'Product not found. Try manual entry or scan the nutrition label.'); toast('Product not found'); return; }
      const normalized = nutritionFromApiProduct(d.product);
      setBarcodeProduct(normalized);
      setBarcodeCode(clean);
      setBarcodeStatus('Product found. Review serving and save.');
      toast('Barcode product found.');
    } catch {
      setBarcodeStatus('Barcode lookup failed. Check connection and try again.');
      toast('Barcode lookup failed');
    }
  }

  async function startBarcodeScanner() {
    const Detector = getBarcodeDetector();
    if (!Detector || !navigator.mediaDevices?.getUserMedia) { setBarcodeSupported(false); toast('Barcode camera scanner is not supported. Enter barcode manually.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScannerActive(true);
      setBarcodeStatus('Point camera at barcode. Hold steady.');
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      const scan = async () => {
        try {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            const codes = await detector.detect(videoRef.current);
            if (codes?.length) {
              const raw = String(codes[0].rawValue || '');
              if (raw) {
                setBarcodeCode(raw);
                stopBarcodeScanner();
                await lookupBarcode(raw);
                return;
              }
            }
          }
        } catch {}
        scanTimerRef.current = window.setTimeout(scan, 650);
      };
      scan();
    } catch {
      setBarcodeStatus('Camera permission blocked. Allow camera access or enter barcode manually.');
      toast('Camera permission blocked');
    }
  }

  function stopBarcodeScanner() {
    if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScannerActive(false);
  }

  function saveBarcodeProduct() {
    if (!barcodeProduct) return toast('Lookup a product first');
    const base = { ...barcodeProduct, serving: barcodeProduct.serving || '1 serving' };
    const log = scaleFood(base, barcodeQty || 1, 'serving', meal, selectedDate);
    persistAndSave(log, 'Packaged food saved to diary');
    setBarcodeProduct(null); setBarcodeQty(1); setBarcodeCode('');
  }

  async function analyzeFoodLabel(file: File | null) {
    if (!file) return;
    setLabelScan(null); setLabelPreview(URL.createObjectURL(file)); setLabelStatus('Reading nutrition label...');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const r = await fetch('/api/food-label-scanner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: reader.result }) });
        const d = await r.json();
        if (!r.ok || d.error) { setLabelStatus(d.error || 'Could not read label. Try a sharper photo.'); toast('Label scan failed'); return; }
        setLabelScan(d.food || d);
        setLabelStatus('Label extracted. Review values before saving.');
        toast('Nutrition label scanned.');
      } catch {
        setLabelStatus('Label scan failed. Check API key or photo quality.');
      }
    };
    reader.readAsDataURL(file);
  }

  function updateLabelField(field: string, value: string) {
    setLabelScan((prev: any) => ({ ...(prev || {}), [field]: value }));
  }

  function saveLabelFood() {
    if (!labelScan) return toast('Scan or enter label values first');
    const base = {
      name: labelScan.name || 'Nutrition label food',
      serving: labelScan.serving || '1 serving',
      cal: +labelScan.cal || +labelScan.calories || 0,
      p: +labelScan.p || +labelScan.protein || 0,
      c: +labelScan.c || +labelScan.carbs || 0,
      f: +labelScan.f || +labelScan.fat || 0,
      fiber: +labelScan.fiber || 0,
      sugar: +labelScan.sugar || 0,
      sodium: +labelScan.sodium || 0,
      potassium: labelScan.potassium ?? '',
      calcium: labelScan.calcium ?? '',
      iron: labelScan.iron ?? '',
      vitaminA: labelScan.vitaminA ?? '',
      vitaminC: labelScan.vitaminC ?? '',
      source: 'Nutrition label',
    };
    const log = scaleFood(base, 1, 'serving', meal, selectedDate);
    persistAndSave(log, 'Label food saved to diary');
    setLabelScan(null); setLabelPreview('');
  }

  function addManual() {
    if (!manual.name.trim()) return toast('Enter food name');
    // Pass micronutrients as raw strings: scaleFood treats '' as "not provided" so we never store a fake 0.
    const base = { name: manual.name, serving: `${manual.qty}${manual.unit}`, cal: +manual.cal || 0, p: +manual.p || 0, c: +manual.c || 0, f: +manual.f || 0, fiber: +manual.fiber || 0, sugar: +manual.sugar || 0, sodium: +manual.sodium || 0, potassium: manual.potassium, calcium: manual.calcium, iron: manual.iron, vitaminA: manual.vitaminA, vitaminC: manual.vitaminC, source: 'Custom' };
    const log = scaleFood(base, +manual.qty || 100, manual.unit, meal, selectedDate);
    persistAndSave(log, 'Custom food added');
    setManual({ name: '', cal: '', p: '', c: '', f: '', fiber: '', sugar: '', sodium: '', potassium: '', calcium: '', iron: '', vitaminA: '', vitaminC: '', qty: '100', unit: 'g' });

  }

  async function removeLog(logId: string) { save(logs.filter((x) => x.id !== logId)); try { await deleteMeal(logId); } catch {} toast('Food removed'); }

  return <div className="page-wrap">
    <PageHeader title="Add Food" subtitle="Log food in the quickest way: describe it, search it, scan a barcode, take a meal photo, or save a custom food. Review every estimate before saving." />

    <div className="date-card mb-4"><label className="date-card-label">Selected day</label><input className="date-input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></div>

    <div className="mobile-grid mb-5"><MetricCard label="Calories" value={round(totals.cal)} note="selected day"/><MetricCard label="Protein" value={`${round(totals.p)}g`} tone="green"/><MetricCard label="Carbs" value={`${round(totals.c)}g`} tone="orange"/><MetricCard label="Sugar" value={`${round(totals.sugar)}g`} tone="red"/></div>

    <div className="mb-4"><NutrientBreakdown meals={dayLogs} profile={profile} compact /></div>

    <section className="card mb-4 p-4">
      <div className="rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 mb-4 border border-blue-100">
        <p className="micro font-black uppercase tracking-[.16em] text-blue-700">Smart guidance</p>
        <h2 className="mt-1 text-lg font-black">{smartSuggestion.title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">{smartSuggestion.text}</p>
        <p className="mt-2 text-xs font-bold text-slate-500">Movement idea: {movementSuggestion.text}</p>
      </div>
      <div className="quick-actions">
        <button className={mode === 'describe' ? 'quick-action active' : 'quick-action'} onClick={() => setModeAndReset('describe')}>💬<span>Describe</span></button>
        <button className={mode === 'search' ? 'quick-action active' : 'quick-action'} onClick={() => setModeAndReset('search')}>🔎<span>Search</span></button>
        <button className={mode === 'mealPhoto' ? 'quick-action active' : 'quick-action'} onClick={() => setModeAndReset('mealPhoto')}>📷<span>Photo</span></button>
        <button className={mode === 'barcode' ? 'quick-action active' : 'quick-action'} onClick={() => setModeAndReset('barcode')}>▦<span>Barcode</span></button>
        <button className={mode === 'label' ? 'quick-action active' : 'quick-action'} onClick={() => setModeAndReset('label')}>🏷️<span>Label</span></button>
        <button className={mode === 'manual' ? 'quick-action active' : 'quick-action'} onClick={() => setModeAndReset('manual')}>✍️<span>Custom</span></button>
      </div>
    </section>

    {mode === 'search' && <section className="card mb-4 p-5">
      <h2 className="section-title">Food search</h2>
      <p className="micro mt-1">Best for common home foods, Indian meals, fruits, drinks and quick entries.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_110px_110px_130px]">
        <input className="input col-span-2 sm:col-span-1" placeholder="Search dal, rice, apple..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <input aria-label="Quantity" className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(+e.target.value)} />
        <select aria-label="Unit" className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select>
        <select aria-label="Meal" className="input col-span-2 sm:col-span-1" value={meal} onChange={(e) => setMeal(e.target.value)}>{meals.map((m) => <option key={m}>{m}</option>)}</select>
      </div>
      <p className="micro mt-2">Selected: <b>{amount} {unit}</b> for <b>{meal}</b>. Tap Add on any result below.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
        {remoteSearchLoading && <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">Searching databases...</span>}
        {remoteSearchNote && <span className="rounded-full bg-slate-50 px-3 py-2">{remoteSearchNote}</span>}
      </div>
      <div className="mt-4 grid gap-2">{results.length === 0 ? <div className="empty-state"><b>No food found yet</b><p>Try a simpler name like “apple”, “amul dahi”, “costco yogurt”, or use manual entry.</p></div> : results.map((f: any) => { const flags = foodSmartFlags(f, profile); return <div key={`${f.name}-${f.brand || ''}-${f.serving || ''}`} className="food-row food-row-action"><div><b>{f.name}</b>{f.brand && <p className="micro">{f.brand}</p>}<p className="micro">Base {f.serving || '100g'} · {round(f.cal || 0)} kcal · P {round(f.p || 0)}g · C {round(f.c || 0)}g · F {round(f.f || 0)}g</p>{f.source && <p className="micro mt-1">Source: {f.source}</p>}<div className="mt-2 flex flex-wrap gap-1">{flags.map(flag => <span key={flag.label} className={`smart-flag ${flag.tone}`}>{flag.label}</span>)}</div><p className="micro mt-2">{servingHint(f)}</p></div><button className="btn btn-primary food-add-btn" onClick={() => add(f)}>Add {amount} {unit}</button></div>; })}</div>
    </section>}

    {mode === 'manual' && <section className="card mb-4 p-5">
      <h2 className="section-title">Add custom food</h2>
      <p className="micro mt-1">Use this when the food is homemade, not found in search, or you already know the label values.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <input className="input sm:col-span-2" placeholder="Food name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
        <input className="input" type="number" placeholder="Qty" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} />
        <select className="input" value={manual.unit} onChange={(e) => setManual({ ...manual, unit: e.target.value })}>{units.map((u) => <option key={u}>{u}</option>)}</select>
        <input className="input" type="number" placeholder="Calories" value={manual.cal} onChange={(e) => setManual({ ...manual, cal: e.target.value })} />
        <input className="input" type="number" placeholder="Protein g" value={manual.p} onChange={(e) => setManual({ ...manual, p: e.target.value })} />
        <input className="input" type="number" placeholder="Carbs g" value={manual.c} onChange={(e) => setManual({ ...manual, c: e.target.value })} />
        <input className="input" type="number" placeholder="Fat g" value={manual.f} onChange={(e) => setManual({ ...manual, f: e.target.value })} />
        <input className="input" type="number" placeholder="Fiber g" value={manual.fiber} onChange={(e) => setManual({ ...manual, fiber: e.target.value })} />
        <input className="input" type="number" placeholder="Sugar g" value={manual.sugar} onChange={(e) => setManual({ ...manual, sugar: e.target.value })} />
        <input className="input" type="number" placeholder="Sodium mg" value={manual.sodium} onChange={(e) => setManual({ ...manual, sodium: e.target.value })} />
      </div>
      <button type="button" className="btn btn-ghost mt-3 !py-2" onClick={() => setShowManualMicros((v) => !v)}>{showManualMicros ? 'Hide micronutrients' : '+ Add micronutrients (optional)'}</button>
      {showManualMicros && <div className="mt-2 grid gap-2 sm:grid-cols-5">
        <input className="input" type="number" placeholder="Potassium mg" value={manual.potassium} onChange={(e) => setManual({ ...manual, potassium: e.target.value })} />
        <input className="input" type="number" placeholder="Calcium mg" value={manual.calcium} onChange={(e) => setManual({ ...manual, calcium: e.target.value })} />
        <input className="input" type="number" placeholder="Iron mg" value={manual.iron} onChange={(e) => setManual({ ...manual, iron: e.target.value })} />
        <input className="input" type="number" placeholder="Vitamin A µg" value={manual.vitaminA} onChange={(e) => setManual({ ...manual, vitaminA: e.target.value })} />
        <input className="input" type="number" placeholder="Vitamin C mg" value={manual.vitaminC} onChange={(e) => setManual({ ...manual, vitaminC: e.target.value })} />
      </div>}
      <p className="micro mt-2">Micronutrients are optional. Leave blank if unknown — Eatlyte will show them as estimates rather than guessing exact values.</p>
      <button className="btn btn-primary mt-3 w-full" onClick={addManual}>Add custom food</button>
    </section>}

    {mode === 'describe' && <section className="card mb-4 p-5">
      <h2 className="section-title">Describe your meal</h2>
      <p className="micro mt-1">Fastest for everyday use. Type or speak naturally, review each detected food, then save.</p>
      <div className="mt-4 rounded-3xl bg-gradient-to-br from-white to-blue-50 p-4 ring-1 ring-blue-100">
        <p className="micro font-black uppercase tracking-[.16em]">Example</p>
        <p className="mt-1 text-sm font-bold text-slate-700">“2 rotis, 1 bowl dal and tea for lunch”</p>
      </div>
      <textarea className="input mt-3 min-h-28" value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="Describe what you ate..." />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr]">
        <button className={listening ? 'btn btn-danger' : 'btn btn-soft'} onClick={startVoiceCapture} type="button">{listening ? 'Listening...' : 'Use microphone'}</button>
        <button className="btn btn-primary" onClick={parseVoice}>Review foods</button>
      </div>
      {!micSupported && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Microphone capture needs Chrome/Edge and browser permission. You can still type the meal.</p>}
      {parsed.length > 0 && <div className="mt-4 space-y-2">{parsed.map((p, i) => <div key={i} className="food-review-card"><div><b>{p.name}</b><p className="micro">{p.quantity} {p.unit} · {p.meal}</p></div><span className="pill">Review</span></div>)}<button className="btn btn-primary w-full" onClick={confirmParsed}>Save parsed foods</button></div>}
    </section>}

    {mode === 'mealPhoto' && <section className="card mb-4 p-5">
      <h2 className="section-title">Photo meal scanner</h2>
      <p className="micro mt-1">Best for full plates, restaurant food, thali, snacks or mixed meals. The app uses AI only for the estimate; you still review before saving.</p>
      <input className="input mt-3" type="file" accept="image/*" capture="environment" onChange={(e) => analyzePhoto(e.target.files?.[0] || null)} />
      <p className="micro mt-2">{photoStatus}</p>
      {photoPreview && <img src={photoPreview} alt="Meal preview" className="mt-3 h-44 w-full rounded-3xl object-cover ring-1 ring-slate-200" />}
      {photo?.mealContext && <div className="mt-4 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 ring-1 ring-blue-100"><b>{photo.mealContext.meal || meal}</b><p className="micro">{photo.mealContext.cuisineType || 'Detected cuisine'}</p><p className="mt-2 text-sm text-slate-700">{photo.mealContext.description}</p></div>}
      {(photo?.foods || photo?.items || []).length > 0 && <div className="mt-4 space-y-3">{(photo.foods || photo.items || []).map((x: any, i: number) => <div key={i} className="food-photo-card"><div className="flex items-start justify-between gap-3"><div><b>{x.name || 'Detected food'}</b><p className="micro">{x.servingText || `${x.amount || 100} ${x.unit || 'g'}`}</p></div><span className="pill">Estimate</span></div><div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs"><div className="nutri-chip blue"><b>{round(x.cal || x.calories || 0)}</b><span>kcal</span></div><div className="nutri-chip green"><b>{round(x.p || x.protein || 0)}g</b><span>protein</span></div><div className="nutri-chip orange"><b>{round(x.c || x.carbs || 0)}g</b><span>carbs</span></div><div className="nutri-chip red"><b>{round(x.f || x.fat || 0)}g</b><span>fat</span></div></div></div>)}<button className="btn btn-primary w-full" onClick={savePhotoFoods}>Save detected foods</button></div>}
    </section>}

    {mode === 'barcode' && <section className="card mb-4 p-5">
      <h2 className="section-title">Barcode scanner</h2>
      <p className="micro mt-1">Scan packaged foods. Works best on mobile HTTPS with camera permission. Manual barcode entry is always available.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_.9fr]">
        <div>
          <div className="scanner-frame">
            <video ref={videoRef} muted playsInline className={scannerActive ? 'scanner-video' : 'hidden'} />
            {!scannerActive && <div className="scanner-empty"><span>▦</span><b>Ready to scan</b><p>Use rear camera and hold barcode inside the frame.</p></div>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn btn-primary" onClick={startBarcodeScanner} disabled={scannerActive}>{scannerActive ? 'Scanning...' : 'Start scanner'}</button>
            <button className="btn btn-ghost" onClick={stopBarcodeScanner}>Stop</button>
          </div>
          {!barcodeSupported && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Camera barcode scanning may not be supported in this browser. Enter the barcode manually.</p>}
        </div>
        <div>
          <label className="label">Barcode number</label>
          <div className="grid grid-cols-[1fr_auto] gap-2"><input className="input" placeholder="UPC / EAN" value={barcodeCode} onChange={(e) => setBarcodeCode(e.target.value)} /><button className="btn btn-soft" onClick={() => lookupBarcode()}>Lookup</button></div>
          <p className="micro mt-2">{barcodeStatus}</p>
          {barcodeProduct && <div className="food-photo-card mt-4">
            <span className="pill">Packaged food</span>
            <h3 className="mt-3 text-xl font-black">{barcodeProduct.name}</h3>
            {barcodeProduct.brand && <p className="micro">{barcodeProduct.brand}</p>}
            <p className="micro mt-1">Serving: {barcodeProduct.serving}</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs"><div className="nutri-chip blue"><b>{round(barcodeProduct.cal)}</b><span>kcal</span></div><div className="nutri-chip green"><b>{round(barcodeProduct.p)}g</b><span>protein</span></div><div className="nutri-chip orange"><b>{round(barcodeProduct.c)}g</b><span>carbs</span></div><div className="nutri-chip red"><b>{round(barcodeProduct.f)}g</b><span>fat</span></div></div>
            <label className="label mt-4">Servings eaten</label><input className="input" type="number" min="0.25" step="0.25" value={barcodeQty} onChange={(e) => setBarcodeQty(+e.target.value)} />
            <button className="btn btn-primary mt-3 w-full" onClick={saveBarcodeProduct}>Save packaged food</button>
          </div>}
        </div>
      </div>
    </section>}

    {mode === 'label' && <section className="card mb-4 p-5">
      <h2 className="section-title">Nutrition label entry</h2>
      <p className="micro mt-1">Use barcode lookup first. If barcode data is missing, enter label values here manually.</p>
      <div className="mt-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4">
        <div className="grid gap-2 sm:grid-cols-2"><input className="input sm:col-span-2" placeholder="Food name" value={labelScan?.name || ''} onChange={(e) => updateLabelField('name', e.target.value)} /><input className="input sm:col-span-2" placeholder="Serving size, e.g. 30g or 1 pack" value={labelScan?.serving || ''} onChange={(e) => updateLabelField('serving', e.target.value)} /><input className="input" placeholder="Calories" value={labelScan?.cal || labelScan?.calories || ''} onChange={(e) => updateLabelField('cal', e.target.value)} /><input className="input" placeholder="Protein g" value={labelScan?.p || labelScan?.protein || ''} onChange={(e) => updateLabelField('p', e.target.value)} /><input className="input" placeholder="Carbs g" value={labelScan?.c || labelScan?.carbs || ''} onChange={(e) => updateLabelField('c', e.target.value)} /><input className="input" placeholder="Fat g" value={labelScan?.f || labelScan?.fat || ''} onChange={(e) => updateLabelField('f', e.target.value)} /><input className="input" placeholder="Sugar g" value={labelScan?.sugar || ''} onChange={(e) => updateLabelField('sugar', e.target.value)} /><input className="input" placeholder="Sodium mg" value={labelScan?.sodium || ''} onChange={(e) => updateLabelField('sodium', e.target.value)} /><input className="input" placeholder="Potassium mg (optional)" value={labelScan?.potassium || ''} onChange={(e) => updateLabelField('potassium', e.target.value)} /><input className="input" placeholder="Calcium mg (optional)" value={labelScan?.calcium || ''} onChange={(e) => updateLabelField('calcium', e.target.value)} /><input className="input" placeholder="Iron mg (optional)" value={labelScan?.iron || ''} onChange={(e) => updateLabelField('iron', e.target.value)} /><input className="input" placeholder="Vitamin C mg (optional)" value={labelScan?.vitaminC || ''} onChange={(e) => updateLabelField('vitaminC', e.target.value)} /></div>
        <button className="btn btn-primary mt-3 w-full" onClick={saveLabelFood}>Save label food</button>
      </div>
    </section>}

    <section className="card mt-4 p-5">
      <h2 className="section-title">Diary for selected day</h2>
      <div className="mt-4 space-y-2">{dayLogs.length === 0 ? <p className="micro">No food logged for this day yet.</p> : dayLogs.map((log) => <div key={log.id} className="food-row"><div><b>{log.name}</b><p className="micro">{log.meal} · {log.qty} · {round(log.cal)} kcal</p></div><button className="btn btn-ghost !py-2" onClick={() => removeLog(log.id)}>Remove</button></div>)}</div>
    </section>
  </div>;
}
