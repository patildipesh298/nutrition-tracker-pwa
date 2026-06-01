import type { MealLog, Profile } from './types';
import { sumMeals, targets } from './nutrition';

const diabetesTerms = ['diabetes', 'prediabetes', 'sugar', 'glucose'];
const highGlycemicNames = ['white rice','poha','upma','dosa','idli','banana','dates','sweet'];
const proteinNames = ['dal','moong','chana','rajma','paneer','egg','chicken','fish','yogurt','sprouts','tofu'];

export function hasDiabetesFocus(profile?: Partial<Profile> | null) {
  const joined = `${profile?.goal || ''} ${(profile?.conditions || []).join(' ')} ${profile?.doctorNotes || ''}`.toLowerCase();
  return diabetesTerms.some(t => joined.includes(t));
}

export function foodSmartFlags(food: any, profile?: Partial<Profile> | null) {
  const flags: { label: string; tone: 'good' | 'watch' | 'high' }[] = [];
  const tags = `${food.name || ''} ${food.group || ''} ${(food.tags || []).join(' ')}`.toLowerCase();
  const sugar = Number(food.sugar || 0);
  const fiber = Number(food.fiber || 0);
  const protein = Number(food.p || 0);
  const carbs = Number(food.c || 0);
  if (protein >= 10) flags.push({ label: 'Protein rich', tone: 'good' });
  if (fiber >= 5) flags.push({ label: 'High fiber', tone: 'good' });
  if (sugar >= 12) flags.push({ label: 'High sugar', tone: 'watch' });
  if (Number(food.sodium || 0) >= 450) flags.push({ label: 'High sodium', tone: 'watch' });
  if (hasDiabetesFocus(profile) && (carbs >= 35 || highGlycemicNames.some(x => tags.includes(x)))) flags.push({ label: 'Pair with protein/fiber', tone: 'watch' });
  if (hasDiabetesFocus(profile) && sugar >= 18) flags.push({ label: 'Diabetes caution', tone: 'high' });
  return flags.slice(0, 3);
}

export function servingHint(food: any) {
  const tags = `${food.name || ''} ${food.group || ''} ${(food.tags || []).join(' ')}`.toLowerCase();
  if (tags.includes('rice')) return 'Tip: for rice, start with ½–1 cup and pair with dal/curd/salad.';
  if (tags.includes('roti') || tags.includes('chapati') || tags.includes('bhakri')) return 'Tip: 1 piece is usually easiest to log as “1 serving”.';
  if (tags.includes('fruit')) return 'Tip: log fruit as pieces/cups; pair with nuts/yogurt if managing sugar.';
  if (proteinNames.some(x => tags.includes(x))) return 'Tip: good protein option for a balanced plate.';
  return 'Tip: adjust quantity before tapping Add for better estimates.';
}

export function smartMealSuggestion(meals: MealLog[], profile?: Partial<Profile> | null) {
  const total = sumMeals(meals);
  const t = targets(profile || undefined);
  if (!meals.length) return { title: 'Log your first meal', text: 'Use voice, photo, barcode or search. Small daily logging is better than perfect logging.' };
  if (total.p < t.protein * 0.45) return { title: 'Protein gap detected', text: 'Add dal, paneer, eggs, Greek yogurt, sprouts, tofu, fish or chicken in the next meal.' };
  if (hasDiabetesFocus(profile) && total.sugar > t.sugar * 0.8) return { title: 'Sugar awareness', text: 'Choose high-fiber foods and take a gentle post-meal walk if your clinician allows.' };
  if (total.fiber < t.fiber * 0.45) return { title: 'Fiber can improve today', text: 'Add salad, sabzi, beans, guava, oats, millets or lentils.' };
  return { title: 'Balanced direction', text: 'Keep dinner lighter, continue water, and add movement to complete the day.' };
}

export function movementFromFood(meals: MealLog[]) {
  const total = sumMeals(meals);
  if (total.cal > 900) return { minutes: 20, name: 'Easy walk', text: 'A 20-minute easy walk can support today’s heavier intake.' };
  if (total.c > 120) return { minutes: 10, name: 'Post-meal walk', text: 'A 10-minute post-meal walk is a simple carb-friendly habit.' };
  return { minutes: 10, name: 'Post-meal walk', text: 'Add 10 minutes of movement to keep momentum.' };
}
