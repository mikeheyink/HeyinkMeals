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

-- 2. Grocery Types (The "Library" of ingredients)
create table grocery_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category_id uuid references grocery_categories(id),
  default_store_id uuid references stores(id)
);

-- 3. Lists
create table grocery_lists (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

create table grocery_list_items (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid references grocery_lists(id) on delete cascade,
  grocery_type_id uuid references grocery_types(id),
  quantity numeric default 1,
  unit text default 'item',
  is_purchased boolean default false,
  is_in_stock boolean default false
);

-- 4. Recipes
create table recipes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  instructions text,
  servings int default 4,
  prep_time_minutes int default 0,
  cook_time_minutes int default 0,
  total_time_mins int default 0,
  web_source text,
  -- Linking a recipe to a specific grocery list that holds its ingredients
  ingredients_list_id uuid references grocery_lists(id)
);

-- 5. Meal Plan
create table meal_plan_entries (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  slot text not null check (slot in ('Breakfast', 'Lunch', 'Dinner')),
  diner_type text not null check (diner_type in ('Parents', 'Children', 'Everyone')),
  plan_type text not null check (plan_type in ('Recipe', 'AdHocList')),
  -- This ID references either recipes(id) or grocery_lists(id) depending on plan_type
  reference_id uuid not null
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

-- 7. User Preferences (single user for now)
create table user_preferences (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz default now()
);
