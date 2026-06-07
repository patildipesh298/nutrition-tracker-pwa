import { NextRequest, NextResponse } from 'next/server';
import { LOCAL_FOODS } from '@/lib/foods';

type FoodResult = {
  name: string;
  brand?: string;
  group?: string;
  serving: string;
  cal: number;
  p: number;
  c: number;
  f: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  vitaminA?: number;
  vitaminC?: number;
  source: string;
  tags?: string[];
  quality?: 'verified' | 'label' | 'estimate';
};

function num(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function normalizeText(value: string) { return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function timeoutSignal(ms = 4500) { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; }

const SYNONYMS: Record<string, string[]> = {
  bread: ['toast', 'sandwich', 'bun', 'roll', 'pav', 'naan', 'roti', 'chapati', 'paratha', 'pita', 'bagel', 'croissant', 'flatbread'],
  curd: ['dahi', 'yogurt', 'yoghurt'], yogurt: ['curd', 'dahi', 'yoghurt'],
  rice: ['biryani', 'pulao', 'khichdi', 'curd rice'],
  dal: ['lentil', 'lentils', 'moong', 'toor', 'chana', 'masoor'],
  chicken: ['grilled chicken', 'chicken curry', 'tikka', 'tandoori'],
  oats: ['oatmeal', 'porridge', 'masala oats'],
  indian: ['roti', 'dal', 'sabzi', 'poha', 'idli', 'dosa', 'upma', 'biryani'],
};
function expandWords(words: string[]) { const expanded = new Set(words); for (const word of words) for (const s of SYNONYMS[word] || []) expanded.add(s); return Array.from(expanded); }
function scoreFood(food: any, query: string) {
  const q = normalizeText(query); const words = q.split(' ').filter(Boolean); const expandedWords = expandWords(words);
  const name = normalizeText(food.name || ''); const brand = normalizeText(food.brand || ''); const group = normalizeText(food.group || ''); const tags = normalizeText((food.tags || []).join(' ')); const haystack = `${name} ${brand} ${group} ${tags}`;
  if (!q) return 1; let score = 0;
  if (name === q) score += 110; if (brand === q) score += 80; if (name.startsWith(q)) score += 75; if (name.includes(q)) score += 55; if (brand.includes(q)) score += 45; if (group.includes(q)) score += 35; if (tags.includes(q)) score += 25;
  for (const word of words) { if (name.includes(word)) score += 22; else if (brand.includes(word)) score += 18; else if (group.includes(word)) score += 14; else if (tags.includes(word)) score += 10; }
  for (const word of expandedWords) if (haystack.includes(word)) score += 5;
  return score;
}
function localResults(query: string): FoodResult[] { return (LOCAL_FOODS as readonly any[]).map((food) => ({ food, score: scoreFood(food, query) })).filter((e) => e.score > 0).sort((a, b) => b.score - a.score || String(a.food.name).localeCompare(String(b.food.name))).slice(0, 32).map(({ food }) => ({ ...food, source: food.source || 'Eatlyte common food database', quality: 'estimate' })); }
function nutrientFromUsda(food: any, ids: number[]) { const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : []; for (const id of ids) { const match = nutrients.find((n: any) => n.nutrientId === id || n?.nutrientNumber === String(id)); if (match) return num(match.value); } return 0; }
async function usdaResults(query: string, apiKey?: string): Promise<FoodResult[]> {
  if (!apiKey) return [];
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('query', query); url.searchParams.set('pageSize', '10'); url.searchParams.set('api_key', apiKey); url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS),Branded');
  const response = await fetch(url, { signal: timeoutSignal(), next: { revalidate: 60 * 60 * 24 * 7 } });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.foods || []).slice(0, 10).map((food: any) => ({ name: food.description || 'Food item', brand: food.brandOwner || food.brandName || '', group: food.foodCategory || 'USDA verified food data', serving: '100g', cal: nutrientFromUsda(food, [1008, 2047, 2048]), p: nutrientFromUsda(food, [1003]), c: nutrientFromUsda(food, [1005]), f: nutrientFromUsda(food, [1004]), fiber: nutrientFromUsda(food, [1079]), sugar: nutrientFromUsda(food, [2000, 1063]), sodium: nutrientFromUsda(food, [1093]), potassium: nutrientFromUsda(food, [1092]), calcium: nutrientFromUsda(food, [1087]), iron: nutrientFromUsda(food, [1089]), vitaminA: nutrientFromUsda(food, [1106]), vitaminC: nutrientFromUsda(food, [1162]), source: 'USDA FoodData Central', tags: ['verified', 'usda', 'nutrition'], quality: 'verified' }));
}
function normalizeOpenFoodFactsProduct(product: any): FoodResult {
  const n = product?.nutriments || {}; const sodium = n.sodium_serving ?? n.sodium_100g;
  // Open Food Facts stores minerals in grams; convert to mg/µg to match our internal units.
  const mineralMg = (serv: unknown, base: unknown) => { const v = serv ?? base; return v == null ? undefined : num(v) * 1000; };
  return { name: product?.product_name || product?.generic_name || 'Packaged food', brand: product?.brands || '', group: product?.categories_tags?.[0]?.replace('en:', '') || 'Packaged food', serving: product?.serving_size || '100g', cal: num(n['energy-kcal_serving'] ?? n['energy-kcal_100g']), p: num(n.proteins_serving ?? n.proteins_100g), c: num(n.carbohydrates_serving ?? n.carbohydrates_100g), f: num(n.fat_serving ?? n.fat_100g), fiber: num(n.fiber_serving ?? n.fiber_100g), sugar: num(n.sugars_serving ?? n.sugars_100g), sodium: num(sodium) * 1000, potassium: mineralMg(n.potassium_serving, n.potassium_100g), calcium: mineralMg(n.calcium_serving, n.calcium_100g), iron: mineralMg(n.iron_serving, n.iron_100g), vitaminC: mineralMg(n['vitamin-c_serving'], n['vitamin-c_100g']), vitaminA: (n['vitamin-a_serving'] ?? n['vitamin-a_100g']) == null ? undefined : num(n['vitamin-a_serving'] ?? n['vitamin-a_100g']) * 1_000_000, source: 'Open Food Facts packaged foods', tags: ['packaged', 'barcode', product?.nutriscore_grade ? `nutri-score-${product.nutriscore_grade}` : ''].filter(Boolean), quality: 'label' };
}
async function openFoodFactsResults(query: string): Promise<FoodResult[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query); url.searchParams.set('search_simple', '1'); url.searchParams.set('action', 'process'); url.searchParams.set('json', '1'); url.searchParams.set('page_size', '10'); url.searchParams.set('fields', 'product_name,generic_name,brands,serving_size,nutriments,nutriscore_grade,categories_tags');
  const response = await fetch(url, { headers: { 'User-Agent': 'Eatlyte/1.0 (support@eatlyte.app)' }, signal: timeoutSignal(), next: { revalidate: 60 * 60 * 24 } });
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  return (data.products || []).filter((p: any) => p?.product_name && p?.nutriments).slice(0, 10).map(normalizeOpenFoodFactsProduct);
}
let fatSecretTokenCache: { token: string; expiresAt: number } | null = null;
async function getFatSecretToken(clientId?: string, clientSecret?: string) { if (!clientId || !clientSecret) return null; if (fatSecretTokenCache && fatSecretTokenCache.expiresAt > Date.now() + 60_000) return fatSecretTokenCache.token; const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64'); const body = new URLSearchParams({ grant_type: 'client_credentials', scope: 'basic' }); const response = await fetch('https://oauth.fatsecret.com/connect/token', { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: timeoutSignal() }); if (!response.ok) return null; const data = await response.json(); if (!data.access_token) return null; fatSecretTokenCache = { token: data.access_token, expiresAt: Date.now() + (num(data.expires_in, 3600) * 1000) }; return data.access_token as string; }
async function fatSecretResults(query: string, clientId?: string, clientSecret?: string): Promise<FoodResult[]> { const token = await getFatSecretToken(clientId, clientSecret); if (!token) return []; const url = new URL('https://platform.fatsecret.com/rest/server.api'); url.searchParams.set('method', 'foods.search'); url.searchParams.set('search_expression', query); url.searchParams.set('format', 'json'); url.searchParams.set('max_results', '8'); const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: timeoutSignal(), next: { revalidate: 60 * 60 * 12 } }); if (!response.ok) return []; const data = await response.json(); const foods = data?.foods?.food ? (Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food]) : []; return foods.slice(0, 8).map((food: any) => { const desc = String(food.food_description || ''); const calories = desc.match(/Calories:\s*([\d.]+)/i); const fat = desc.match(/Fat:\s*([\d.]+)g/i); const carbs = desc.match(/Carbs:\s*([\d.]+)g/i); const protein = desc.match(/Protein:\s*([\d.]+)g/i); return { name: food.food_name || 'Food item', brand: food.brand_name || '', group: 'Restaurant and branded food database', serving: desc.split('-')[0]?.trim() || '1 serving', cal: num(calories?.[1]), p: num(protein?.[1]), c: num(carbs?.[1]), f: num(fat?.[1]), fiber: 0, sugar: 0, sodium: 0, source: 'Expanded food database', tags: ['branded', 'restaurant'], quality: 'label' }; }); }
function dedupe(results: FoodResult[]) { const seen = new Set<string>(); return results.filter((food) => { const key = normalizeText(`${food.name} ${food.brand || ''} ${food.serving}`); if (seen.has(key) || !food.name) return false; seen.add(key); return true; }); }
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')?.trim() || '';
  if (query.length < 2) return NextResponse.json({ success: true, foods: [], sources: [] });
  const local = localResults(query);
  const [usda, openFacts, fatsecret] = await Promise.allSettled([usdaResults(query, process.env.USDA_API_KEY), openFoodFactsResults(query), fatSecretResults(query, process.env.FATSECRET_CLIENT_ID, process.env.FATSECRET_CLIENT_SECRET)]);
  const foods = dedupe([...local, ...(usda.status === 'fulfilled' ? usda.value : []), ...(openFacts.status === 'fulfilled' ? openFacts.value : []), ...(fatsecret.status === 'fulfilled' ? fatsecret.value : [])]).slice(0, 36);
  return NextResponse.json({ success: true, foods, sources: { eatlyteCommon: local.length > 0, usda: usda.status === 'fulfilled' && usda.value.length > 0, openFoodFacts: openFacts.status === 'fulfilled' && openFacts.value.length > 0, fatSecret: fatsecret.status === 'fulfilled' && fatsecret.value.length > 0 } });
}
