# Recipe guide — how recipes are written for HeyinkMeals

The household lives in **South Africa**. Recipes are cooked from a phone in the kitchen: the cook
first gets every ingredient out (ticking them off), then works through **one step card at a time**.
Each card shows the step's instruction *and* the ingredients (with quantities) that step needs.
Everything below exists to make that flow effortless.

> Living document. When the household tells you something that should change how recipes are
> written, offer to add it here (see `CLAUDE.md` → "Keep learning").

---

## 1. Units — SA metric

Only these units exist in the app (`src/lib/units.ts` is the source of truth):

| Unit | Use for |
|---|---|
| `g`, `kg` | Anything bought or weighed by weight: meat, fish, cheese, butter, pasta, rice, veg when a recipe specifies weight |
| `ml`, `l` | Liquids of 60 ml and more (stock, milk, cream, coconut milk, water) |
| `tsp` (5 ml), `tbsp` (15 ml) | Small amounts: spices, oils, sauces, vinegar, under 60 ml |
| `cup` (250 ml, SA metric cup) | Only for dry baking volumes when the source measures in cups (flour, sugar, oats, coconut) |
| `item` | Countable things: 1 onion, 2 eggs, 1 avocado, 1 lemon |
| `clove` | Garlic |
| `tin` | A standard 400 g tin (chickpeas, tomatoes, coconut milk). Use `g` for anything non-standard |
| `bunch`, `handful` | Fresh herbs and leaves (bunch = what you buy; handful = a loose amount) |
| `packet` | When the recipe uses a whole retail packet (e.g. 1 packet fresh gnocchi) |
| `slice`, `pinch` | As named |
| `to taste` | Salt and pepper, unless an exact amount matters (baking, brines). Store quantity `1` |

Conversions: oz → g (×28), lb → g (×454), US cup → 1 SA cup, US stick butter → 115 g,
°F → °C (fan oven: subtract 20 °C and say so). Round to kitchen-friendly numbers (e.g. 125 g, not 127 g).

**SA ingredient names**: coriander (not cilantro), spring onions (not scallions), prawns (not shrimp),
brinjal (not eggplant), cake flour (not all-purpose), bicarbonate of soda (not baking soda),
Maizena / cornflour (not cornstarch), cream (not heavy cream), grill (not broil), pan (not skillet).
Brands: Woolworths ("Woolies") and Checkers are the household's shops.

## 2. Ingredients → grocery items

Every recipe ingredient points at a **grocery item** (`grocery_types`). Grocery items are what the
Shop list is built from, grouped by **kitchen zone** (`grocery_categories`) so the household can tick
off everything in one place (fridge, freezer, pantry shelf …) in a single pass.

- **Reuse an existing item** whenever one fits — search first (`select name from grocery_types where name ilike '%chick%'`).
  Never create a near-duplicate ("Garlic Cloves" when "Garlic" exists).
- A new item gets a generic, shoppable, Title Case name ("Feta", not "Crumbled feta, to serve") and the
  zone where it is **stored at home**:

  | Zone | What lives there |
  |---|---|
  | Counter & Fruit Bowl | onions, garlic, potatoes, sweet potatoes, butternut, avocados, bananas, citrus, whole tomatoes |
  | Fridge: Fruit & Veg | leafy greens, fresh herbs, peppers, carrots, broccoli, cherry tomatoes, berries |
  | Fridge | dairy, eggs, fresh meat, fresh pesto/hummus, opened-jar staples (miso), Woolies ready meals |
  | Freezer | frozen veg, fish/hake, prawns, puff pastry, parathas, frozen ready meals |
  | Pantry: Tins & Jars | tinned beans/tomatoes/coconut milk, stock, nut butters, curry paste, pasta sauce |
  | Pantry: Grains, Pasta & Cereal | rice, pasta, quinoa, couscous, lentils, oats, cereal |
  | Pantry: Baking | flours, sugars, raising agents, cocoa, chocolate, vanilla, honey, maple syrup |
  | Pantry: Oils, Vinegars & Sauces | oils, vinegars, soy/fish sauce, mustard, mayonnaise, hot sauce |
  | Pantry: Nuts, Seeds & Dried Fruit | nuts, seeds, coconut, dates, raisins |
  | Pantry: Snacks | crackers, crisps, tortilla chips |
  | Herbs & Spices | dried herbs, spices, salt, pepper, nutritional yeast |
  | Bread & Bakery | bread, rolls, wraps/tortillas, naan |

- Preparation ("finely chopped", "zested") does **not** go in the item name or the unit — it goes in the step text.
- Water from the tap is not an ingredient. Leave it out of the ingredient list; mention it in the step.
- If a recipe is really a bought ready-meal with nothing to cook, it is **not a recipe** — plan it as an *Item* instead.

## 3. Steps — one card at a time

Steps live in `recipes.steps` (JSON). Each step:

```json
{ "text": "…", "ingredients": [{ "ingredient_id": "<recipe_ingredients.id>", "quantity": 1, "unit": "tbsp" }], "timer_minutes": 10 }
```

Rules:

1. **4–10 steps.** Each step is one focused phase of work that ends at a natural pause.
2. **Imperative, short, ≤ 35 words.** Start with a verb: "Fry…", "Whisk…", "Bake…".
3. **No quantities in the text** — the card already shows them. Refer to ingredients by name
   ("Add the garlic and cumin"). Put preparation in the text ("finely slice the red onion").
4. **List exactly the ingredients used in that step.** Omit `quantity`/`unit` when the step uses the
   full amount; give them when an ingredient is split across steps (e.g. 1 tbsp of the 3 tbsp oil).
   Every ingredient must appear in at least one step.
5. **Give the cook a cue**: heat level, time and what "done" looks like ("until golden, 5–6 min").
6. **`timer_minutes`** for waits of 2+ minutes where you'd walk away (simmer, bake, rest, chill).
7. First step preheats the oven / boils the kettle if needed. Prep work (chopping) is folded into the
   step where it is first needed, unless it is long — then make it its own "Prep" step.
8. Temperatures in °C. Say "fan" if relevant.
9. Keep `recipes.instructions` in sync: the step texts joined with blank lines (legacy fallback).

## 4. Recipe record checklist

| Column | Rule |
|---|---|
| `name` | Short, recognisable, Title Case |
| `category` | `meals`, `salads`, `kids_meals`, `breakfasts`, `sides_snacks`, `desserts` |
| `servings` | What the quantities make (the planner scales from this) |
| `web_source` | The canonical URL of the original recipe (no tracking params, no AMP/Google wrappers) |
| `image_url` | The source page's `og:image` (a direct https image URL). Leave null for Instagram (their image URLs expire) |
| `total_time_mins` | Prep + cook, if known |

## 5. SQL recipe — adding a recipe end-to-end

Use the Supabase connector (`execute_sql`). Insert the recipe, then its ingredients (capturing ids),
then write `steps` referencing those ids:

```sql
with r as (
  insert into recipes (name, category, servings, web_source, image_url, total_time_mins)
  values ('Lemony Chickpea Orzo', 'meals', 4, 'https://…', 'https://…/hero.jpg', 35)
  returning id
)
insert into recipe_ingredients (recipe_id, grocery_type_id, quantity, unit)
select r.id, g.id, v.qty, v.unit
from r, (values ('Orzo', 250, 'g'), ('Chickpeas', 1, 'tin'), ('Lemons', 1, 'item')) v(name, qty, unit)
join grocery_types g on g.name = v.name
returning id, grocery_type_id;
-- then: update recipes set steps = '[…]'::jsonb, instructions = '…' where id = '…';
```

Check afterwards that every ingredient row resolved (a missing grocery name silently drops a row in the
join above — create the item first).
