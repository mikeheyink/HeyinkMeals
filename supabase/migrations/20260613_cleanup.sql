-- HeyinkMeals data-model redesign — DEFERRED CLEANUP (destructive).
-- Run this ONLY after 20260613_redesign.sql has been applied AND you have confirmed the
-- redesigned app works end-to-end (log in, plan all 4 entry types, shop, cook).
-- Until then the legacy columns remain, so the change is fully reversible.

-- Drop the legacy polymorphic / coupling columns now that data is migrated.
alter table meal_plan_entries drop column if exists plan_type;
alter table meal_plan_entries drop column if exists reference_id;
alter table recipes drop column if exists ingredients_list_id;

-- Enforce the typed entry model.
alter table meal_plan_entries alter column entry_type set not null;

alter table meal_plan_entries drop constraint if exists meal_plan_entries_entry_type_check;
alter table meal_plan_entries add constraint meal_plan_entries_entry_type_check
  check (entry_type in ('Recipe', 'Item', 'List', 'Note'));

-- Exactly the right reference column must be set for each entry type.
alter table meal_plan_entries drop constraint if exists meal_plan_entries_ref_check;
alter table meal_plan_entries add constraint meal_plan_entries_ref_check check (
  (entry_type = 'Recipe' and recipe_id is not null) or
  (entry_type = 'List'   and list_id is not null) or
  (entry_type = 'Item'   and item_grocery_type_id is not null) or
  (entry_type = 'Note'   and note_text is not null)
);
