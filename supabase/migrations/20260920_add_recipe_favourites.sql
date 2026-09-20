-- HeyinkMeals — favourite recipes.
--
-- Adds a household-wide "starred" flag to recipes. The recipe library renders a
-- star toggle per recipe and the planner's picker gains a "Favourites" filter.
--
-- Additive + idempotent: safe to run more than once, and safe to run before or
-- after deploying the matching app code (the app treats a missing column as
-- "nothing is favourited" until this has been applied).

alter table recipes add column if not exists is_favourite boolean default false;

create index if not exists idx_recipes_favourite on recipes(is_favourite);
