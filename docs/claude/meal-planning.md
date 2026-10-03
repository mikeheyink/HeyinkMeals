# Meal-planning guide — recommending and scheduling the week

How Claude suggests meals and puts them on the HeyinkMeals planner. Read `recipes.md` too — it
defines the data (recipes, grocery items, kitchen zones, units).

> Living document. When the household tells you a preference ("we don't do fish on Mondays",
> "kids won't eat chilli"), offer to add it to **Household preferences** below.

---

## Household preferences

<!-- Add one bullet per learned preference, newest last, with the date you learned it. -->
- Shops at Woolworths ("Woolies") and Checkers. Woolies ready meals (pies, lasagne, kids' meals) are
  planned as **Items**, not recipes.
- "Leftovers", "Eat Out" and "Mark's Meal" are **Note** presets in the planner, not recipes.

## How the planner is shaped

- `meal_plan_entries`: one row per thing planned in a slot — `date`, `slot` (`Breakfast` | `Lunch` |
  `Dinner`), `diner_type` (`Parents` | `Children` | `Everyone`), and `entry_type`:
  - `Recipe` → `recipe_id` + `servings` (quantities scale from the recipe's base servings)
  - `Item` → `item_grocery_type_id` + `quantity` + `unit` (a bought thing, e.g. a Woolies pie)
  - `List` → `list_id` (a reusable grocery list)
  - `Note` → `note_text` (adds nothing to shopping)
- Which diner groups/slots are shown lives in `user_preferences` (`key = 'planner_config'`).
- Planning a Recipe/Item/List also **snapshots its groceries into `shopping_list_items`** (that is what
  the Shop tab shows). If you insert plan entries with SQL you must do this too — see below.

## Recommending meals

Before suggesting, look at what the household actually does:

```sql
-- What we've eaten recently (avoid repeats) and favourites
select m.date, m.slot, m.diner_type, coalesce(r.name, g.name, m.note_text) what
from meal_plan_entries m left join recipes r on r.id = m.recipe_id left join grocery_types g on g.id = m.item_grocery_type_id
where m.date >= current_date - 21 order by m.date;

select name, category, servings, total_time_mins from recipes where is_favourite and not is_archived;
```

Good suggestions:
- Balance the week: mix quick weeknight meals (≤ 40 min) with one or two bigger cooks; vary the main
  protein/base (pasta, curry, fish, salad, soup).
- Reuse ingredients across the week (half a bunch of coriander → two meals) to cut waste.
- Favour favourites and recipes not cooked in the last ~2 weeks.
- Respect the preferences above. Ask about the week first if unsure (busy nights, guests, who's home).
- Present the plan as a short table (day · slot · who · meal · time) and **confirm before writing**.

## Scheduling with SQL (mirrors `plannerService.addPlanEntry`)

```sql
-- 1. Plan a recipe for Dinner, Everyone, 4 servings
with e as (
  insert into meal_plan_entries (date, slot, diner_type, entry_type, recipe_id, servings)
  values ('2026-10-06', 'Dinner', 'Everyone', 'Recipe', '<recipe id>', 4)
  returning id, recipe_id, servings
)
-- 2. Snapshot its groceries into the shopping ledger, scaled to the planned servings
insert into shopping_list_items (meal_plan_entry_id, recipe_id, grocery_type_id, quantity, unit)
select e.id, e.recipe_id, ri.grocery_type_id,
       round(coalesce(ri.quantity, 1) * e.servings::numeric / greatest(coalesce(r.servings, 4), 1), 2),
       coalesce(ri.unit, 'item')
from e join recipes r on r.id = e.recipe_id join recipe_ingredients ri on ri.recipe_id = r.id
where ri.grocery_type_id is not null;
```

For an Item: insert the entry with `entry_type = 'Item'`, `item_grocery_type_id`, `quantity`, `unit`,
then one `shopping_list_items` row with the same item/quantity/unit. Notes need no shopping rows.
Removing a plan entry (`delete from meal_plan_entries where id = …`) cascades its shopping rows.

After writing, read the week back and show the household what's planned.
