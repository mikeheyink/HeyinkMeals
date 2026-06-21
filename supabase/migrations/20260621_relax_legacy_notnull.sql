-- HeyinkMeals — HOTFIX for the half-migrated redesign state.
-- Run this in the Supabase SQL editor if 20260613_redesign.sql has been applied
-- but 20260613_cleanup.sql has NOT (the reversible "keep legacy columns" state).
--
-- Problem: the legacy meal_plan_entries.plan_type / reference_id columns are still
-- NOT NULL, but the redesigned app inserts typed entries without populating them, so
-- every "add to plan" fails with a not-null violation. This relaxes the legacy columns
-- so the new app works, while KEEPING the columns + data for rollback. The deferred
-- 20260613_cleanup.sql can still drop them later to finalise.
--
-- Additive + idempotent: safe to run more than once, and a no-op once cleanup has run
-- (the columns no longer exist).

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name = 'meal_plan_entries' and column_name = 'plan_type') then
    alter table meal_plan_entries alter column plan_type drop not null;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name = 'meal_plan_entries' and column_name = 'reference_id') then
    alter table meal_plan_entries alter column reference_id drop not null;
  end if;
end $$;

-- The old check only allowed ('Recipe', 'AdHocList'); leaving plan_type NULL on new rows
-- is fine, but drop the stale constraint so a future backfill can't trip on it.
alter table meal_plan_entries drop constraint if exists meal_plan_entries_plan_type_check;
