---
name: plan-week
description: Recommend meals and plan the week (or a few days) in HeyinkMeals, then schedule them on the planner so the Shop list fills itself. Use when the household asks what to eat, for meal ideas, or to plan the week.
---

# Plan the week

Input: `$ARGUMENTS` — optional dates or constraints ("next week", "quick dinners", "guests Saturday").

1. **Read `docs/claude/meal-planning.md`** — especially *Household preferences* — and skim
   `docs/claude/recipes.md` for the data model.
2. **Look before suggesting:** what's already planned for the target dates, what was eaten in the last
   ~3 weeks, the favourites, and which diner groups/slots the planner shows
   (`select value from user_preferences where key = 'planner_config';`).
3. **Ask at most one short round of questions** if something matters and isn't known (who's home, busy
   nights, guests, anything to use up).
4. **Propose** a compact table: day · slot · who · meal · cook time — plus one line on why (variety,
   shared ingredients, favourites). Suggest new recipes from the web only if asked or the library is thin;
   adding one goes through `/add-recipe`.
5. **On a yes, schedule it** with the SQL in `meal-planning.md` (plan entry **and** its shopping
   snapshot, scaled to servings). Ready meals go in as Items; "Leftovers"/"Eat Out" as Notes.
6. **Read the week back** and summarise what's planned and roughly how many new lines hit the Shop list.
7. Any lasting preference revealed along the way → offer to save it (see "Keep learning" in `CLAUDE.md`).
