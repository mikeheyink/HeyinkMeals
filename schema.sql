-- HeyinkMeals — canonical schema for a FRESH database.
-- This reflects the final (post-redesign) data model. For an EXISTING database, apply the
-- incremental migrations under supabase/migrations/ instead of re-running this file.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Reference Data: Categories and Stores
create table grocery_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order int default 99
);

create table stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null
);

-- Seed default categories
insert into grocery_categories (name, sort_order) values
('Produce', 1),
('Meat & Seafood', 2),
('Dairy & Eggs', 3),
('Pantry', 4),
('Frozen', 5),
('household', 99);

-- 2. Grocery Types (the "library" of ingredients/items)
create table grocery_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category_id uuid references grocery_categories(id),
  default_store_id uuid references stores(id)
);

-- 3. Lists — reusable shopping bundles (independent of recipes)
create table grocery_lists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now(),
  is_archived boolean default false
);

create table grocery_list_items (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid references grocery_lists(id) on delete cascade,
  grocery_type_id uuid references grocery_types(id),
  quantity numeric default 1,
  unit text default 'item',
  is_purchased boolean default false,
  is_in_stock boolean default false,
  is_archived boolean default false
);

-- 4. Recipes — own their ingredients directly via recipe_ingredients
create table recipes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  instructions text,
  servings int default 4,
  prep_time_minutes int default 0,
  cook_time_minutes int default 0,
  total_time_mins int default 0,
  web_source text,
  category text,
  is_archived boolean default false
);

create table recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade,
  grocery_type_id uuid references grocery_types(id),
  quantity numeric default 1,
  unit text default 'item'
);
create index idx_recipe_ingredients_recipe on recipe_ingredients(recipe_id);

-- 5. Meal Plan — typed entries: Recipe | Item | List | Note
create table meal_plan_entries (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  slot text not null check (slot in ('Breakfast', 'Lunch', 'Dinner')),
  diner_type text not null check (diner_type in ('Parents', 'Children', 'Everyone')),
  entry_type text not null check (entry_type in ('Recipe', 'Item', 'List', 'Note')),
  recipe_id uuid references recipes(id) on delete cascade,
  list_id uuid references grocery_lists(id) on delete cascade,
  item_grocery_type_id uuid references grocery_types(id) on delete cascade,
  quantity numeric,
  unit text,
  note_text text,
  servings int,
  constraint meal_plan_entries_ref_check check (
    (entry_type = 'Recipe' and recipe_id is not null) or
    (entry_type = 'List'   and list_id is not null) or
    (entry_type = 'Item'   and item_grocery_type_id is not null) or
    (entry_type = 'Note'   and note_text is not null)
  )
);

-- 6. Persistent Shopping List Ledger
create table shopping_list_items (
  id uuid primary key default uuid_generate_v4(),
  meal_plan_entry_id uuid references meal_plan_entries(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,
  grocery_type_id uuid references grocery_types(id) on delete cascade,
  quantity numeric not null,
  unit text not null,
  is_in_stock boolean default false,
  is_purchased boolean default false,
  is_archived boolean default false,
  created_at timestamptz default now()
);

-- 7. User Preferences (single shared household account)
create table user_preferences (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- 8. Dev feature-capture notes — developer backlog jotted via the in-app hotkey
create table dev_notes (
  id uuid primary key default uuid_generate_v4(),
  note text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  context text,
  created_at timestamptz default now(),
  done_at timestamptz
);
create index idx_dev_notes_status on dev_notes(status);

-- 9. Row-Level Security — lock every table to authenticated users (anon gets nothing)
do $$
declare t text;
begin
  foreach t in array array[
    'grocery_categories','stores','grocery_types','grocery_lists','grocery_list_items',
    'recipes','recipe_ingredients','meal_plan_entries','shopping_list_items','user_preferences',
    'dev_notes'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "authenticated_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
