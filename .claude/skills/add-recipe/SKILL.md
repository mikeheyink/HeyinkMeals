---
name: add-recipe
description: Add a recipe to HeyinkMeals from a URL, a pasted recipe, a photo or a description — in SA metric units, mapped to existing grocery items and kitchen zones, with step-by-step cooking cards. Use when the household asks to add, import or save a recipe.
---

# Add a recipe

Input: `$ARGUMENTS` — a URL, pasted text, or a description of the dish.

1. **Read `docs/claude/recipes.md`** (units, item naming, zones, step rules). Follow it exactly.
2. **Get the recipe.** Fetch the URL (if a site blocks fetching, try the web.archive.org copy). For a
   description, ask only what you genuinely need (servings, anything ambiguous).
3. **Check it isn't already there:** `select id, name from recipes where name ilike '%…%' and not is_archived;`
4. **Map ingredients** to existing grocery items (`select g.name, c.name zone from grocery_types g join grocery_categories c on c.id = g.category_id where g.name ilike '%…%';`).
   Convert to SA metric units. List any genuinely new items with the zone you'd file them in.
5. **Write the steps** as cooking cards (4–10 steps, each with its ingredients and an optional timer).
6. **Show the household a compact preview** before writing anything:
   - name · category · servings · time · source link · whether a photo was found
   - ingredients table (item · amount · zone, marking NEW items)
   - numbered steps (text + the ingredients on each card)
   Ask: "Add it?"
7. **On yes, write it** using the SQL pattern in `recipes.md` §5: create new grocery items, insert the
   recipe (with `web_source` and the page's `og:image` as `image_url`), insert ingredients, then set
   `steps` (and `instructions` = step texts joined by blank lines).
8. **Verify** by reading it back: every ingredient row has a grocery item, every step ingredient id
   exists on this recipe, every ingredient is used in a step. Report the result in one or two lines.
9. If the household corrected you along the way (units, naming, step style), offer to add it to
   `docs/claude/recipes.md` (see "Keep learning" in `CLAUDE.md`).
