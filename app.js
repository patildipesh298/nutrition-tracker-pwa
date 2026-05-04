/* NutriFamily Elder Pro - production-style plain JS starter */
const $ = (id) => document.getElementById(id);
const dateId = (d = new Date()) => d.toISOString().slice(0, 10);
const round = (n, d = 0) => Number(n || 0).toFixed(d).replace(/\.0$/, "");

let supabaseClient = null;
let currentUser = null;
let profile = null;
let charts = {};
let activeTab = "dashboard";
let lastFoodResults = [];
let pendingVoiceFoods = [];
let activeSpeechRecognition = null;
let foodTrackingDate = dateId();

const DEFAULT_HEALTH_RULES = {
  markers: {},
  dietByCondition: {},
  redFlags: ["Chest pain", "Severe breathlessness", "Fainting", "Confusion"]
};

function healthRules() {
  return window.HEALTH_RULES || DEFAULT_HEALTH_RULES;
}

function toast(message) {
  const el = $("toast");
  if (!el) return alert(message);
  el.textContent = message;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3600);
}

function localKey(type) {
  const uid = currentUser?.id || "guest";
  return `nfep_${uid}_${type}`;
}

function getLogs(type) {
  try { return JSON.parse(localStorage.getItem(localKey(type)) || "[]"); }
  catch { return []; }
}

function setLogs(type, value) {
  localStorage.setItem(localKey(type), JSON.stringify(value));
}

function todayItems(type) {
  return getLogs(type).filter((x) => x.date === dateId());
}

function selectedFoodDate() {
  return $("foodTrackingDate")?.value || foodTrackingDate || dateId();
}

function formatLongDate(dateStr) {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

function changeFoodDate(value) {
  foodTrackingDate = value || dateId();
  if ($("foodTrackingDate")) $("foodTrackingDate").value = foodTrackingDate;
  renderMeals();
  renderFoodMonth();
}

function setFoodDateToday() {
  changeFoodDate(dateId());
}

function moveFoodDate(days) {
  const d = new Date(`${selectedFoodDate()}T00:00:00`);
  d.setDate(d.getDate() + days);
  changeFoodDate(dateId(d));
}

function upsertToday(type, obj) {
  const logs = getLogs(type);
  const idx = logs.findIndex((x) => x.date === dateId());
  if (idx >= 0) logs[idx] = { ...logs[idx], ...obj, date: dateId() };
  else logs.push({ ...obj, date: dateId() });
  setLogs(type, logs);
}

async function loadRuntimeConfig() {
  const cfg = window.APP_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) return;
  try {
    const r = await fetch("/api/config");
    if (r.ok) window.APP_CONFIG = { ...cfg, ...(await r.json()) };
  } catch (e) { console.warn("Runtime config route unavailable", e); }
}

function initSupabase() {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_URL.includes("YOUR_")) {
    console.warn("Supabase config is missing. Running local demo mode.");
    return null;
  }
  return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
}

async function init() {
  await loadRuntimeConfig();
  supabaseClient = initSupabase();
  buildLabInputs();
  buildExerciseSelect();
  if ($("foodTrackingDate")) $("foodTrackingDate").value = foodTrackingDate;
  $("reportDate").value = dateId();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(console.warn);
  }

  if (!supabaseClient) {
    currentUser = { id: "guest", email: "demo@local" };
    await loadProfile();
    showApp();
    renderAll();
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      await loadProfile();
      showApp();
      renderAll();
    } else {
      showAuth();
    }
  });

  if (currentUser) {
    await loadProfile();
    showApp();
    renderAll();
  } else {
    showAuth();
  }
}

function showAuth() { $("authScreen").classList.remove("hidden"); $("app").classList.add("hidden"); }
function showApp() { $("authScreen").classList.add("hidden"); $("app").classList.remove("hidden"); }

async function signInWithGoogle() {
  if (!supabaseClient) return toast("Add Supabase URL and anon key in config.js first.");
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  if (error) showAuthMessage(error.message);
}

async function emailSignIn() {
  if (!supabaseClient) return toast("Demo mode is active because Supabase is not configured.");
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  showAuthMessage(error ? error.message : "Signed in.");
}

async function emailSignUp() {
  if (!supabaseClient) return toast("Add Supabase configuration before creating accounts.");
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const { error } = await supabaseClient.auth.signUp({ email, password });
  showAuthMessage(error ? error.message : "Account created. Check email if confirmation is enabled.");
}

function showAuthMessage(msg) { $("authMessage").textContent = msg; }
async function signOut() { if (supabaseClient) await supabaseClient.auth.signOut(); currentUser = null; showAuth(); }

function defaultProfile() {
  return {
    name: "Family Member", age: 65, gender: "male", height: 170, weight: 70, activity: "1.2",
    goal: "elder-maintain", diet: "Vegetarian", cuisine: "Indian", conditions: [], allergies: "",
    medicines: "", doctor_notes: "", emergency: ""
  };
}

async function loadProfile() {
  profile = defaultProfile();
  const local = localStorage.getItem(localKey("profile"));
  if (local) profile = { ...profile, ...JSON.parse(local) };

  if (supabaseClient && currentUser?.id !== "guest") {
    const { data, error } = await supabaseClient.from("profiles").select("*").eq("user_id", currentUser.id).maybeSingle();
    if (!error && data) profile = { ...profile, ...normalizeProfileFromDb(data) };
  }
}

function normalizeProfileFromDb(row) {
  return {
    name: row.full_name || row.name || "Family Member",
    age: row.age, gender: row.gender, height: row.height_cm || row.height, weight: row.weight_kg || row.weight,
    activity: row.activity_level || row.activity || "1.2", goal: row.goal || "elder-maintain",
    diet: row.diet_preference || row.diet || "Vegetarian", cuisine: row.cuisine_preference || row.cuisine || "Indian",
    conditions: row.known_conditions || row.conditions || [], allergies: row.allergies || "",
    medicines: row.medicines || "", doctor_notes: row.doctor_notes || "", emergency: row.emergency_contact || row.emergency || ""
  };
}

function collectProfile() {
  return {
    name: $("pName").value.trim() || "Family Member",
    age: +$("pAge").value || 65,
    gender: $("pGender").value,
    height: +$("pHeight").value || 170,
    weight: +$("pWeight").value || 70,
    activity: $("pActivity").value,
    goal: $("pGoal").value,
    diet: $("pDiet").value,
    cuisine: $("pCuisine").value,
    conditions: [...$("pConditions").selectedOptions].map((o) => o.value),
    allergies: $("pAllergies").value,
    medicines: $("pMedicines").value,
    doctor_notes: $("pDoctorNotes").value,
    emergency: $("pEmergency").value
  };
}

async function saveProfile() {
  profile = collectProfile();
  localStorage.setItem(localKey("profile"), JSON.stringify(profile));

  if (supabaseClient && currentUser?.id !== "guest") {
    const row = {
      user_id: currentUser.id,
      full_name: profile.name,
      age: profile.age,
      gender: profile.gender,
      height_cm: profile.height,
      weight_kg: profile.weight,
      activity_level: profile.activity,
      goal: profile.goal,
      diet_preference: profile.diet,
      cuisine_preference: profile.cuisine,
      known_conditions: profile.conditions,
      allergies: profile.allergies,
      medicines: profile.medicines,
      doctor_notes: profile.doctor_notes,
      emergency_contact: profile.emergency,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabaseClient.from("profiles").upsert(row, { onConflict: "user_id" });
    if (error) toast("Profile saved locally, but Supabase save failed: " + error.message);
    else toast("Profile saved.");
  } else toast("Profile saved locally.");
  renderAll();
}

function fillProfile() {
  if (!profile) return;
  $("pName").value = profile.name || ""; $("pAge").value = profile.age || ""; $("pGender").value = profile.gender || "male";
  $("pHeight").value = profile.height || ""; $("pWeight").value = profile.weight || ""; $("pActivity").value = profile.activity || "1.2";
  $("pGoal").value = profile.goal || "elder-maintain"; $("pDiet").value = profile.diet || "Vegetarian"; $("pCuisine").value = profile.cuisine || "Indian";
  [...$("pConditions").options].forEach((o) => o.selected = (profile.conditions || []).includes(o.value));
  $("pAllergies").value = profile.allergies || ""; $("pMedicines").value = profile.medicines || ""; $("pDoctorNotes").value = profile.doctor_notes || ""; $("pEmergency").value = profile.emergency || "";
  renderTargets();
}

function targets() {
  const w = +profile.weight || 70, h = +profile.height || 170, age = +profile.age || 65, activity = +profile.activity || 1.2;
  let bmr = profile.gender === "female" ? 10*w + 6.25*h - 5*age - 161 : 10*w + 6.25*h - 5*age + 5;
  let cal = bmr * activity;
  if (profile.goal === "loss") cal -= 300;
  if (profile.goal === "gain") cal += 250;
  if (profile.goal === "elder-maintain") cal = Math.max(cal, 1500);
  const proteinFactor = age >= 60 ? 1.05 : 0.9;
  if ((profile.conditions || []).includes("kidney")) {
    return { cal: Math.round(cal), protein: Math.round(w * 0.8), carbs: Math.round(cal * .48 / 4), fats: Math.round(cal * .28 / 9), fiber: 25, sodium: 1800, water: 7, steps: 5000 };
  }
  return { cal: Math.round(cal), protein: Math.round(w * proteinFactor), carbs: Math.round(cal * .48 / 4), fats: Math.round(cal * .28 / 9), fiber: age >= 60 ? 25 : 30, sodium: (profile.conditions || []).includes("hypertension") ? 1500 : 2300, water: 8, steps: age >= 60 ? 6000 : 8000 };
}

function renderTargets() {
  const t = targets();
  $("targetPreview").innerHTML = [
    ["Calories", `${t.cal} kcal`], ["Protein", `${t.protein} g`], ["Carbs", `${t.carbs} g`], ["Fat", `${t.fats} g`],
    ["Fiber", `${t.fiber} g`], ["Sodium", `≤ ${t.sodium} mg`], ["Water", `${t.water} glasses`], ["Steps", `${t.steps}`]
  ].map(([a,b]) => `<div><span class="muted">${a}</span><b>${b}</b></div>`).join("");
}

function showTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".tab-panel").forEach((x) => x.classList.add("hidden"));
  $(tab).classList.remove("hidden");
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  renderAll();
}


function mealFromText(text = "") {
  const t = String(text).toLowerCase();
  if (t.includes("breakfast") || t.includes("morning")) return "Breakfast";
  if (t.includes("lunch") || t.includes("afternoon")) return "Lunch";
  if (t.includes("dinner") || t.includes("supper") || t.includes("night")) return "Dinner";
  if (t.includes("snack") || t.includes("snacks")) return "Snacks";
  const h = new Date().getHours();
  if (h < 11) return "Breakfast";
  if (h < 16) return "Lunch";
  if (h < 21) return "Dinner";
  return "Snacks";
}

function normalizeVoiceUnit(unit = "serving") {
  const u = String(unit || "serving").toLowerCase().trim();
  if (["g", "gram", "grams", "gm", "gms"].includes(u)) return "g";
  if (["ml", "milliliter", "milliliters", "millilitre", "millilitres"].includes(u)) return "ml";
  if (["cup", "cups"].includes(u)) return "ml";
  if (["bowl", "bowls", "katori", "katoris"].includes(u)) return "g";
  if (["piece", "pieces", "pc", "pcs", "serving", "servings", "plate", "plates", "roti", "rotis", "chapati", "chapatis"].includes(u)) return "serving";
  return "serving";
}

function estimateVoiceAmount(quantity = 1, unit = "serving", foodName = "") {
  const q = Math.max(Number(quantity) || 1, 0.01);
  const u = String(unit || "serving").toLowerCase();
  const food = String(foodName || "").toLowerCase();
  if (["cup", "cups"].includes(u)) return { amount: q * 240, unit: "ml" };
  if (["bowl", "bowls", "katori", "katoris"].includes(u)) return { amount: q * 150, unit: "g" };
  if (u === "glass" || u === "glasses") return { amount: q * 250, unit: "ml" };
  if (u === "tbsp" || u === "tablespoon" || u === "tablespoons") return { amount: q * 15, unit: "ml" };
  if (u === "tsp" || u === "teaspoon" || u === "teaspoons") return { amount: q * 5, unit: "ml" };
  if (food.includes("milk") && normalizeVoiceUnit(u) === "serving") return { amount: q * 250, unit: "ml" };
  return { amount: q, unit: normalizeVoiceUnit(u) };
}

function localParseFoodSentence(text) {
  const meal = mealFromText(text);
  let clean = String(text || "").toLowerCase()
    .replace(/please|can you|could you|i had|i ate|add|log|record|for breakfast|for lunch|for dinner|for snacks|for snack|at \d{1,2}(:\d{2})?\s?(am|pm)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = clean.split(/,| and | with /i).map(x => x.trim()).filter(Boolean);
  const foods = [];
  const numberWords = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, half:0.5 };
  for (const part of parts) {
    let p = part.trim();
    if (!p) continue;
    p = p.replace(/^a\s+|^an\s+/, "1 ");
    for (const [word, num] of Object.entries(numberWords)) p = p.replace(new RegExp(`^${word}\\b`, "i"), String(num));
    let m = p.match(/^(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml|cup|cups|bowl|bowls|katori|katoris|glass|glasses|piece|pieces|serving|servings|tbsp|tsp)?\s+(.+)$/i);
    let quantity = 1, unit = "serving", name = p;
    if (m) { quantity = Number(m[1]) || 1; unit = m[2] || "serving"; name = m[3]; }
    name = name.replace(/\b(for|breakfast|lunch|dinner|snacks|snack)\b/g, "").trim();
    if (name.length > 1) foods.push({ name, quantity, unit, meal, time: "", confidence: 0.55 });
  }
  return { foods, source: "local-fallback" };
}

async function parseFoodTextWithAI(text) {
  const fallback = localParseFoodSentence(text);
  try {
    const r = await fetch("/api/ai-food-logger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, defaultMeal: mealFromText(text), profile: profile || {} })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "AI parser failed");
    if (Array.isArray(data.foods) && data.foods.length) return { foods: data.foods, source: "ai" };
    return fallback;
  } catch (error) {
    console.warn("AI food parser fallback used:", error);
    return fallback;
  }
}

function startVoiceFoodLogger() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const status = $("voiceFoodStatus");
  const btn = $("voiceFoodBtn");
  if (!SpeechRecognition) {
    if (status) status.textContent = "Voice input is not supported in this browser. Type the food sentence and tap Parse typed text.";
    toast("Voice input is not supported here. Use typed food logging.");
    return;
  }
  if (activeSpeechRecognition) {
    activeSpeechRecognition.stop();
    activeSpeechRecognition = null;
  }
  const recognition = new SpeechRecognition();
  activeSpeechRecognition = recognition;
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;
  if (btn) btn.disabled = true;
  if (status) status.textContent = "Listening... say your food, quantity, and meal.";
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map(r => r[0]?.transcript || "").join(" ").trim();
    if ($("voiceFoodText")) $("voiceFoodText").value = transcript;
    if (event.results[event.results.length - 1].isFinal) parseTypedFoodLog();
  };
  recognition.onerror = (event) => {
    if (status) status.textContent = `Voice error: ${event.error}. You can type instead.`;
    if (btn) btn.disabled = false;
  };
  recognition.onend = () => {
    activeSpeechRecognition = null;
    if (btn) btn.disabled = false;
    if (status && !$('voiceFoodPreview')?.innerHTML) status.textContent = "Voice stopped. Review text or tap Parse typed text.";
  };
  recognition.start();
}

async function parseTypedFoodLog() {
  const text = $("voiceFoodText")?.value?.trim();
  const status = $("voiceFoodStatus");
  const preview = $("voiceFoodPreview");
  if (!text) return toast("Speak or type what you ate first.");
  if (status) status.textContent = "Understanding food, quantities, and meal...";
  if (preview) preview.innerHTML = `<div class="ai-loading">Parsing food log...</div>`;
  const parsed = await parseFoodTextWithAI(text);
  pendingVoiceFoods = (parsed.foods || []).map((item) => {
    const estimated = estimateVoiceAmount(item.quantity, item.unit, item.name);
    return {
      name: item.name || "Food",
      quantity: estimated.amount,
      unit: estimated.unit,
      spokenQuantity: item.quantity || estimated.amount,
      spokenUnit: item.unit || estimated.unit,
      meal: item.meal || mealFromText(text),
      time: item.time || "",
      confidence: item.confidence || (parsed.source === "ai" ? 0.8 : 0.55)
    };
  });
  renderVoiceFoodPreview(parsed.source || "parser");
  if (status) status.textContent = pendingVoiceFoods.length ? "Review detected items, edit if needed, then confirm." : "No foods detected. Try: Add 150g rice and 1 cup dal for lunch.";
}

async function resolveFoodCandidate(name) {
  const q = String(name || "").toLowerCase().trim();
  const local = (window.LOCAL_FOODS || []).map(normalizeFood);
  let found = local.find(f => f.name.toLowerCase() === q) || local.find(f => f.name.toLowerCase().includes(q) || q.includes(f.name.toLowerCase()));
  if (found) return { ...found, source: found.source || "Local dataset" };
  const words = q.split(/\s+/).filter(w => w.length > 2);
  found = local.find(f => words.some(w => f.name.toLowerCase().includes(w) || (f.tags || []).join(" ").toLowerCase().includes(w)));
  if (found) return { ...found, source: found.source || "Local dataset" };
  const usda = await searchUSDA(q);
  if (usda[0]) return normalizeFood(usda[0]);
  return normalizeFood({ name, group: "Voice entry", source: "Manual estimate needed", serving: "1 serving", baseAmount: 1, baseUnit: "serving", cal: 0, p: 0, c: 0, f: 0, fiber: 0, sugar: 0, sodium: 0 });
}

function renderVoiceFoodPreview(source = "parser") {
  const preview = $("voiceFoodPreview");
  if (!preview) return;
  if (!pendingVoiceFoods.length) {
    preview.innerHTML = `<div class="empty-state">No food items detected yet.</div>`;
    return;
  }
  preview.innerHTML = `
    <div class="voice-preview-head">
      <div><p class="eyebrow">Detected by ${escapeHtml(source)}</p><h3>Confirm before adding</h3></div>
      <button class="primary" onclick="confirmVoiceFoods()">Add all to food log</button>
    </div>
    ${pendingVoiceFoods.map((f, i) => `
      <div class="voice-food-item">
        <label>Food<input id="vfName_${i}" value="${escapeHtml(f.name)}" /></label>
        <label>Quantity<input id="vfQty_${i}" type="number" min="0.01" step="1" value="${round(f.quantity, 2)}" /></label>
        <label>Unit<select id="vfUnit_${i}"><option value="g" ${f.unit==='g'?'selected':''}>g</option><option value="ml" ${f.unit==='ml'?'selected':''}>ml</option><option value="serving" ${f.unit==='serving'?'selected':''}>serving</option></select></label>
        <label>Meal<select id="vfMeal_${i}"><option ${f.meal==='Breakfast'?'selected':''}>Breakfast</option><option ${f.meal==='Lunch'?'selected':''}>Lunch</option><option ${f.meal==='Dinner'?'selected':''}>Dinner</option><option ${f.meal==='Snacks'?'selected':''}>Snacks</option></select></label>
        <button class="ghost" onclick="removeVoiceFood(${i})">Remove</button>
      </div>
    `).join("")}
    <p class="muted small-note">AI can misunderstand food names or quantities. Please confirm before saving, especially for diabetes, kidney, heart, BP, or medication-related tracking.</p>
  `;
}

function removeVoiceFood(index) {
  pendingVoiceFoods.splice(index, 1);
  renderVoiceFoodPreview("edited");
}

async function confirmVoiceFoods() {
  if (!pendingVoiceFoods.length) return toast("No voice foods to add.");
  const status = $("voiceFoodStatus");
  if (status) status.textContent = "Matching foods and adding nutrition values...";
  let added = 0;
  for (let i = 0; i < pendingVoiceFoods.length; i++) {
    const name = $("vfName_" + i)?.value?.trim() || pendingVoiceFoods[i].name;
    const amount = +($("vfQty_" + i)?.value || pendingVoiceFoods[i].quantity) || 1;
    const unit = $("vfUnit_" + i)?.value || pendingVoiceFoods[i].unit || "serving";
    const meal = $("vfMeal_" + i)?.value || pendingVoiceFoods[i].meal || "Snacks";
    const candidate = await resolveFoodCandidate(name);
    addFood(candidate, amount, unit, meal, { silent: true, sourceNote: "voice-ai" });
    added++;
  }
  pendingVoiceFoods = [];
  if ($("voiceFoodPreview")) $("voiceFoodPreview").innerHTML = `<div class="success-box">Added ${added} item${added === 1 ? "" : "s"} to today’s food log.</div>`;
  if (status) status.textContent = "Food added. Dashboard totals updated.";
  if ($("voiceFoodText")) $("voiceFoodText").value = "";
  toast("Voice food log added.");
  renderAll();
}

async function searchFood() {
  const q = $("foodQuery").value.trim().toLowerCase();
  const src = $("foodSource").value;
  if (!q) return toast("Enter a food name.");
  let results = [];
  if (src === "all" || src === "local") {
    results.push(...(window.LOCAL_FOODS || []).filter((f) => `${f.name} ${f.group} ${(f.tags||[]).join(" ")}`.toLowerCase().includes(q)).map((f) => ({ ...f, source: "Local dataset" })));
  }
  if (src === "all" || src === "usda") results.push(...await searchUSDA(q));
  if (src === "all" || src === "off") results.push(...await searchOpenFoodFacts(q));
  renderFoodResults(results.slice(0, 18));
}

async function searchUSDA(q) {
  try {
    const r = await fetch(`/api/usda?query=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error("USDA route failed");
    const data = await r.json();
    return (data.foods || []).slice(0, 6).map((f) => {
      const n = (name) => (f.foodNutrients || []).find((x) => x.nutrientName?.toLowerCase().includes(name))?.value || 0;
      return { name: f.description, group: "USDA", serving: "100g", cal: n("energy"), p: n("protein"), c: n("carbohydrate"), f: n("total lipid"), fiber: n("fiber"), sugar: n("sugars"), sodium: n("sodium"), source: "USDA" };
    });
  } catch (e) { console.warn(e); return []; }
}

async function searchOpenFoodFacts(q) {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=6`);
    const data = await r.json();
    return (data.products || []).map((p) => {
      const n = p.nutriments || {};
      return { name: p.product_name || p.generic_name || "Packaged food", group: p.brands || "Open Food Facts", serving: "100g", cal: n["energy-kcal_100g"] || 0, p: n.proteins_100g || 0, c: n.carbohydrates_100g || 0, f: n.fat_100g || 0, fiber: n.fiber_100g || 0, sugar: n.sugars_100g || 0, sodium: Math.round((n.sodium_100g || 0) * 1000), source: "Open Food Facts" };
    });
  } catch (e) { console.warn(e); return []; }
}

function getFavoriteFoods() { return getLogs("favoriteFoods"); }
function setFavoriteFoods(items) { setLogs("favoriteFoods", items); }

function parseServingAmount(serving = "") {
  const text = String(serving).toLowerCase();
  const gm = text.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (gm) return { amount: +gm[1], unit: "g" };
  const ml = text.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (ml) return { amount: +ml[1], unit: "ml" };
  return { amount: 1, unit: "serving" };
}

function normalizeFood(food) {
  const base = food.baseAmount ? { amount:+food.baseAmount, unit:food.baseUnit || "g" } : parseServingAmount(food.serving);
  return { ...food, baseAmount: base.amount || 1, baseUnit: base.unit || "serving" };
}

function calculateFoodPortion(food, amount, unit) {
  const f = normalizeFood(food);
  const qty = Math.max(+amount || 1, 0.01);
  const selectedUnit = unit || f.baseUnit || "serving";
  let factor = qty;
  if ((selectedUnit === "g" || selectedUnit === "ml") && (f.baseUnit === "g" || f.baseUnit === "ml")) {
    factor = qty / Math.max(+f.baseAmount || 100, 1);
  } else if (selectedUnit === "serving") {
    factor = qty;
  }
  const scaled = {
    ...f,
    amount: qty,
    amountUnit: selectedUnit,
    qty: `${round(qty, selectedUnit === "serving" ? 2 : 0)} ${selectedUnit}`,
    cal: (+f.cal || 0) * factor, p: (+f.p || 0) * factor, c: (+f.c || 0) * factor, f: (+f.f || 0) * factor,
    fiber: (+f.fiber || 0) * factor, sugar: (+f.sugar || 0) * factor, sodium: (+f.sodium || 0) * factor
  };
  return scaled;
}

function renderFoodResults(results) {
  lastFoodResults = results.map(normalizeFood);
  $("foodResults").innerHTML = lastFoodResults.length ? lastFoodResults.map((f, i) => {
    const baseText = f.baseUnit === "serving" ? (f.serving || "1 serving") : `per ${round(f.baseAmount)}${f.baseUnit}`;
    const defaultQty = f.baseUnit === "serving" ? 1 : f.baseAmount;
    return `
    <div class="result-card food-result-card">
      <div class="row-between"><h3>${escapeHtml(f.name)}</h3><button class="icon-btn" title="Save favorite" onclick="toggleFavoriteFood(${i})">☆</button></div>
      <div class="meta"><span>${escapeHtml(f.source || "Food")}</span><span>${escapeHtml(f.group || "")}</span><span>${escapeHtml(baseText)}</span></div>
      <p class="muted nutrition-line">${round(f.cal)} kcal • P ${round(f.p,1)}g • Carbs ${round(f.c,1)}g • Fat ${round(f.f,1)}g</p>
      <p class="sugar-line">Sugar <b>${round(f.sugar,1)}g</b> • Fiber <b>${round(f.fiber,1)}g</b> • Sodium <b>${round(f.sodium)}mg</b></p>
      <div class="portion-row">
        <label>Quantity<input id="qty_${i}" type="number" min="0.01" step="1" value="${defaultQty}" /></label>
        <label>Unit<select id="unit_${i}"><option value="g" ${f.baseUnit==='g'?'selected':''}>g</option><option value="ml" ${f.baseUnit==='ml'?'selected':''}>ml</option><option value="serving" ${f.baseUnit==='serving'?'selected':''}>serving</option></select></label>
      </div>
      <button class="primary full" onclick="addFoodByIndex(${i})">Add to ${$("mealType").value}</button>
    </div>`;
  }).join("") : `<p class="muted">No result. Try a simpler food name or add it manually.</p>`;
}

function addFoodByIndex(index) {
  const food = lastFoodResults[index];
  if (!food) return toast("Food result not found. Search again.");
  addFood(food, $("qty_" + index).value, $("unit_" + index).value, $("mealType").value);
}

function addFood(food, amount = 1, unit = "serving", meal = null, options = {}) {
  const portion = calculateFoodPortion(food, amount, unit);
  const logs = getLogs("foods");
  logs.push({ ...portion, date: selectedFoodDate(), meal: meal || $("mealType")?.value || "Snacks", loggedAt: new Date().toISOString(), sourceNote: options.sourceNote || "manual" });
  setLogs("foods", logs);
  if (!options.silent) { toast("Food added with exact portion."); renderAll(); }
}

function toggleFavoriteFood(index) {
  const food = lastFoodResults[index];
  if (!food) return;
  const favs = getFavoriteFoods();
  const key = `${food.name}|${food.source || ""}`.toLowerCase();
  const exists = favs.findIndex((x) => `${x.name}|${x.source || ""}`.toLowerCase() === key);
  if (exists >= 0) { favs.splice(exists, 1); toast("Removed from favorites."); }
  else { favs.unshift(normalizeFood(food)); toast("Added to favorites."); }
  setFavoriteFoods(favs.slice(0, 30)); renderFavorites();
}

function addFavorite(index) {
  const food = getFavoriteFoods()[index];
  if (!food) return;
  const amount = $("favQty_" + index).value;
  const unit = $("favUnit_" + index).value;
  const meal = $("favMeal_" + index).value;
  addFood(food, amount, unit, meal);
}

function clearFavorites() {
  if (!confirm("Clear all favorite foods?")) return;
  setFavoriteFoods([]); renderFavorites();
}

function renderFavorites() {
  const favs = getFavoriteFoods().map(normalizeFood);
  const el = $("favoriteFoods");
  if (!el) return;
  el.innerHTML = favs.length ? favs.map((f, i) => {
    const defQty = f.baseUnit === "serving" ? 1 : f.baseAmount;
    return `<div class="favorite-food-card">
      <div><h3>${escapeHtml(f.name)}</h3><p class="muted">${round(f.cal)} kcal • Sugar ${round(f.sugar,1)}g • ${escapeHtml(f.serving || `per ${f.baseAmount}${f.baseUnit}`)}</p></div>
      <div class="favorite-add-row">
        <input id="favQty_${i}" type="number" min="0.01" step="1" value="${defQty}" aria-label="favorite quantity" />
        <select id="favUnit_${i}"><option value="g" ${f.baseUnit==='g'?'selected':''}>g</option><option value="ml" ${f.baseUnit==='ml'?'selected':''}>ml</option><option value="serving" ${f.baseUnit==='serving'?'selected':''}>serving</option></select>
        <select id="favMeal_${i}"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snacks</option></select>
        <button onclick="addFavorite(${i})" class="primary">Add</button>
      </div>
    </div>`;
  }).join("") : `<div class="empty-state">No favorites yet. Search any food and tap ☆ to save it for one-tap mobile logging.</div>`;
}

function addManualFood() {
  const name = $("manualFoodName").value.trim();
  if (!name) return toast("Enter custom food name.");
  const baseUnit = $("manualFoodUnit").value;
  const food = normalizeFood({
    name, group: "Custom food", source: "Manual", serving: `100${baseUnit}`, baseAmount: 100, baseUnit,
    cal:+$("manualCal").value||0, p:+$("manualProtein").value||0, c:+$("manualCarbs").value||0, f:+$("manualFat").value||0,
    fiber:+$("manualFiber").value||0, sugar:+$("manualSugar").value||0, sodium:+$("manualSodium").value||0
  });
  addFood(food, +$("manualQty").value || 100, $("manualQtyUnit").value, $("manualMealType").value);
  ["manualFoodName","manualCal","manualProtein","manualCarbs","manualFat","manualFiber","manualSugar","manualSodium"].forEach((id)=> { if ($(id)) $(id).value = ""; });
}

function clearSelectedDayFoods() {
  const d = selectedFoodDate();
  if (!confirm(`Clear meal logs for ${formatLongDate(d)}?`)) return;
  setLogs("foods", getLogs("foods").filter((x) => x.date !== d));
  renderAll();
}

function clearTodayFoods() { clearSelectedDayFoods(); }

function removeLog(type, index) {
  const logs = getLogs(type); logs.splice(index, 1); setLogs(type, logs); renderAll();
}

function renderMeals() {
  const d = selectedFoodDate();
  const all = getLogs("foods");
  const items = all.map((x, index) => ({ ...x, index })).filter((x) => x.date === d);
  const totals = calcFoodTotals(d);
  if ($("foodCalSummary")) $("foodCalSummary").textContent = round(totals.cal);
  if ($("foodSugarSummary")) $("foodSugarSummary").textContent = `${round(totals.sugar,1)}g`;
  if ($("foodProteinSummary")) $("foodProteinSummary").textContent = `${round(totals.p,1)}g`;
  if ($("foodFiberSummary")) $("foodFiberSummary").textContent = `${round(totals.fiber,1)}g`;
  if ($("selectedFoodDateTitle")) $("selectedFoodDateTitle").textContent = formatLongDate(d);
  if ($("mealLogTitle")) $("mealLogTitle").textContent = `Meals for ${formatLongDate(d)}`;
  renderDailyMealSummary(items);
  $("mealLog").innerHTML = items.length ? items.map((x) => `<div class="log meal-log-card"><div class="row-between"><div><h3>${x.meal}: ${escapeHtml(x.name)}</h3><p class="muted">${round(x.cal)} kcal • P ${round(x.p,1)}g C ${round(x.c,1)}g F ${round(x.f,1)}g</p><p class="sugar-line">Sugar <b>${round(x.sugar,1)}g</b> • Fiber <b>${round(x.fiber,1)}g</b> • Sodium <b>${round(x.sodium)}mg</b> • Qty <b>${escapeHtml(x.qty || '')}</b></p><p class="muted small-note">Logged ${new Date(x.loggedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><button class="danger" onclick="removeLog('foods',${x.index})">Remove</button></div></div>`).join("") : `<p class="muted">No meals logged for this day. Search, use favorites, type, or speak to add food.</p>`;
  renderFoodMonth();
}

function renderDailyMealSummary(items = []) {
  const el = $("dailyMealSummary");
  if (!el) return;
  const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];
  el.innerHTML = meals.map((meal) => {
    const mealItems = items.filter((x) => String(x.meal || "").toLowerCase() === meal.toLowerCase());
    const total = mealItems.reduce((a, x) => ({ cal: a.cal + (+x.cal || 0), sugar: a.sugar + (+x.sugar || 0), count: a.count + 1 }), { cal:0, sugar:0, count:0 });
    return `<button class="meal-day-chip" onclick="focusMealForSelectedDate('${meal}')"><b>${meal}</b><span>${total.count} item${total.count === 1 ? "" : "s"}</span><small>${round(total.cal)} kcal • sugar ${round(total.sugar,1)}g</small></button>`;
  }).join("");
}

function focusMealForSelectedDate(meal) {
  if ($("mealType")) $("mealType").value = meal;
  if ($("manualMealType")) $("manualMealType").value = meal;
  if ($("voiceFoodText")) $("voiceFoodText").placeholder = `Example: Add 150g rice and 1 bowl dal for ${meal.toLowerCase()}`;
  $("foodQuery")?.focus();
}

function getMonthDays(dateStr = selectedFoodDate()) {
  const base = new Date(`${dateStr}T00:00:00`);
  const year = base.getFullYear();
  const month = base.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: totalDays }, (_, i) => dateId(new Date(year, month, i + 1)));
}

function renderFoodMonth() {
  const calEl = $("foodMonthCalendar");
  const statsEl = $("foodMonthStats");
  if (!calEl || !statsEl) return;
  const selected = selectedFoodDate();
  const days = getMonthDays(selected);
  const monthName = new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if ($("foodMonthTitle")) $("foodMonthTitle").textContent = `${monthName} Food Tracking`;
  const totalsByDay = days.map((d) => ({ date: d, ...calcFoodTotals(d), count: getLogs("foods").filter((x) => x.date === d).length }));
  const monthTotals = totalsByDay.reduce((a, x) => {
    a.loggedDays += x.count ? 1 : 0; a.cal += x.cal; a.sugar += x.sugar; a.protein += x.p; return a;
  }, { loggedDays:0, cal:0, sugar:0, protein:0 });
  const avgCal = monthTotals.loggedDays ? monthTotals.cal / monthTotals.loggedDays : 0;
  statsEl.innerHTML = `
    <div><span>Logged days</span><b>${monthTotals.loggedDays}</b><small>this month</small></div>
    <div><span>Avg calories</span><b>${round(avgCal)}</b><small>per logged day</small></div>
    <div><span>Total sugar</span><b>${round(monthTotals.sugar,1)}g</b><small>monthly tracked</small></div>
    <div><span>Total protein</span><b>${round(monthTotals.protein,1)}g</b><small>monthly tracked</small></div>`;
  calEl.innerHTML = totalsByDay.map((x) => {
    const active = x.date === selected ? "active" : "";
    const logged = x.count ? "logged" : "";
    const dayNum = Number(x.date.slice(-2));
    return `<button class="month-day ${active} ${logged}" onclick="changeFoodDate('${x.date}')">
      <span>${dayNum}</span>
      <b>${x.count ? `${round(x.cal)} kcal` : "—"}</b>
      <small>${x.count ? `${round(x.sugar,1)}g sugar` : "No log"}</small>
    </button>`;
  }).join("");
}

function calcFoodTotals(date = dateId()) {
  return getLogs("foods").filter((x) => x.date === date).reduce((a, x) => {
    ["cal","p","c","f","fiber","sugar","sodium"].forEach((k) => a[k] += +x[k] || 0);
    return a;
  }, { cal:0,p:0,c:0,f:0,fiber:0,sugar:0,sodium:0 });
}

function quickWater() { const v = todayItems("vitals")[0] || {}; upsertToday("vitals", { ...v, water: (+v.water || 0) + 1 }); renderAll(); }
function quickSteps() { const v = todayItems("vitals")[0] || {}; upsertToday("vitals", { ...v, steps: (+v.steps || 0) + 1000 }); renderAll(); }

function saveVitals() {
  const v = { date: dateId(), systolic:+$("vSys").value||0, diastolic:+$("vDia").value||0, pulse:+$("vPulse").value||0, glucose:+$("vGlucose").value||0, weight:+$("vWeight").value||0, sleep:+$("vSleep").value||0, steps:+$("vSteps").value||0, pain:+$("vPain").value||0, mood:$("vMood").value, meds:$("vMeds").value, bowel:$("vBowel").value, water:+$("vWater").value||0, notes:$("vNotes").value };
  upsertToday("vitals", v); toast("Health check saved."); renderAll();
}

function renderVitals() {
  const v = getLogs("vitals").slice(-14).reverse();
  $("vitalList").innerHTML = v.length ? v.map((x) => `<div class="log ${classForVitals(x)}"><h3>${x.date}</h3><p class="muted">BP ${x.systolic||"-"}/${x.diastolic||"-"} • Sugar ${x.glucose||"-"} • Pulse ${x.pulse||"-"} • Sleep ${x.sleep||"-"}h • Steps ${x.steps||0} • Pain ${x.pain ?? "-"}/10 • Meds ${x.meds||"-"}</p><p>${escapeHtml(x.notes || "")}</p></div>`).join("") : `<p class="muted">No health checks yet.</p>`;
}

function classForVitals(v) {
  if (v.systolic >= 180 || v.diastolic >= 120 || v.glucose >= 300 || v.pain >= 8) return "alert";
  if (v.systolic >= 140 || v.diastolic >= 90 || v.glucose >= 126 || v.pain >= 5 || v.meds === "No") return "warn";
  return "ok";
}

function buildLabInputs() {
  const markers = healthRules().markers || {};
  $("labInputs").innerHTML = Object.entries(markers).map(([k,m]) => `<label>${m.label} (${m.unit})<input id="lab_${k}" type="number" step="0.01" /></label>`).join("") + `<label class="wide">Lab note<textarea id="labNote" placeholder="Doctor/lab notes"></textarea></label>`;
}

async function saveReport() {
  const file = $("reportFile").files[0] || $("cameraFile").files[0];
  const rec = { date: $("reportDate").value || dateId(), type: $("reportType").value, notes: $("reportNotes").value, fileName: file?.name || "No file", fileUrl: "" };
  if (file && supabaseClient && currentUser?.id !== "guest") {
    const path = `${currentUser.id}/${Date.now()}-${file.name}`;
    const { error } = await supabaseClient.storage.from("health-reports").upload(path, file, { upsert:false });
    if (error) toast("File upload failed: " + error.message); else rec.fileUrl = path;
  }
  const logs = getLogs("reports"); logs.push(rec); setLogs("reports", logs); toast("Report saved."); renderAll();
}

function saveLabs() {
  const values = { date: $("reportDate").value || dateId(), note: $("labNote").value };
  Object.keys(healthRules().markers || {}).forEach((k) => { const val = +$(`lab_${k}`).value; if (!Number.isNaN(val) && $(`lab_${k}`).value !== "") values[k] = val; });
  const logs = getLogs("labs"); logs.push(values); setLogs("labs", logs); toast("Lab values saved."); renderAll();
}

function labStatus(k, v) {
  const m = healthRules().markers[k];
  if (!m) return "Saved";
  if (m.review && ((m.low && v < m.review) || (m.high && v >= m.review))) return "Review with doctor";
  if (m.low && v < m.low) return "Below common range";
  if (m.high && v > m.high) return "Above common range";
  return "Within common target/range";
}

function renderReports() {
  const reports = getLogs("reports").slice().reverse();
  const labs = getLogs("labs").slice().reverse();
  $("reportList").innerHTML = reports.length ? reports.map((r) => `<div class="log"><h3>${r.type} — ${r.date}</h3><p class="muted">${escapeHtml(r.fileName || "")}</p><p>${escapeHtml(r.notes || "")}</p></div>`).join("") : `<p class="muted">No reports uploaded yet.</p>`;
  $("labList").innerHTML = labs.length ? labs.map((l) => `<div class="log"><h3>Lab values — ${l.date}</h3>${Object.entries(l).filter(([k]) => healthRules().markers[k]).map(([k,v]) => `<p class="muted">${healthRules().markers[k].label}: <b>${v} ${healthRules().markers[k].unit}</b> — ${labStatus(k,v)}</p>`).join("")}<p>${escapeHtml(l.note || "")}</p></div>`).join("") : `<p class="muted">No lab values saved.</p>`;
}

function buildExerciseSelect() {
  $("exSelect").innerHTML = (window.EXERCISES || []).map((e,i) => `<option value="${i}">${e.name} (${e.minutes} min)</option>`).join("");
}

function renderExercisePlan() {
  const cond = profile.conditions || [];
  let list = (window.EXERCISES || []).filter((e) => e.elderSafe);
  if (cond.includes("arthritis")) list = list.filter((e) => ["Chair exercise","Mobility","Balance","Relaxation","Cardio"].includes(e.type));
  $("exercisePlan").innerHTML = list.map((e) => `<div class="exercise"><h3>${e.name}</h3><div class="meta"><span>${e.type}</span><span>${e.level}</span><span>${e.minutes} min</span></div><p class="muted">${e.notes}</p><a href="${e.video}" target="_blank" rel="noopener"><button class="secondary">Open video options</button></a></div>`).join("");
  const logs = getLogs("exercise").slice(-10).reverse();
  $("exerciseLog").innerHTML = logs.length ? logs.map((x) => `<div class="log"><h3>${escapeHtml(x.name)}</h3><p class="muted">${x.date} • ${x.minutes} min • ${x.effort} • approx ${round(x.calories)} kcal</p></div>`).join("") : `<p class="muted">No exercise logged yet.</p>`;
}

function saveExercise() {
  const ex = (window.EXERCISES || [])[$("exSelect").value]; if (!ex) return;
  const mins = +$("exMinutes").value || ex.minutes;
  const calories = (ex.met * 3.5 * (+profile.weight || 70) / 200) * mins;
  const logs = getLogs("exercise"); logs.push({ date: dateId(), name: ex.name, minutes: mins, effort: $("exEffort").value, calories }); setLogs("exercise", logs);
  toast("Exercise saved."); renderAll();
}

function renderDashboard() {
  const t = targets(), totals = calcFoodTotals(), vital = todayItems("vitals")[0] || {};
  const pct = t.cal ? Math.min(100, totals.cal / t.cal * 100) : 0;
  $("dashName").textContent = profile.name || "Profile";
  $("calConsumed").textContent = round(totals.cal); $("proteinConsumed").textContent = `${round(totals.p)}g`; $("waterCount").textContent = vital.water || 0; $("stepsCount").textContent = vital.steps || 0;
  $("targetCalories").textContent = t.cal; $("targetProtein").textContent = `${t.protein}g`; if ($("sugarConsumed")) $("sugarConsumed").textContent = `${round(totals.sugar,1)}g`; $("targetFiber").textContent = `${t.fiber}g`; $("targetSodium").textContent = `${t.sodium}mg`;
  $("calorieProgress").style.width = `${pct}%`; $("calorieProgressText").textContent = `${round(pct)}%`;
  const score = calcScore(totals, t, vital);
  $("nutritionScore").textContent = score;
  document.querySelector(".score-ring").style.background = `conic-gradient(var(--primary) ${score * 3.6}deg, rgba(255,255,255,.08) 0deg)`;
  $("scoreText").textContent = score >= 85 ? "Excellent consistency today." : score >= 65 ? "Good progress. Fill remaining gaps." : score > 0 ? "Needs more balanced tracking today." : "Start tracking meals and vitals.";
  renderRiskPanel(vital); renderRecs(totals, t, vital); renderCharts(totals, t); renderCarePlan(totals, t, vital);
}

function calcScore(a, t, v) {
  if (!a.cal && !v.steps && !v.water) return 0;
  let s = 0;
  if (a.cal > t.cal*.75 && a.cal < t.cal*1.15) s += 25; else if (a.cal) s += 12;
  if (a.p >= t.protein*.75) s += 20; else if (a.p) s += 8;
  if (a.fiber >= t.fiber*.7) s += 15; else if (a.fiber) s += 6;
  if (!a.sodium || a.sodium < t.sodium) s += 10;
  if (a.sugar && a.sugar <= ((profile.conditions || []).includes("diabetes") ? 25 : 36)) s += 5;
  if ((v.water || 0) >= Math.min(6, t.water)) s += 10;
  if ((v.steps || 0) >= t.steps*.7) s += 10;
  if (v.meds === "Yes") s += 10;
  return Math.min(100, Math.round(s));
}

function renderRiskPanel(v) {
  const items = [];
  if (v.systolic >= 180 || v.diastolic >= 120) items.push("Very high BP range logged. If symptoms or repeat high reading, seek urgent medical guidance.");
  if (v.glucose >= 300) items.push("Very high glucose logged. Follow your doctor’s sick-day or diabetes plan.");
  if (v.meds === "No") items.push("Medication marked as not taken. Confirm with caregiver/doctor instructions.");
  if (v.pain >= 8) items.push("High pain level logged. Avoid exercise that worsens pain and consider medical advice.");
  $("riskPanel").innerHTML = items.length ? items.map((x) => `<div class="log alert"><b>Review:</b> ${x}</div>`).join("") : `<div class="log ok"><b>Care note:</b> Keep meals, hydration, movement, and vitals consistent.</div>`;
}

function renderRecs(a, t, v) {
  const rec = [];
  if (a.p < t.protein*.7) rec.push(["Protein gap", "Add dal, curd, paneer, tofu, egg, fish/chicken, Greek yogurt, or beans based on diet preference."]);
  if (a.fiber < t.fiber*.6) rec.push(["Fiber gap", "Add vegetables, guava/apple, oats, dal, beans, brown rice, jowar or bajra in controlled portions."]);
  const sugarGuide = (profile.conditions || []).includes("diabetes") ? 25 : 36;
  if (a.sugar > sugarGuide) rec.push(["Sugar watch", `Today’s logged sugar is ${round(a.sugar,1)}g. Prefer whole fruits in controlled portions, avoid juice/soda/sweets, and pair carbs with protein/fiber. Confirm diabetes-specific targets with your clinician.`]);
  if (a.sodium > t.sodium) rec.push(["Sodium alert", "Reduce packaged snacks, pickles, papad, salty namkeen, and restaurant food today."]);
  if ((v.water || 0) < Math.min(6, t.water)) rec.push(["Hydration", "Add water reminders unless the doctor has advised fluid restriction."]);
  if ((v.steps || 0) < t.steps*.5) rec.push(["Movement", "Consider a gentle walk or chair movement if safe and approved."]);
  (profile.conditions || []).forEach((c) => (healthRules().dietByCondition[c] || []).slice(0,2).forEach((x) => rec.push([c.toUpperCase(), x])));
  rec.push(["Safety disclaimer", "These are general wellness ideas. Confirm condition-specific diet, supplements, and exercise with a doctor or registered dietitian."]);
  $("recommendations").innerHTML = rec.map(([h,p]) => `<div class="rec"><h3>${h}</h3><p>${p}</p></div>`).join("");
}

function renderCarePlan(a, t, v) {
  const items = [
    ["Morning", "Check BP/sugar if prescribed, confirm medicines, add breakfast with protein."],
    ["Afternoon", "Hydration reminder, balanced lunch, short safe walk if allowed."],
    ["Evening", "Log dinner, symptoms, pain, bowel movement, sleep plan."],
    ["Escalation", "Contact clinician for concerning symptoms, abnormal readings, confusion, chest pain, fainting, or severe breathlessness."]
  ];
  if (profile.emergency) items.push(["Emergency Contact", profile.emergency]);
  $("carePlan").innerHTML = items.map(([h,p]) => `<div class="care-item"><h3>${h}</h3><p>${escapeHtml(p)}</p></div>`).join("");
}

function renderCharts() {
  const t = targets(), a = calcFoodTotals();
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return dateId(d); });
  const cals = days.map((d) => calcFoodTotals(d).cal);
  const vit = getLogs("vitals");
  const sys = days.map((d) => vit.find((x) => x.date === d)?.systolic || null);
  const glu = days.map((d) => vit.find((x) => x.date === d)?.glucose || null);
  makeChart("macroChart", "doughnut", { labels:["Protein kcal","Carb kcal","Fat kcal"], datasets:[{ data:[a.p*4, a.c*4, a.f*9] }] });
  makeChart("calorieChart", "line", { labels: days.map((d) => d.slice(5)), datasets:[{ label:"Calories", data:cals, tension:.35 }, { label:"Target", data:days.map(()=>t.cal), tension:.35 }] });
  makeChart("vitalChart", "line", { labels: days.map((d) => d.slice(5)), datasets:[{ label:"Systolic BP", data:sys, tension:.35 }, { label:"Fasting glucose", data:glu, tension:.35 }] });
}

function makeChart(id, type, data) {
  if (!$(id) || !window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($(id), { type, data, options: { responsive:true, maintainAspectRatio:true, plugins:{ legend:{ labels:{ color:"#cfe8e2" } } }, scales: type === "doughnut" ? {} : { x:{ ticks:{ color:"#9eb5b0" }, grid:{ color:"rgba(255,255,255,.08)" } }, y:{ ticks:{ color:"#9eb5b0" }, grid:{ color:"rgba(255,255,255,.08)" } } } } });
}


function buildAIContext() {
  const today = dateId();
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return dateId(d); });
  const foodTotals7 = days.map((d) => ({ date: d, ...calcFoodTotals(d) }));
  const vitals = getLogs("vitals").slice(-14);
  const labs = getLogs("labs").slice(-8);
  const exercise = getLogs("exercise").slice(-14);
  const reports = getLogs("reports").slice(-6).map((r) => ({ date: r.date, type: r.type, notes: r.notes, fileName: r.fileName }));
  return {
    appSafetyRule: "General wellness tracking only. Not diagnosis, medication, or emergency advice.",
    focus: $("aiFocus")?.value || "complete",
    preferredStyle: $("aiStyle")?.value || "simple",
    userConcern: $("aiConcern")?.value || "",
    profile,
    calculatedTargets: targets(),
    today,
    todayFoodTotals: calcFoodTotals(today),
    todayFoodItems: todayItems("foods"),
    recentVitals: vitals,
    recentLabs: labs,
    recentExercise: exercise,
    recentReports: reports,
    sevenDayFoodTotals: foodTotals7,
    knownRules: {
      redFlags: healthRules().redFlags || [],
      conditionGuidance: profile?.conditions?.reduce((acc, c) => {
        acc[c] = healthRules().dietByCondition?.[c] || [];
        return acc;
      }, {}) || {}
    }
  };
}

async function generateAISuggestions() {
  const btn = $("aiGenerateBtn");
  const status = $("aiStatus");
  const out = $("aiOutput");
  if (!out) return;
  if (btn) btn.disabled = true;
  if (status) status.textContent = "Analyzing profile, meals, vitals, labs, and exercise logs...";
  out.innerHTML = `<div class="ai-loading">Creating safe wellness suggestions...</div>`;

  try {
    const r = await fetch("/api/ai-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: buildAIContext() })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "AI request failed");
    localStorage.setItem(localKey("aiPlan"), JSON.stringify({ date: new Date().toISOString(), result: data.result }));
    renderAIPlan(data.result, new Date().toISOString());
    if (status) status.textContent = "AI plan generated. Review it as general guidance only.";
  } catch (error) {
    console.error(error);
    out.innerHTML = `<div class="log alert"><h3>AI suggestion failed</h3><p>${escapeHtml(error.message)}</p><p class="muted">Check Vercel environment variable DEEPSEEK_API_KEY and redeploy.</p></div>`;
    if (status) status.textContent = "Could not generate AI plan.";
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderSavedAIPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem(localKey("aiPlan")) || "null");
    if (saved?.result) renderAIPlan(saved.result, saved.date);
  } catch {}
}

function renderAIPlan(plan, generatedAt) {
  const out = $("aiOutput");
  if (!out) return;
  const section = (title, arr) => Array.isArray(arr) && arr.length
    ? `<div class="ai-section"><h3>${title}</h3><ul>${arr.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`
    : "";
  out.innerHTML = `
    <div class="ai-summary">
      <p class="eyebrow">Generated ${generatedAt ? new Date(generatedAt).toLocaleString() : "now"}</p>
      <h3>${escapeHtml(plan.summary || "Personal wellness review")}</h3>
      <p>${escapeHtml(plan.disclaimer || "This is general wellness guidance only and not medical diagnosis.")}</p>
    </div>
    ${section("Safety / Doctor Review Flags", plan.riskFlags)}
    ${section("Food Suggestions", plan.foodSuggestions)}
    ${section("Exercise Suggestions", plan.exerciseSuggestions)}
    ${section("Weight Guidance", plan.weightSuggestions)}
    ${section("Caregiver Notes", plan.caregiverNotes)}
    ${section("Tomorrow Plan", plan.tomorrowPlan)}
    ${section("Questions for Doctor / Dietitian", plan.doctorDietitianQuestions)}
  `;
}

function clearAIPlan() {
  localStorage.removeItem(localKey("aiPlan"));
  if ($("aiOutput")) $("aiOutput").innerHTML = "";
  if ($("aiStatus")) $("aiStatus").textContent = "AI plan cleared.";
}

async function syncNow() { await saveProfile(); toast("Profile synced. Logs are saved locally in this version; Supabase log-table sync is scaffolded in schema for the next phase."); }

function renderAll() {
  if (!profile) return;
  fillProfile(); renderDashboard(); renderMeals(); renderFavorites(); renderVitals(); renderReports(); renderExercisePlan(); renderSavedAIPlan();
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error("Fatal startup error:", error);
    $("authScreen")?.classList.add("hidden");
    const app = $("app");
    if (app) {
      app.classList.remove("hidden");
      app.innerHTML = `<div class="app-error"><h1>App loading issue</h1><p>${escapeHtml(error.message || error)}</p><p>Check config.js, script order, and browser console.</p></div>`;
    }
  });
});

/* =========================================================
   2026 Premium UX Upgrade: health score, simplified food search,
   favorites/recent foods, report scanner helper, bottom nav
   ========================================================= */
(function premiumUpgrade(){
  const original = {
    renderDashboard: window.renderDashboard || renderDashboard,
    searchFood: window.searchFood || searchFood,
    renderFoodResults: window.renderFoodResults || renderFoodResults,
    addFood: window.addFood || addFood,
    renderFavorites: window.renderFavorites || renderFavorites,
    renderReports: window.renderReports || renderReports,
    renderAll: window.renderAll || renderAll,
    showTab: window.showTab || showTab,
  };

  const foodEmoji = (name = "") => {
    const q = name.toLowerCase();
    if (/milk|curd|yogurt|lassi|tea|coffee/.test(q)) return "🥛";
    if (/rice|poha|upma|idli|dosa|oats/.test(q)) return "🍚";
    if (/roti|chapati|naan|paratha|bread/.test(q)) return "🫓";
    if (/dal|lentil|bean|chana|rajma/.test(q)) return "🥣";
    if (/apple|banana|orange|fruit|guava|grape/.test(q)) return "🍎";
    if (/salad|vegetable|sabzi|spinach/.test(q)) return "🥗";
    if (/egg|chicken|fish|paneer|tofu/.test(q)) return "🍳";
    return "🍽️";
  };

  function getRecentFoods() { return getLogs("recentFoods"); }
  function setRecentFoods(items) { setLogs("recentFoods", items.slice(0, 20)); }
  function rememberRecentFood(food) {
    const normalized = normalizeFood(food);
    const key = `${normalized.name}|${normalized.source || ""}`.toLowerCase();
    const next = [normalized, ...getRecentFoods().filter((x) => `${x.name}|${x.source || ""}`.toLowerCase() !== key)];
    setRecentFoods(next);
  }

  function smartParseFoodQuery(raw) {
    const text = String(raw || "").trim();
    const match = text.match(/(\d+(?:\.\d+)?)\s*(g|gm|gram|grams|ml|milliliter|milliliters|cup|cups|bowl|bowls|glass|glasses|piece|pieces|serving|servings)?/i);
    const amount = match ? Number(match[1]) : null;
    let unit = match?.[2]?.toLowerCase() || null;
    if (unit === "gm" || unit === "gram" || unit === "grams") unit = "g";
    if (unit === "milliliter" || unit === "milliliters") unit = "ml";
    if (["cups","bowls","glasses","pieces","servings"].includes(unit)) unit = unit.slice(0, -1);
    const mealMatch = text.match(/\b(breakfast|lunch|dinner|snack|snacks)\b/i);
    const meal = mealMatch ? (mealMatch[1].toLowerCase().startsWith("snack") ? "Snacks" : mealMatch[1][0].toUpperCase() + mealMatch[1].slice(1).toLowerCase()) : null;
    let cleaned = text
      .replace(/\b(add|ate|had|i had|i ate|for|in|my|please)\b/gi, " ")
      .replace(/\b(breakfast|lunch|dinner|snacks|snack)\b/gi, " ")
      .replace(/\d+(?:\.\d+)?\s*(g|gm|gram|grams|ml|milliliter|milliliters|cup|cups|bowl|bowls|glass|glasses|piece|pieces|serving|servings)?/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { query: cleaned || text, amount, unit, meal };
  }

  async function searchAllFoodSources(q) {
    let results = [];
    const lower = q.toLowerCase();
    results.push(...(window.LOCAL_FOODS || [])
      .filter((f) => `${f.name} ${f.group} ${(f.tags||[]).join(" ")}`.toLowerCase().includes(lower))
      .map((f) => ({ ...f, source: "Local dataset" })));
    try { results.push(...await searchUSDA(q)); } catch {}
    try { results.push(...await searchOpenFoodFacts(q)); } catch {}
    const seen = new Set();
    return results.filter((f) => {
      const key = String(f.name || "").toLowerCase().slice(0, 80);
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 18);
  }

  searchFood = window.searchFood = async function upgradedSearchFood() {
    const input = $("foodQuery");
    const raw = input?.value?.trim() || "";
    if (!raw) return toast("Enter a food name like '2 roti' or '250 ml milk'.");
    const parsed = smartParseFoodQuery(raw);
    if (parsed.meal && $("mealType")) $("mealType").value = parsed.meal;
    const results = await searchAllFoodSources(parsed.query);
    renderFoodResults(results, parsed);
  };

  renderFoodResults = window.renderFoodResults = function upgradedRenderFoodResults(results, parsed = {}) {
    lastFoodResults = results.map(normalizeFood);
    const el = $("foodResults");
    if (!el) return;
    if (!lastFoodResults.length) {
      el.innerHTML = `<div class="empty-state"><h3>No exact match found</h3><p>Try a simpler name like roti, rice, dal, milk, banana — or add it as a custom food.</p></div>`;
      return;
    }
    el.innerHTML = lastFoodResults.map((f, i) => {
      const defQty = parsed.amount || (f.baseUnit === "serving" ? 1 : f.baseAmount || 100);
      const defUnit = parsed.unit || f.baseUnit || "g";
      const sugarClass = (+f.sugar || 0) > 10 ? "warn" : "ok";
      return `<div class="food-result-card lively-food-card">
        <div class="food-avatar" aria-hidden="true">${foodEmoji(f.name)}</div>
        <div class="food-result-main">
          <div class="row-between compact-row"><div><h3>${escapeHtml(f.name)}</h3><p class="muted">${escapeHtml(f.group || "Food")} • ${escapeHtml(f.serving || `per ${f.baseAmount}${f.baseUnit}`)}</p></div><button class="icon-btn favorite-star" title="Save favorite" onclick="toggleFavoriteFood(${i})">☆</button></div>
          <div class="nutrition-chips">
            <span>${round(f.cal)} kcal</span><span>P ${round(f.p,1)}g</span><span class="${sugarClass}">Sugar ${round(f.sugar,1)}g</span><span>Fiber ${round(f.fiber,1)}g</span>
          </div>
          <div class="add-row premium-add-row">
            <input id="qty_${i}" type="number" min="0.01" step="1" value="${defQty}" aria-label="quantity" />
            <select id="unit_${i}"><option value="g" ${defUnit==='g'?'selected':''}>g</option><option value="ml" ${defUnit==='ml'?'selected':''}>ml</option><option value="serving" ${defUnit==='serving'?'selected':''}>serving</option><option value="cup" ${defUnit==='cup'?'selected':''}>cup</option><option value="bowl" ${defUnit==='bowl'?'selected':''}>bowl</option><option value="piece" ${defUnit==='piece'?'selected':''}>piece</option></select>
            <button class="primary" onclick="addFoodByIndex(${i})">Add to ${escapeHtml($("mealType")?.value || "Meal")}</button>
          </div>
        </div>
      </div>`;
    }).join("");
  };

  addFood = window.addFood = function upgradedAddFood(food, amount = 1, unit = "serving", meal = null, options = {}) {
    const portion = calculateFoodPortion(food, amount, unit);
    const logs = getLogs("foods");
    logs.push({ ...portion, date: selectedFoodDate(), meal: meal || $("mealType")?.value || "Snacks", loggedAt: new Date().toISOString(), sourceNote: options.sourceNote || "manual" });
    setLogs("foods", logs);
    rememberRecentFood(food);
    if (!options.silent) { toast("Food added to selected day."); renderAll(); }
  };

  function renderRecentFoods() {
    const el = $("recentFoods");
    if (!el) return;
    const recent = getRecentFoods().map(normalizeFood);
    el.innerHTML = recent.length ? recent.slice(0, 12).map((f, i) => `
      <button class="recent-food-chip" onclick="addRecentFood(${i})"><span>${foodEmoji(f.name)}</span><b>${escapeHtml(f.name)}</b><small>${round(f.cal)} kcal • sugar ${round(f.sugar,1)}g</small></button>
    `).join("") : `<div class="empty-state">Recently added foods will appear here for one-tap mobile logging.</div>`;
  }

  window.addRecentFood = function addRecentFood(i) {
    const food = getRecentFoods()[i];
    if (!food) return;
    addFood(food, food.baseUnit === "serving" ? 1 : (food.baseAmount || 100), food.baseUnit || "g", $("mealType")?.value || "Snacks");
  };

  renderFavorites = window.renderFavorites = function upgradedRenderFavorites() {
    original.renderFavorites();
    renderRecentFoods();
    renderQuickSmartSuggestions();
  };

  function healthScoreDetails() {
    const t = targets();
    const a = calcFoodTotals();
    const v = todayItems("vitals")[0] || {};
    const sugarGuide = (profile?.conditions || []).includes("diabetes") ? 25 : 36;
    return [
      { label: "Calories in target range", ok: a.cal > t.cal * .75 && a.cal < t.cal * 1.15, text: `${round(a.cal)} / ${t.cal} kcal` },
      { label: "Protein progress", ok: a.p >= t.protein * .75, text: `${round(a.p,1)} / ${t.protein}g` },
      { label: "Fiber support", ok: a.fiber >= t.fiber * .7, text: `${round(a.fiber,1)} / ${t.fiber}g` },
      { label: "Sugar awareness", ok: !a.sugar || a.sugar <= sugarGuide, text: `${round(a.sugar,1)}g / ${sugarGuide}g guide` },
      { label: "Hydration", ok: (v.water || 0) >= Math.min(6, t.water), text: `${v.water || 0} glasses` },
      { label: "Movement", ok: (v.steps || 0) >= t.steps * .7, text: `${v.steps || 0} steps` },
    ];
  }

  function renderHealthScoreBreakdown() {
    const el = $("healthScoreBreakdown");
    if (!el) return;
    el.innerHTML = healthScoreDetails().map((x) => `
      <div class="score-detail ${x.ok ? "ok" : "needs"}"><span>${x.ok ? "✓" : "•"}</span><div><b>${x.label}</b><small>${x.text}</small></div></div>
    `).join("");
  }

  function renderQuickSmartSuggestions() {
    const el = $("smartFoodSuggestions");
    if (!el) return;
    const suggestions = ["2 roti breakfast", "250 ml milk", "1 banana snacks", "150g rice lunch", "1 bowl dal", "100g paneer dinner"];
    el.innerHTML = suggestions.map((s) => `<button onclick="setSmartFoodQuery('${s.replace(/'/g,"&#39;")}')">${s}</button>`).join("");
  }

  window.setSmartFoodQuery = function setSmartFoodQuery(q) {
    if ($("foodQuery")) $("foodQuery").value = q;
    searchFood();
  };

  function renderSugarTrendChart() {
    if (!$("sugarTrendChart") || !window.Chart) return;
    const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return dateId(d); });
    const sugars = days.map((d) => calcFoodTotals(d).sugar);
    makeChart("sugarTrendChart", "bar", { labels: days.map((d) => d.slice(5)), datasets: [{ label: "Sugar grams", data: sugars }] });
  }

  renderDashboard = window.renderDashboard = function upgradedRenderDashboard() {
    original.renderDashboard();
    renderHealthScoreBreakdown();
    renderSugarTrendChart();
  };

  window.previewReportFile = function previewReportFile(inputId = "reportFile") {
    const file = $(inputId)?.files?.[0];
    const box = $("reportPreview");
    if (!box) return;
    if (!file) { box.innerHTML = `<div class="empty-state">Choose a PDF or image to preview report details.</div>`; return; }
    const size = `${Math.round(file.size / 1024)} KB`;
    const isImage = file.type.startsWith("image/");
    const url = URL.createObjectURL(file);
    box.innerHTML = `<div class="report-preview-card">
      ${isImage ? `<img src="${url}" alt="Selected health report preview" />` : `<div class="pdf-preview">📄</div>`}
      <div><h3>${escapeHtml(file.name)}</h3><p class="muted">${escapeHtml(file.type || "file")} • ${size}</p><p>Next: save the report, then enter key lab values below for trends and doctor-ready summaries.</p></div>
    </div>`;
  };

  window.buildDoctorQuestions = function buildDoctorQuestions() {
    const labs = getLogs("labs").slice(-1)[0] || {};
    const vit = todayItems("vitals")[0] || {};
    const questions = [];
    if (vit.systolic || vit.diastolic) questions.push(`BP trend: recent reading ${vit.systolic || "—"}/${vit.diastolic || "—"}. What home BP target should we follow?`);
    if (vit.glucose) questions.push(`Glucose: recent fasting glucose ${vit.glucose} mg/dL. Do we need any food timing or carb target changes?`);
    Object.keys(labs).filter((k) => !["date","note"].includes(k) && labs[k]).slice(0, 6).forEach((k) => questions.push(`Lab ${k}: ${labs[k]}. Is this in target range for this patient?`));
    if (!questions.length) questions.push("Which lab values should we track monthly/quarterly for this person’s age, medicines, and conditions?");
    const el = $("doctorQuestions");
    if (el) el.innerHTML = questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("");
    toast("Doctor visit questions generated.");
  };

  renderReports = window.renderReports = function upgradedRenderReports() {
    original.renderReports();
    if ($("doctorQuestions") && !$("doctorQuestions").innerHTML.trim()) buildDoctorQuestions();
  };

  showTab = window.showTab = function upgradedShowTab(tab) {
    original.showTab(tab);
    document.querySelectorAll(".bottom-nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  };

  renderAll = window.renderAll = function upgradedRenderAll() {
    original.renderAll();
    renderRecentFoods();
    renderQuickSmartSuggestions();
    renderHealthScoreBreakdown();
  };
})();

/* Quiet doctor-question rendering: avoid repeated toast during normal renderAll. */
(function quietReportQuestions(){
  const previousBuildDoctorQuestions = window.buildDoctorQuestions;
  window.buildDoctorQuestions = function buildDoctorQuestionsQuiet(showToast = true) {
    const labs = getLogs("labs").slice(-1)[0] || {};
    const vit = todayItems("vitals")[0] || {};
    const questions = [];
    if (vit.systolic || vit.diastolic) questions.push(`BP trend: recent reading ${vit.systolic || "—"}/${vit.diastolic || "—"}. What home BP target should we follow?`);
    if (vit.glucose) questions.push(`Glucose: recent fasting glucose ${vit.glucose} mg/dL. Do we need food timing or carb target changes?`);
    Object.keys(labs).filter((k) => !["date","note"].includes(k) && labs[k]).slice(0, 6).forEach((k) => questions.push(`Lab ${k}: ${labs[k]}. Is this in target range for this patient?`));
    if (!questions.length) questions.push("Which lab values should we track monthly/quarterly for this person’s age, medicines, and conditions?");
    const el = $("doctorQuestions");
    if (el) el.innerHTML = questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("");
    if (showToast) toast("Doctor visit questions generated.");
  };
  const reportRenderBase = renderReports;
  renderReports = window.renderReports = function renderReportsQuietly() {
    reportRenderBase();
    if ($("doctorQuestions") && !$("doctorQuestions").innerHTML.trim()) window.buildDoctorQuestions(false);
  };
})();
