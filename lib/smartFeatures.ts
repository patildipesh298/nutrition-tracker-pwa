import type { ExerciseLog, MealLog, Profile, VitalLog, LabLog } from './types';
import { healthScore, sumMeals, targets } from './nutrition';
import { hasDiabetesFocus, movementFromFood } from './wellnessInsights';

function dateKey(d: Date) { return d.toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return dateKey(d); }

export function dailyWellnessScore(meals: MealLog[], vitals: VitalLog[], exercises: ExerciseLog[], profile?: Partial<Profile> | null) {
  const s = sumMeals(meals);
  const t = targets(profile || undefined);
  const nutrition = healthScore(meals, vitals, profile || undefined);
  const water = Math.min(100, Math.round(((vitals[0]?.water || 0) / 8) * 100));
  const movement = Math.min(100, Math.round((exercises.reduce((sum, e) => sum + e.minutes, 0) / 30) * 100));
  const mealConsistency = Math.min(100, new Set(meals.map(m => m.meal)).size * 25);
  const hasAnyLog = meals.length > 0 || vitals.length > 0 || exercises.length > 0;
  const score = hasAnyLog ? Math.round(nutrition * 0.45 + water * 0.2 + movement * 0.2 + mealConsistency * 0.15) : 0;
  const label = !hasAnyLog ? 'Not started' : score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Building' : 'Needs attention';
  const reasons: string[] = [];
  if (!hasAnyLog) reasons.push('No logs yet, so the score stays 0 until food, water, vitals, or movement is added.');
  else {
    if (s.cal > 0) reasons.push(`Calories: ${Math.round(s.cal)} of ${Math.round(t.calories)} kcal target.`);
    if (s.p < t.protein * 0.55) reasons.push('Protein is below today’s useful range.'); else reasons.push('Protein is moving in a good direction.');
    if ((vitals[0]?.water || 0) < 6) reasons.push('Hydration is still low for the day.');
    if (movement < 50) reasons.push('Movement is below the 30-minute daily habit target.');
    if (s.sugar > t.sugar) reasons.push('Sugar is above the awareness target; balance the next meal with fiber/protein.');
    if (s.sodium > t.sodium) reasons.push('Sodium is high today; choose lower-salt options next.');
  }
  return { score, label, nutrition, water, movement, consistency: mealConsistency, reasons: reasons.slice(0, 3) };
}

export function getLoggingStreak(meals: MealLog[], exercises: ExerciseLog[], vitals: VitalLog[]) {
  const logged = new Set<string>();
  meals.forEach(x => logged.add(x.date));
  exercises.forEach(x => logged.add(x.date));
  vitals.forEach(x => logged.add(x.date));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    if (logged.has(daysAgo(i))) streak++; else break;
  }
  const badges = [
    streak >= 3 ? '3-day streak' : '',
    streak >= 7 ? '7-day wellness streak' : '',
    meals.filter(m => m.date === daysAgo(0)).length >= 3 ? 'Full meal day' : '',
    exercises.some(e => e.date === daysAgo(0) && e.minutes >= 20) ? 'Moved today' : '',
    vitals.some(v => v.date === daysAgo(0) && (v.water || 0) >= 6) ? 'Hydration hero' : '',
  ].filter(Boolean);
  return { streak, badges };
}

export function smartEmptyState(area: 'home' | 'food' | 'exercise' | 'vitals' | 'reports', profile?: Partial<Profile> | null) {
  const diabetes = hasDiabetesFocus(profile);
  const map = {
    home: { title: 'Start with one quick log', text: 'Tap + to add food by voice, photo, barcode or manual search. One small action builds the habit.' },
    food: { title: 'No meals logged yet', text: diabetes ? 'Log your next meal and we will highlight sugar, fiber and balanced plate tips.' : 'Log a meal to unlock calories, protein, fiber and smart food guidance.' },
    exercise: { title: 'No movement logged yet', text: 'A 10-minute walk, chair exercise, yoga or light strength session counts.' },
    vitals: { title: 'No vitals today', text: 'Track water, steps, BP or glucose to make your wellness picture more complete.' },
    reports: { title: 'No reports saved yet', text: 'Add HbA1c, fasting glucose, cholesterol, Vitamin D or notes to create doctor-ready summaries.' },
  } as const;
  return map[area];
}

export function exerciseIntelligence(meals: MealLog[], exercises: ExerciseLog[], profile?: Partial<Profile> | null) {
  const totalMinutes = exercises.reduce((s, e) => s + e.minutes, 0);
  const totalCalories = exercises.reduce((s, e) => s + e.calories, 0);
  const idea = movementFromFood(meals);
  let title = 'Add gentle movement';
  let text = idea.text;
  if (totalMinutes >= 30) { title = 'Movement goal reached'; text = 'Great job. Keep recovery, hydration and protein balanced.'; }
  else if (totalMinutes >= 10) { title = 'Good start'; text = 'Add another 10–15 minutes if it feels comfortable today.'; }
  return { title, text, suggestedMinutes: idea.minutes, suggestedName: idea.name, totalMinutes, totalCalories };
}

export function healthTrends(meals: MealLog[], vitals: VitalLog[], exercises: ExerciseLog[], labs: LabLog[] = []) {
  const last7 = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
  const days = last7.map(date => {
    const m = meals.filter(x => x.date === date);
    const v = vitals.find(x => x.date === date);
    const e = exercises.filter(x => x.date === date);
    return {
      date,
      calories: Math.round(sumMeals(m).cal),
      protein: Math.round(sumMeals(m).p),
      sugar: Math.round(sumMeals(m).sugar),
      water: v?.water || 0,
      steps: v?.steps || 0,
      move: e.reduce((s, x) => s + x.minutes, 0),
    };
  });
  const avg = (key: keyof typeof days[number]) => Math.round(days.reduce((s, d) => s + Number(d[key] || 0), 0) / Math.max(days.length, 1));
  const latestLab = labs[0];
  return { days, avgCalories: avg('calories'), avgProtein: avg('protein'), avgSugar: avg('sugar'), avgWater: avg('water'), avgMove: avg('move'), latestLab };
}

export function grocerySuggestions(meals: MealLog[], profile?: Partial<Profile> | null) {
  const s = sumMeals(meals);
  const t = targets(profile || undefined);
  const list = new Set<string>();
  if (s.p < t.protein * 0.7) ['Greek yogurt/curd', 'Paneer/tofu', 'Eggs or lean chicken', 'Dal/sprouts'].forEach(x => list.add(x));
  if (s.fiber < t.fiber * 0.6) ['Salad vegetables', 'Beans/chana/rajma', 'Oats or millets', 'Guava/apple/berries'].forEach(x => list.add(x));
  if (hasDiabetesFocus(profile)) ['Low-sugar snacks', 'Nuts and seeds', 'High-fiber atta/millet options'].forEach(x => list.add(x));
  if (!list.size) ['Fresh vegetables', 'Protein for 3 meals', 'Low-sugar fruit', 'Hydration add-ons'].forEach(x => list.add(x));
  return Array.from(list).slice(0, 8);
}

export function mealPlanSuggestions(profile?: Partial<Profile> | null) {
  const veg = `${profile?.diet || ''}`.toLowerCase().includes('veg');
  const diabetes = hasDiabetesFocus(profile);
  return [
    { meal: 'Breakfast', idea: veg ? 'Moong dal chilla + curd + fruit' : 'Egg bhurji + roti + fruit', note: diabetes ? 'Keep fruit portion moderate and add protein.' : 'Balanced protein + carb start.' },
    { meal: 'Lunch', idea: 'Dal/beans + sabzi + salad + 1–2 rotis or small rice', note: 'Simple Indian balanced plate.' },
    { meal: 'Snack', idea: 'Greek yogurt/curd, nuts, roasted chana or fruit', note: 'Avoid sugary drinks when possible.' },
    { meal: 'Dinner', idea: veg ? 'Paneer/tofu bhurji + vegetables + controlled carb' : 'Chicken/fish/paneer + vegetables + controlled carb', note: 'Lighter dinner supports consistency.' },
  ];
}

export function mealReview(meals: MealLog[], profile?: Partial<Profile> | null) {
  const s = sumMeals(meals); const t = targets(profile || undefined); const notes: string[] = [];
  let score = 7;
  if (!meals.length) return { score: 0, title: 'No meal to review yet', notes: ['Log a meal first to get a smart review.'] };
  if (s.p >= t.protein * 0.35) { score += 1; notes.push('Good protein direction.'); } else notes.push('Protein looks low. Add dal, paneer, eggs, yogurt, tofu, fish or chicken.');
  if (s.fiber >= t.fiber * 0.25) { score += 1; notes.push('Fiber is helping this meal/day feel more balanced.'); } else notes.push('Add salad, vegetables, beans, oats, fruit or millets for fiber.');
  if (s.sugar > t.sugar * 0.7) { score -= 2; notes.push('Sugar is getting high. Choose low-sugar options for the next meal.'); }
  if (hasDiabetesFocus(profile) && s.c > 120) { score -= 1; notes.push('For glucose awareness, pair carbs with protein/fiber and consider a short walk if allowed.'); }
  return { score: Math.max(1, Math.min(10, score)), title: score >= 8 ? 'Strong meal balance' : score >= 6 ? 'Good, with small improvements' : 'Needs a healthier balance', notes };
}
