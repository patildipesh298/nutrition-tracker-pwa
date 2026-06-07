-- Eatlyte Elder Pro - Supabase production starter schema
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
  potassium_mg numeric,
  calcium_mg numeric,
  iron_mg numeric,
  vitamin_a_mcg numeric,
  vitamin_c_mg numeric,
  created_at timestamptz default now()
);
-- Micronutrient columns are nullable (not default 0) so the app can tell the difference
-- between "0 logged" and "this food source did not provide the value".
alter table public.food_logs add column if not exists potassium_mg numeric;
alter table public.food_logs add column if not exists calcium_mg numeric;
alter table public.food_logs add column if not exists iron_mg numeric;
alter table public.food_logs add column if not exists vitamin_a_mcg numeric;
alter table public.food_logs add column if not exists vitamin_c_mg numeric;

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

-- Eatlyte family schema repair / idempotent migration
-- Run this in Supabase SQL Editor if the main schema fails with:
-- ERROR: 42703: column "owner_id" does not exist
-- Reason: older/partial family tables already exist, so CREATE TABLE IF NOT EXISTS
-- did not add new columns.

create extension if not exists "uuid-ossp";

-- 1) Ensure family tables exist.
create table if not exists public.family_groups (
  id uuid primary key default uuid_generate_v4()
);

create table if not exists public.family_invites (
  id uuid primary key default uuid_generate_v4()
);

create table if not exists public.family_members (
  id uuid primary key default uuid_generate_v4()
);

create table if not exists public.managed_profiles (
  id uuid primary key default uuid_generate_v4()
);

create table if not exists public.profile_permissions (
  id uuid primary key default uuid_generate_v4()
);

create table if not exists public.shared_reports (
  id uuid primary key default uuid_generate_v4()
);

create table if not exists public.access_audit_logs (
  id uuid primary key default uuid_generate_v4()
);

-- 2) Add missing columns for existing/partial tables.
alter table public.family_groups add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.family_groups add column if not exists name text default 'My Eatlyte Family';
alter table public.family_groups add column if not exists created_at timestamptz default now();
alter table public.family_groups add column if not exists updated_at timestamptz default now();

alter table public.family_invites add column if not exists group_id uuid references public.family_groups(id) on delete cascade;
alter table public.family_invites add column if not exists inviter_id uuid references auth.users(id) on delete set null;
alter table public.family_invites add column if not exists invited_name text;
alter table public.family_invites add column if not exists email text;
alter table public.family_invites add column if not exists role text;
alter table public.family_invites add column if not exists status text default 'pending';
alter table public.family_invites add column if not exists token text;
alter table public.family_invites add column if not exists invite_url text;
alter table public.family_invites add column if not exists accepted_by_email text;
alter table public.family_invites add column if not exists sent_at timestamptz;
alter table public.family_invites add column if not exists accepted_at timestamptz;
alter table public.family_invites add column if not exists expires_at timestamptz default (now() + interval '7 days');
alter table public.family_invites add column if not exists created_at timestamptz default now();

alter table public.family_members add column if not exists group_id uuid references public.family_groups(id) on delete cascade;
alter table public.family_members add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.family_members add column if not exists member_user_id uuid references auth.users(id) on delete cascade;
alter table public.family_members add column if not exists email text;
alter table public.family_members add column if not exists role text;
alter table public.family_members add column if not exists status text default 'active';
alter table public.family_members add column if not exists permissions jsonb default '{}';
alter table public.family_members add column if not exists created_at timestamptz default now();
alter table public.family_members add column if not exists updated_at timestamptz default now();

alter table public.managed_profiles add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.managed_profiles add column if not exists group_id uuid references public.family_groups(id) on delete cascade;
alter table public.managed_profiles add column if not exists display_name text;
alter table public.managed_profiles add column if not exists relationship text;
alter table public.managed_profiles add column if not exists age int;
alter table public.managed_profiles add column if not exists focus text;
alter table public.managed_profiles add column if not exists notes text;
alter table public.managed_profiles add column if not exists assigned_caregiver_email text;
alter table public.managed_profiles add column if not exists created_at timestamptz default now();
alter table public.managed_profiles add column if not exists updated_at timestamptz default now();

alter table public.profile_permissions add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.profile_permissions add column if not exists managed_profile_id uuid references public.managed_profiles(id) on delete cascade;
alter table public.profile_permissions add column if not exists grantee_email text;
alter table public.profile_permissions add column if not exists role text;
alter table public.profile_permissions add column if not exists can_log_food boolean default false;
alter table public.profile_permissions add column if not exists can_log_water boolean default false;
alter table public.profile_permissions add column if not exists can_view_reports boolean default true;
alter table public.profile_permissions add column if not exists expires_at timestamptz;
alter table public.profile_permissions add column if not exists revoked_at timestamptz;
alter table public.profile_permissions add column if not exists created_at timestamptz default now();

alter table public.shared_reports add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.shared_reports add column if not exists recipient_email text;
alter table public.shared_reports add column if not exists recipient_role text;
alter table public.shared_reports add column if not exists profile_name text;
alter table public.shared_reports add column if not exists sections text[] default '{}';
alter table public.shared_reports add column if not exists token text;
alter table public.shared_reports add column if not exists report_url text;
alter table public.shared_reports add column if not exists status text default 'sent';
alter table public.shared_reports add column if not exists expires_at timestamptz default (now() + interval '30 days');
alter table public.shared_reports add column if not exists created_at timestamptz default now();

alter table public.access_audit_logs add column if not exists event_type text;
alter table public.access_audit_logs add column if not exists actor_user_id uuid references auth.users(id) on delete set null;
alter table public.access_audit_logs add column if not exists actor_email text;
alter table public.access_audit_logs add column if not exists target_type text;
alter table public.access_audit_logs add column if not exists target_token text;
alter table public.access_audit_logs add column if not exists metadata jsonb default '{}';
alter table public.access_audit_logs add column if not exists created_at timestamptz default now();

-- 3) Helpful indexes. These are safe for idempotent reruns.
create index if not exists family_groups_owner_id_idx on public.family_groups(owner_id);
create index if not exists family_invites_email_idx on public.family_invites(lower(email));
create unique index if not exists family_invites_token_unique_idx on public.family_invites(token) where token is not null;
create index if not exists family_invites_inviter_id_idx on public.family_invites(inviter_id);
create index if not exists family_members_owner_id_idx on public.family_members(owner_id);
create index if not exists family_members_member_user_id_idx on public.family_members(member_user_id);
create index if not exists managed_profiles_owner_id_idx on public.managed_profiles(owner_id);
create index if not exists profile_permissions_owner_id_idx on public.profile_permissions(owner_id);
create index if not exists profile_permissions_grantee_email_idx on public.profile_permissions(lower(grantee_email));
create index if not exists shared_reports_owner_id_idx on public.shared_reports(owner_id);
create index if not exists shared_reports_recipient_email_idx on public.shared_reports(lower(recipient_email));
create unique index if not exists shared_reports_token_unique_idx on public.shared_reports(token) where token is not null;
create index if not exists access_audit_actor_user_id_idx on public.access_audit_logs(actor_user_id);

-- 4) Enable RLS and recreate non-recursive policies.
alter table public.family_groups enable row level security;
alter table public.family_invites enable row level security;
alter table public.family_members enable row level security;
alter table public.managed_profiles enable row level security;
alter table public.profile_permissions enable row level security;
alter table public.shared_reports enable row level security;
alter table public.access_audit_logs enable row level security;

drop policy if exists "Users manage own family groups" on public.family_groups;
create policy "Users manage own family groups" on public.family_groups
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Users read own invites" on public.family_invites;
create policy "Users read own invites" on public.family_invites
for select using (auth.uid() = inviter_id or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

drop policy if exists "Users manage owned family members" on public.family_members;
create policy "Users manage owned family members" on public.family_members
for all using (auth.uid() = owner_id or auth.uid() = member_user_id)
with check (auth.uid() = owner_id or auth.uid() = member_user_id);

drop policy if exists "Users manage own managed profiles" on public.managed_profiles;
create policy "Users manage own managed profiles" on public.managed_profiles
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Users manage own profile permissions" on public.profile_permissions;
create policy "Users manage own profile permissions" on public.profile_permissions
for all using (auth.uid() = owner_id or lower(grantee_email) = lower(coalesce(auth.jwt() ->> 'email','')))
with check (auth.uid() = owner_id);

drop policy if exists "Users manage own shared reports" on public.shared_reports;
create policy "Users manage own shared reports" on public.shared_reports
for all using (auth.uid() = owner_id or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email','')))
with check (auth.uid() = owner_id);

drop policy if exists "Users read own audit logs" on public.access_audit_logs;
create policy "Users read own audit logs" on public.access_audit_logs
for select using (auth.uid() = actor_user_id or lower(actor_email) = lower(coalesce(auth.jwt() ->> 'email','')));
