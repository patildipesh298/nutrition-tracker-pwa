import type { ExerciseLog, MealLog, Profile, VitalLog } from './types';
import { sumMeals, targets } from './nutrition';

function keyToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pct(value: number, target: number) {
  return Math.max(0, Math.min(100, Math.round((value / Math.max(target, 1)) * 100)));
}

export type EngagementQuest = {
  id: string;
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  progress: number;
  done: boolean;
  points: number;
  tone: 'coral' | 'amber' | 'blue' | 'charcoal';
};

export type Achievement = {
  id: string;
  icon: string;
  label: string;
  detail: string;
  unlocked: boolean;
};

export function todayQuests({
  meals,
  vitals,
  exercises,
  profile,
}: {
  meals: MealLog[];
  vitals: VitalLog[];
  exercises: ExerciseLog[];
  profile?: Partial<Profile> | null;
}): EngagementQuest[] {
  const t = targets(profile || undefined);
  const totals = sumMeals(meals);
  const water = vitals[0]?.water || 0;
  const movement = exercises.reduce((sum, item) => sum + (item.minutes || 0), 0);
  const mealTypes = new Set(meals.map((m) => m.meal)).size;
  const fiberGoal = Math.max(10, Math.round(t.fiber * 0.5));

  return [
    {
      id: 'first-meal',
      icon: 'Meal',
      title: meals.length ? 'Meal logged' : 'Log your first meal',
      description: meals.length
        ? `${meals.length} food item${meals.length > 1 ? 's' : ''} logged today.`
        : 'Start with any meal. Photo, barcode, search, or manual entry all count.',
      cta: meals.length ? 'Add another' : 'Log food',
      href: '/food',
      progress: pct(meals.length, 1),
      done: meals.length > 0,
      points: 20,
      tone: 'coral',
    },
    {
      id: 'protein',
      icon: 'Protein',
      title: totals.p >= t.protein * 0.7 ? 'Protein is strong' : 'Protein helper',
      description: `${Math.round(totals.p)}g of ${Math.round(t.protein)}g. Add dal, eggs, yogurt, paneer, tofu, fish, or chicken if needed.`,
      cta: 'Find protein',
      href: '/food',
      progress: pct(totals.p, t.protein),
      done: totals.p >= t.protein * 0.7,
      points: 25,
      tone: 'amber',
    },
    {
      id: 'water',
      icon: 'Water',
      title: water >= 6 ? 'Hydration hero' : 'Water check-in',
      description: `${water}/8 glasses logged. Small water check-ins keep the dashboard useful.`,
      cta: 'Add water',
      href: '/tracking',
      progress: pct(water, 8),
      done: water >= 6,
      points: 15,
      tone: 'blue',
    },
    {
      id: 'movement',
      icon: 'Move',
      title: movement >= 20 ? 'Movement done' : 'Post-meal walk',
      description: `${movement} minutes logged. Even 10 minutes after meals can build consistency.`,
      cta: 'Log move',
      href: '/exercise',
      progress: pct(movement, 20),
      done: movement >= 20,
      points: 20,
      tone: 'charcoal',
    },
    {
      id: 'fiber',
      icon: 'Fiber',
      title: totals.fiber >= fiberGoal ? 'Fiber win' : 'Fiber boost',
      description: `${Math.round(totals.fiber)}g fiber logged. Add vegetables, beans, oats, fruit, or millets.`,
      cta: 'Add fiber food',
      href: '/food',
      progress: pct(totals.fiber, fiberGoal),
      done: totals.fiber >= fiberGoal,
      points: 20,
      tone: 'amber',
    },
    {
      id: 'meal-coverage',
      icon: 'Day',
      title: mealTypes >= 3 ? 'Day is well covered' : 'Complete the day',
      description: `${mealTypes}/4 meal categories logged. Keep it simple: breakfast, lunch, dinner, or snack.`,
      cta: 'Complete day',
      href: '/food',
      progress: pct(mealTypes, 4),
      done: mealTypes >= 3,
      points: 20,
      tone: 'coral',
    },
  ];
}

export function engagementSummary(quests: EngagementQuest[]) {
  const earned = quests.filter((q) => q.done).reduce((sum, q) => sum + q.points, 0);
  const total = quests.reduce((sum, q) => sum + q.points, 0);
  const done = quests.filter((q) => q.done).length;
  const percent = pct(earned, total);
  const label = percent >= 80 ? 'Excellent rhythm' : percent >= 55 ? 'Good momentum' : percent > 0 ? 'Building habit' : 'Start today';
  return { earned, total, done, percent, label };
}

export function achievementBadges({
  allMeals,
  vitals,
  exercises,
  managedCount = 0,
  inviteCount = 0,
}: {
  allMeals: MealLog[];
  vitals: VitalLog[];
  exercises: ExerciseLog[];
  managedCount?: number;
  inviteCount?: number;
}): Achievement[] {
  const today = keyToday();
  const todayMeals = allMeals.filter((m) => m.date === today);
  const activeDays = new Set([...allMeals.map((m) => m.date), ...exercises.map((e) => e.date), ...vitals.map((v) => v.date)]).size;
  const waterDays = new Set(vitals.filter((v) => (v.water || 0) >= 6).map((v) => v.date)).size;
  const moveDays = new Set(exercises.filter((e) => (e.minutes || 0) >= 10).map((e) => e.date)).size;
  return [
    { id: 'first-log', icon: 'Start', label: 'First Log', detail: 'Log one meal, water, or movement.', unlocked: allMeals.length + vitals.length + exercises.length > 0 },
    { id: 'full-day', icon: 'Meal', label: 'Full Day', detail: 'Log 3 meal categories in one day.', unlocked: new Set(todayMeals.map((m) => m.meal)).size >= 3 },
    { id: 'hydration', icon: 'Water', label: 'Hydration Hero', detail: 'Reach 6+ glasses on any day.', unlocked: waterDays > 0 },
    { id: 'move', icon: 'Move', label: 'Moved Today', detail: 'Log at least 10 minutes of movement.', unlocked: moveDays > 0 },
    { id: 'family', icon: 'Family', label: 'Care Circle', detail: 'Invite or create a managed profile.', unlocked: managedCount + inviteCount > 0 },
    { id: 'consistency', icon: 'Streak', label: 'Consistency', detail: 'Track on 3 different days.', unlocked: activeDays >= 3 },
  ];
}

export function familyMissions({
  meals,
  vitals,
  exercises,
  managedCount,
  inviteCount,
}: {
  meals: MealLog[];
  vitals: VitalLog[];
  exercises: ExerciseLog[];
  managedCount: number;
  inviteCount: number;
}): EngagementQuest[] {
  const today = keyToday();
  const todayMeals = meals.filter((m) => m.date === today);
  const water = vitals.find((v) => v.date === today)?.water || 0;
  const move = exercises.filter((e) => e.date === today).reduce((s, e) => s + (e.minutes || 0), 0);
  const mealTypes = new Set(todayMeals.map((m) => m.meal)).size;

  return [
    {
      id: 'family-first-meal',
      icon: 'Meal',
      title: 'Family meal check',
      description: 'Log at least one meal for yourself or someone you care for.',
      cta: 'Log meal',
      href: '/food',
      progress: pct(todayMeals.length, 1),
      done: todayMeals.length > 0,
      points: 20,
      tone: 'coral',
    },
    {
      id: 'water-round',
      icon: 'Water',
      title: 'Water round',
      description: 'Do a quick water reminder for the family and log your own water.',
      cta: 'Open vitals',
      href: '/tracking',
      progress: pct(water, 6),
      done: water >= 6,
      points: 15,
      tone: 'blue',
    },
    {
      id: 'move-together',
      icon: 'Move',
      title: 'Move together',
      description: 'Take a short family walk, stretch, or light activity session.',
      cta: 'Log movement',
      href: '/exercise',
      progress: pct(move, 15),
      done: move >= 15,
      points: 20,
      tone: 'charcoal',
    },
    {
      id: 'care-setup',
      icon: 'Care',
      title: 'Build your care circle',
      description: 'Invite a family member or create a managed profile for an elder/child.',
      cta: 'Set up family',
      href: '/family',
      progress: pct(inviteCount + managedCount, 1),
      done: inviteCount + managedCount > 0,
      points: 25,
      tone: 'amber',
    },
    {
      id: 'three-meals',
      icon: 'Day',
      title: 'Complete meal rhythm',
      description: 'Try to log breakfast, lunch, and dinner without chasing perfection.',
      cta: 'Add food',
      href: '/food',
      progress: pct(mealTypes, 3),
      done: mealTypes >= 3,
      points: 20,
      tone: 'coral',
    },
  ];
}

export function familyConversationStarters(managedCount: number) {
  const base = [
    'What was one meal everyone enjoyed today?',
    'Who needs a water reminder right now?',
    'Can we add one protein item to the next meal?',
    'What is one fruit or vegetable we can add tomorrow?',
  ];
  if (managedCount) base.unshift('Does a managed family member need meal or water help today?');
  return base.slice(0, 4);
}
