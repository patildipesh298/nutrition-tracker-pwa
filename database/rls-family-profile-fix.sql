-- Eatlyte production RLS repair
-- Run this once in Supabase SQL Editor if you see:
-- "infinite recursion detected in policy for relation family_members"

-- 1) Keep profiles simple and non-recursive.
alter table if exists public.profiles enable row level security;
drop policy if exists "Users manage own profile" on public.profiles;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;

create policy "profiles_select" on public.profiles
for select using (auth.uid() = user_id);

create policy "profiles_insert" on public.profiles
for insert with check (auth.uid() = user_id);

create policy "profiles_update" on public.profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "profiles_delete" on public.profiles
for delete using (auth.uid() = user_id);

-- 2) Remove any recursive family_members policies and replace with direct owner policies.
do $$
declare
  pol record;
  owner_col text;
begin
  if to_regclass('public.family_members') is not null then
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = 'family_members'
    loop
      execute format('drop policy if exists %I on public.family_members', pol.policyname);
    end loop;

    execute 'alter table public.family_members enable row level security';

    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='family_members' and column_name='user_id'
    ) then
      owner_col := 'user_id';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='family_members' and column_name='owner_id'
    ) then
      owner_col := 'owner_id';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='family_members' and column_name='created_by'
    ) then
      owner_col := 'created_by';
    else
      raise notice 'family_members exists, but no user_id/owner_id/created_by column was found. Add one of these columns or keep family_members disabled until schema is finalized.';
      return;
    end if;

    execute format('create policy family_members_select_own on public.family_members for select using (auth.uid() = %I)', owner_col);
    execute format('create policy family_members_insert_own on public.family_members for insert with check (auth.uid() = %I)', owner_col);
    execute format('create policy family_members_update_own on public.family_members for update using (auth.uid() = %I) with check (auth.uid() = %I)', owner_col, owner_col);
    execute format('create policy family_members_delete_own on public.family_members for delete using (auth.uid() = %I)', owner_col);
  end if;
end $$;

-- 3) Make app data tables direct-owner only. These do not reference family_members.
do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['food_logs','vital_logs','lab_logs','exercise_logs','report_logs'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, t);
      end loop;
      execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', t || '_select_own', t);
      execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', t || '_insert_own', t);
      execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update_own', t);
      execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', t || '_delete_own', t);
    end if;
  end loop;
end $$;
