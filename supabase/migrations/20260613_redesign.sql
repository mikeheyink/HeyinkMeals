-- HeyinkMeals data-model redesign — ADDITIVE + BACKFILL (safe, reversible, idempotent).
-- Run this in the Supabase SQL editor AFTER schema.sql + migrations/add_is_archived_columns.sql.
-- It does NOT drop anything. Legacy columns are dropped later by 20260613_cleanup.sql,
-- only once you've confirmed the redesigned app works end-to-end.
--
-- ⚠️ Section 3 enables RLS, which means the app MUST be logged in (the auth UI ships with
--    this change). After running this, create a shared account in
--    Authentication → Users → Add user, and disable public signups.

-- 1. recipe_ingredients — recipes now own their ingredients directly (decoupled from lists)
create table if not exists recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade,
  grocery_type_id uuid references grocery_types(id),
  quantity numeric default 1,
  unit text default 'item'
);
create index if not exists idx_recipe_ingredients_recipe on recipe_ingredients(recipe_id);

-- Backfill each recipe's ingredients from its old linked grocery list.
-- Guarded by "not exists" so re-running this migration never duplicates rows.
insert into recipe_ingredients (recipe_id, grocery_type_id, quantity, unit)
select r.id, gli.grocery_type_id, coalesce(gli.quantity, 1), coalesce(gli.unit, 'item')
from recipes r
join grocery_list_items gli on gli.list_id = r.ingredients_list_id
where r.ingredients_list_id is not null
  and coalesce(gli.is_archived, false) = false
  and gli.grocery_type_id is not null
  and not exists (select 1 from recipe_ingredients ri where ri.recipe_id = r.id);

-- Archive the now-redundant per-recipe lists so they don't show up as standalone lists.
-- Reversible: set is_archived = false to restore.
update grocery_lists gl
set is_archived = true
where exists (select 1 from recipes r where r.ingredients_list_id = gl.id);

-- 2. meal_plan_entries — typed entries: Recipe | Item | List | Note
alter table meal_plan_entries add column if not exists entry_type text;
alter table meal_plan_entries add column if not exists recipe_id uuid references recipes(id) on delete cascade;
alter table meal_plan_entries add column if not exists list_id uuid references grocery_lists(id) on delete cascade;
alter table meal_plan_entries add column if not exists item_grocery_type_id uuid references grocery_types(id) on delete cascade;
alter table meal_plan_entries add column if not exists quantity numeric;
alter table meal_plan_entries add column if not exists unit text;
alter table meal_plan_entries add column if not exists note_text text;
alter table meal_plan_entries add column if not exists servings int;

-- Backfill the new columns from the old polymorphic (plan_type/reference_id) shape.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'meal_plan_entries' and column_name = 'plan_type'
  ) then
    update meal_plan_entries m
    set entry_type = 'Recipe',
        recipe_id = m.reference_id,
        servings = coalesce((select servings from recipes r where r.id = m.reference_id), 4)
    where m.plan_type = 'Recipe' and m.entry_type is null;

    update meal_plan_entries m
    set entry_type = 'List',
        list_id = m.reference_id
    where m.plan_type = 'AdHocList' and m.entry_type is null;
  end if;
end $$;

-- 3. Row-Level Security — lock every table to authenticated users (anon gets nothing)
do $$
declare t text;
begin
  foreach t in array array[
    'grocery_categories','stores','grocery_types','grocery_lists','grocery_list_items',
    'recipes','recipe_ingredients','meal_plan_entries','shopping_list_items','user_preferences'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "authenticated_all" on %I', t);
    execute format('create policy "authenticated_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
