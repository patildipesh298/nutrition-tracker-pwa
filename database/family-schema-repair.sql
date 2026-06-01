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
