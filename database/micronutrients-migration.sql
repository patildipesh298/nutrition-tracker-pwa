-- Eatlyte micronutrient tracking migration
-- Safe to run on existing databases. Adds nullable micronutrient columns to food_logs
-- so verified/database foods can carry potassium, calcium, iron and vitamins A/C.
-- Nullable (no default) is intentional: NULL means "the source did not provide this nutrient"
-- and the app shows a labelled estimate instead of a fake 0.
-- This migration does NOT touch or delete any existing rows.

alter table public.food_logs add column if not exists potassium_mg  numeric;
alter table public.food_logs add column if not exists calcium_mg    numeric;
alter table public.food_logs add column if not exists iron_mg       numeric;
alter table public.food_logs add column if not exists vitamin_a_mcg numeric;
alter table public.food_logs add column if not exists vitamin_c_mg  numeric;
