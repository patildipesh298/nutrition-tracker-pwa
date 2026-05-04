-- NutriFamily Elder Pro - Supabase production starter schema
-- Run this in Supabase SQL editor. It keeps every user's data private with RLS.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  age int,
  gender text,
  height_cm numeric,
  weight_kg numeric,
  activity_level text,
  goal text,
  diet_preference text,
  cuisine_preference text,
  known_conditions text[] default '{}',
  allergies text,
  medicines text,
  doctor_notes text,
  emergency_contact text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.food_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  meal text,
  food_name text not null,
  source text,
  serving text,
  qty numeric default 1,
  calories numeric default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  fiber_g numeric default 0,
  sugar_g numeric default 0,
  sodium_mg numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.vital_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  systolic int,
  diastolic int,
  pulse int,
  glucose int,
  weight_kg numeric,
  sleep_hours numeric,
  steps int,
  pain_level int,
  mood text,
  medicine_taken text,
  bowel_movement text,
  water_glasses int,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, log_date)
);

create table if not exists public.lab_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  values jsonb not null default '{}',
  note text,
  created_at timestamptz default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  exercise_name text not null,
  minutes numeric,
  effort text,
  estimated_calories numeric,
  created_at timestamptz default now()
);

create table if not exists public.report_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date date not null default current_date,
  report_type text,
  file_name text,
  storage_path text,
  notes text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.vital_logs enable row level security;
alter table public.lab_logs enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.report_logs enable row level security;

do $$
begin
  perform 1;
exception when others then null;
end $$;

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own food logs" on public.food_logs;
create policy "Users manage own food logs" on public.food_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own vital logs" on public.vital_logs;
create policy "Users manage own vital logs" on public.vital_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own lab logs" on public.lab_logs;
create policy "Users manage own lab logs" on public.lab_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own exercise logs" on public.exercise_logs;
create policy "Users manage own exercise logs" on public.exercise_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own report logs" on public.report_logs;
create policy "Users manage own report logs" on public.report_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket: create in Supabase UI as private bucket named health-reports.
-- Then add storage policies similar to:
-- bucket_id = 'health-reports' and auth.uid()::text = (storage.foldername(name))[1]
