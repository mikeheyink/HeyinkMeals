# HeyinkMeals

A single-household meal-planning, grocery-shopping, and cooking companion. HeyinkMeals lets you
maintain a library of recipes and grocery items, build reusable shopping lists, schedule meals on a
calendar for different members of the household, generate a consolidated shopping list, and cook from
a distraction-free, step-by-step view.

It is a client-only React SPA backed by [Supabase](https://supabase.com) (Postgres + auto-generated
REST). Access is gated by a **single shared household login**, and all tables are protected by
Row-Level Security.

---

## Tech stack

| Concern | Choice |
|---|---|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 5 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4, custom `ink`/`base`/`accent` design tokens |
| Server state | TanStack Query 5 |
| Backend | Supabase (`@supabase/supabase-js`) — Postgres, PostgREST, Auth, RLS |
| Icons | lucide-react |
| Toasts | sonner |
| Dates | date-fns |
| Deployment | Vercel (SPA rewrites in `vercel.json`) |

> Everything runs within the **Supabase + Vercel free tiers**: a static SPA, Postgres, Supabase Auth
> (email/password), and RLS. There are no server functions or external APIs.

---

## Getting started

### Prerequisites
- Node 18+ and npm
- A Supabase project (URL + anon key)

### 1. Install
```bash
npm install
```

### 2. Configure environment
Create a `.env` file in the project root:
```bash
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
> The app throws on startup if either variable is missing (see `src/lib/supabase.ts`).

### 3. Provision the database

**Fresh database:** run `schema.sql` in the Supabase SQL editor. It creates every table, seeds default
categories, and enables RLS. You're done — skip to step 4.

**Existing database (already had data before the redesign):** apply the migrations under
`supabase/migrations/` in order:
1. `add_is_archived_columns.sql` *(if not already applied)* — soft-delete columns.
2. `20260613_redesign.sql` — **additive & reversible**: creates `recipe_ingredients` and backfills it
   from existing recipes, adds the typed `meal_plan_entries` columns and backfills them, archives the
   now-redundant per-recipe lists, and **enables RLS on every table**.
3. `20260613_cleanup.sql` — **destructive; run only after** you've confirmed the redesigned app works
   end-to-end. Drops the legacy `plan_type` / `reference_id` / `ingredients_list_id` columns and adds
   the typed-entry constraints.

`supabase/migrations/20260118_add_vector_embeddings.sql` exists but is **not used by the app** yet (see
[Known limitations](#known-limitations--architectural-notes)).

### 4. Create the shared account
Because RLS requires an authenticated user, create the household login in the Supabase dashboard:
**Authentication → Users → Add user** (set an email + password). Then **disable public sign-ups**
(Authentication → Providers → Email → turn off "Allow new users to sign up") so only your account can
log in. There is no sign-up screen in the app by design.

### 5. Run
```bash
npm run dev       # start the dev server
npm run build     # type-check (tsc -b) + production build
npm run preview   # preview the production build
```
> `npm run lint` currently fails to load `eslint.config.js` due to a dependency-version mismatch in the
> flat config — a pre-existing issue, unrelated to app code. Type-checking via `npm run build`
> (`tsc -b`, with `noUnusedLocals`/`noUnusedParameters`) is the working correctness gate.

---

## Concepts / domain model

See `schema.sql` for the canonical schema. The model keeps three user concepts cleanly separated:

- **Grocery Category** — supermarket-aisle grouping (Produce, Pantry, …) with a `sort_order`.
- **Store** — a shop (e.g. Woolworths). A grocery item can have a *preferred* store.
- **Grocery Type (Item)** — the "library" definition of an ingredient/product (name, category,
  default store).
- **Recipe** — name, servings, prep/cook time, instructions, category. **Owns its ingredients
  directly** via `recipe_ingredients` (recipe → grocery type, with quantity + unit).
- **List** — a reusable, independently-editable bundle of grocery items (`grocery_lists` +
  `grocery_list_items`). Not tied to a date — push it onto the shopping list, or drop it into a meal
  slot, whenever you like.
- **Meal Plan Entry** — a typed entry scheduled to a `date` + `slot` (Breakfast/Lunch/Dinner) +
  `diner_type` (Parents/Children/Everyone). Its `entry_type` is one of **Recipe** (with target
  `servings`), **Item** (a single grocery type + quantity/unit), **List**, or **Note** (freeform
  text). Each type uses a real, typed foreign key — no polymorphic reference column.
- **Shopping List Item** — a persistent "ledger" row. Scheduling a Recipe/Item/List **snapshots** the
  required groceries here (recipe quantities are **scaled to the planned servings**); Notes add
  nothing. Items can also be added manually or from a list.
- **User Preference** — key/value (JSONB) store for planner config and viewport state.

---

## Features & user stories

Navigation: **Plan**, **Shop**, **Cook**, a **Kitchen** library (Recipes / Lists / Pantry tabs), and
**Settings**. The whole app sits behind a login.

### Kitchen — library
**Recipes** (`RecipeListPage`, `RecipeEditor`, `AddRecipeModal`)
- Create a recipe with name, servings, instructions, and ingredients (ingredients are added/edited/
  removed directly on the recipe). Create new grocery items inline while editing.
- Browse recipes grouped by category; recategorise individually or in bulk; search.

**Lists** (`ListsPage`, `GroceryListModal`)
- Create reusable named lists (e.g. "Weekly Essentials") and edit their items (quantity + unit)
  inline. Delete (soft-archive) a list.

**Pantry** (`IngredientsPage`)
- Add grocery items with a category and optional preferred store; create categories on the fly;
  edit/delete items.

### Plan (`PlannerPage`, `MobilePlannerView`, `PlanEntryForm`, `PlannerGrid`)
- Customisable grid: which diner groups and slots are shown is configurable and persisted.
- Tap a slot and add **any** of: a **Recipe** (choosing servings), a single **Item** (with quantity +
  unit), a **List**, or a freeform **Note**. Create a new recipe inline if it doesn't exist yet.
- Remove entries. Scheduling a Recipe/Item/List snapshots its groceries into the shopping ledger;
  snapshot failures surface as a toast instead of silently dropping ingredients.

### Shop (`ShoppingListPage`)
- A consolidated **Shopping Ledger**. Duplicate groceries across meals are **merged into a single
  line** (quantities summed), grouped by supermarket category or by preferred shop.
- Assign/clear a preferred store per item (this sets the item's **default** store globally — by
  design). Mark items In Stock or Done (a merged line marks all its sources at once); archive
  purchased items to clear them.
- Add items manually or bulk-add an existing list.

### Cook (`CookingPage`, `CookingMode`, `MobileCookingView`)
- A weekly cooking grid / day-by-day mobile view of scheduled meals. Only **Recipe** entries are
  cookable; tapping one opens a distraction-free **Cooking Mode** (ingredients checklist, instructions,
  a timer).

### Settings (`AdminPage`)
- **Sign out**, plus a voice-feedback recorder (Web Speech API).
  > ⚠️ The voice note save is still a stub — the transcript is not persisted (see Known limitations).

---

## Project structure

```
src/
├── App.tsx                 # Routes + auth gate (redirects to /login when signed out)
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── useSession.ts       # Auth session hook
│   └── planEntry.ts        # planEntryLabel() / isCookable() helpers for typed plan entries
├── types/supabase.ts       # Supabase types
├── pages/
│   ├── LoginPage.tsx       # Shared-account sign in
│   ├── KitchenPage.tsx     # Tabs: Recipes / Lists / Pantry
│   ├── AdminPage.tsx       # Settings + sign out
│   ├── recipes/            # RecipeListPage, RecipeEditor
│   ├── lists/              # ListsPage
│   ├── pantry/             # IngredientsPage
│   ├── planner/            # PlannerPage, ShoppingListPage
│   └── cooking/            # CookingPage, CookingMode
├── components/
│   ├── ui/                 # Button, Card, ErrorBoundary, ResponsiveModal, SearchableSelect, …
│   ├── planner/            # PlannerGrid, PlanEntryForm (the 4-type slot picker)
│   ├── grocery/            # GroceryListItems
│   ├── GroceryListModal.tsx, Add*Modal.tsx, Mobile*View.tsx
├── hooks/queries/          # usePlannerData, useGroceryList (TanStack Query)
└── services/               # pantry / groceryList / recipe / planner / preferences

schema.sql                  # canonical schema for a fresh DB (tables, seed, RLS)
supabase/migrations/        # incremental SQL for an existing DB (redesign + cleanup)
```

`AGENTS.md` documents the engineering conventions expected of contributors.

---

## Known limitations & architectural notes

Addressed in the recent redesign: authentication + RLS, silent ingredient-loss on scheduling, the
polymorphic meal-plan reference (now typed FKs), shopping-list aggregation, single-item / list / note
planning, decoupled recipes & lists, and the duplicated planner config. Remaining notes:

- **Single shared account.** There is intentionally no per-user data or multi-tenant model; everyone
  who logs in sees the same household data. RLS only distinguishes authenticated vs anonymous.
- **Cooking Mode for non-recipes.** Only Recipe entries are cookable in the UI; navigating directly to
  a cooking URL for a non-recipe entry shows an empty state. Acceptable, not guarded.
- **Some `any` remains** in deeply-nested Supabase query result rows (e.g. planner/cooking views).
  Touched files were typed where practical; the embedded-relation shapes are left loosely typed.
- **`npm run lint` is broken** by a flat-config/plugin version mismatch in `eslint.config.js`
  (pre-existing). Type safety is enforced via `tsc -b` instead.
- **Voice feedback save is a stub** (`AdminPage`); the transcript is discarded.
- **Vector search is unused.** The pgvector migration and `match_*` functions exist and are typed, but
  no application code generates embeddings or calls them. Wire it up or drop the migration.
- **`xlsx` dependency appears unused** in `src/` (leftover from one-time import scripts).
- **UX/visual** improvements (lower-friction editing, warmer visual language) are catalogued in
  `ux_review.md` / `ui_review.md`.
```
