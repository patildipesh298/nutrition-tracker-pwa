import { getSupabase } from './supabaseClient';
import type { MealLog, Profile, VitalLog, ExerciseLog } from './types';

export type ProfileStatus = { user: any | null; profile: Profile | null; isComplete: boolean; hasProfile: boolean };

export const defaultProfile: Profile = {
  name: '', age: 45, gender: 'male', height: 170, weight: 70, activity: 1.35,
  goal: 'maintain', diet: 'Vegetarian', cuisine: 'Indian', conditions: [],
  allergies: '', medicines: '', emergency: '', doctorNotes: ''
};

export function isProfileComplete(profile: Profile | null) {
  return Boolean(profile?.name?.trim() && profile.age && profile.height && profile.weight && profile.goal && profile.diet);
}

export async function getCurrentUser() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

function rowToProfile(row: any): Profile | null {
  if (!row) return null;
  return {
    name: row.full_name || '',
    age: Number(row.age || 45),
    gender: row.gender || 'male',
    height: Number(row.height_cm || 170),
    weight: Number(row.weight_kg || 70),
    activity: Number(row.activity_level || 1.35),
    goal: row.goal || 'maintain',
    diet: row.diet_preference || 'Vegetarian',
    cuisine: row.cuisine_preference || 'Indian',
    conditions: row.known_conditions || [],
    allergies: row.allergies || '',
    medicines: row.medicines || '',
    emergency: row.emergency_contact || '',
    doctorNotes: row.doctor_notes || '',
  };
}

function profileToRow(userId: string, profile: Profile) {
  return {
    user_id: userId,
    full_name: profile.name.trim(),
    age: profile.age,
    gender: profile.gender,
    height_cm: profile.height,
    weight_kg: profile.weight,
    activity_level: String(profile.activity),
    goal: profile.goal,
    diet_preference: profile.diet,
    cuisine_preference: profile.cuisine,
    known_conditions: profile.conditions || [],
    allergies: profile.allergies || '',
    medicines: profile.medicines || '',
    doctor_notes: profile.doctorNotes || '',
    emergency_contact: profile.emergency || '',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchProfileStatus(): Promise<ProfileStatus> {
  const sb = getSupabase();
  if (!sb) return { user: null, profile: null, isComplete: false, hasProfile: false };
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return { user: null, profile: null, isComplete: false, hasProfile: false };
  const { data, error } = await sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  const profile = rowToProfile(data);
  return { user, profile, isComplete: isProfileComplete(profile), hasProfile: Boolean(data) };
}

export async function upsertProfile(profile: Profile) {
  const sb = getSupabase();
  const user = await getCurrentUser();
  if (!sb || !user) throw new Error('Please login before saving your profile.');
  const { error } = await sb.from('profiles').upsert(profileToRow(user.id, profile), { onConflict: 'user_id' });
  if (error) throw error;
}

export function rowToMeal(row: any): MealLog {
  return {
    id: row.id,
    date: row.log_date,
    meal: row.meal || 'Snacks',
    name: row.food_name,
    qty: row.serving || `${row.qty || 1} serving`,
    cal: Number(row.calories || 0),
    p: Number(row.protein_g || 0),
    c: Number(row.carbs_g || 0),
    f: Number(row.fat_g || 0),
    fiber: Number(row.fiber_g || 0),
    sugar: Number(row.sugar_g || 0),
    sodium: Number(row.sodium_mg || 0),
    source: row.source || 'Supabase',
  };
}

function mealToRow(userId: string, log: MealLog) {
  return {
    user_id: userId,
    log_date: log.date,
    meal: log.meal,
    food_name: log.name,
    serving: log.qty,
    qty: Number(String(log.qty).match(/\d+(?:\.\d+)?/)?.[0] || 1),
    calories: log.cal,
    protein_g: log.p,
    carbs_g: log.c,
    fat_g: log.f,
    fiber_g: log.fiber,
    sugar_g: log.sugar,
    sodium_mg: log.sodium,
    source: log.source || 'App',
  };
}

export async function fetchMealsForRange(startDate: string, endDate: string) {
  const sb = getSupabase();
  const user = await getCurrentUser();
  if (!sb || !user) return [] as MealLog[];
  const { data, error } = await sb.from('food_logs').select('*').eq('user_id', user.id).gte('log_date', startDate).lte('log_date', endDate).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToMeal);
}

export async function insertMeal(log: MealLog) {
  const sb = getSupabase();
  const user = await getCurrentUser();
  if (!sb || !user) return null;
  const { data, error } = await sb.from('food_logs').insert(mealToRow(user.id, log)).select('*').single();
  if (error) throw error;
  return rowToMeal(data);
}

export async function deleteMeal(id: string) {
  const sb = getSupabase();
  const user = await getCurrentUser();
  if (!sb || !user) return;
  const { error } = await sb.from('food_logs').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export function rowToVital(row: any): VitalLog {
  return {
    id: row.id,
    date: row.log_date,
    bpSys: Number(row.systolic || 0),
    bpDia: Number(row.diastolic || 0),
    glucose: Number(row.glucose || 0),
    pulse: Number(row.pulse || 0),
    water: Number(row.water_glasses || 0),
    steps: Number(row.steps || 0),
    symptoms: row.notes || '',
  };
}

export async function fetchVitalsForRange(startDate: string, endDate: string) {
  const sb = getSupabase();
  const user = await getCurrentUser();
  if (!sb || !user) return [] as VitalLog[];
  const { data, error } = await sb.from('vital_logs').select('*').eq('user_id', user.id).gte('log_date', startDate).lte('log_date', endDate);
  if (error) throw error;
  return (data || []).map(rowToVital);
}

export function rowToExercise(row: any): ExerciseLog {
  return {
    id: row.id,
    date: row.log_date,
    name: row.exercise_name,
    minutes: Number(row.minutes || 0),
    effort: row.effort || 'Easy',
    calories: Number(row.estimated_calories || 0),
  };
}

function exerciseToRow(userId: string, log: ExerciseLog) {
  return {
    user_id: userId,
    log_date: log.date,
    exercise_name: log.name,
    minutes: log.minutes,
    effort: log.effort,
    estimated_calories: log.calories,
  };
}

export async function fetchExercisesForRange(startDate: string, endDate: string) {
  const sb = getSupabase();
  const user = await getCurrentUser();
  if (!sb || !user) return [] as ExerciseLog[];
  const { data, error } = await sb.from('exercise_logs').select('*').eq('user_id', user.id).gte('log_date', startDate).lte('log_date', endDate).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToExercise);
}

export async function insertExercise(log: ExerciseLog) {
  const sb = getSupabase();
  const user = await getCurrentUser();
  if (!sb || !user) return null;
  const { data, error } = await sb.from('exercise_logs').insert(exerciseToRow(user.id, log)).select('*').single();
  if (error) throw error;
  return rowToExercise(data);
}
