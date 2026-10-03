-- HeyinkMeals — recipe thumbnails + step-by-step cooking cards.
--
-- Additive + idempotent. Until applied the app still loads (it treats missing columns as
-- "no image" / "no structured steps" and falls back to the free-text `instructions`).
--
-- recipes.image_url  — a thumbnail (usually the source page's og:image). Hot-linked, not stored.
-- recipes.steps      — ordered cooking steps, each listing the ingredients it uses:
--   [
--     {
--       "text": "Fry the onion until soft, then add the garlic.",
--       "ingredients": [
--         { "ingredient_id": "<recipe_ingredients.id>" },                       -- uses the full amount
--         { "ingredient_id": "<recipe_ingredients.id>", "quantity": 1, "unit": "tbsp" } -- part of it
--       ],
--       "timer_minutes": 5                                                       -- optional
--     }
--   ]
-- Quantities are for the recipe's base `servings`; the app scales them to the planned servings.

alter table recipes add column if not exists image_url text;
alter table recipes add column if not exists steps jsonb not null default '[]'::jsonb;
