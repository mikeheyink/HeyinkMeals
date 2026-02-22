# HeyinkMeals — Comprehensive Codebase Review

## 1. Project Root Hygiene — Critical

### 1.1 Ad-hoc Scripts Polluting the Root
The project root contains **10 one-off TypeScript files** that were used during initial setup, data migration, or debugging and have no ongoing purpose:

| File | Purpose | Status |
|---|---|---|
| `check-migration.ts` | Checks if `shopping_list_items` table exists | **One-time — delete** |
| `clear-database.ts` | Wipes all data from tables | **Dangerous — delete or move** |
| `diag-recipes.ts` | Prints all recipe names from DB | **Diagnostic — delete** |
| `fix-ingredients-suffix.ts` | Removes " Ingredients" suffix from list names | **One-time data fix — delete** |
| `import-recipes.ts` | Imports recipes from CSV files | **One-time — delete** |
| `inspect-db.ts` | Prints categories, types, lists, recipes | **Diagnostic — delete** |
| `inspect-excel.ts` | Reads headers from an Excel file | **Diagnostic — delete** |
| `seed-example-recipes.ts` | Seeds 5 example recipes | **One-time — delete** |
| `seed-test-data.ts` | Seeds 3 test recipes | **One-time — delete** |
| `test-db.ts` | Tests Supabase connection | **Diagnostic — delete** |
| `update-categories.ts` | Updates grocery categories | **One-time — delete** |

**Proposed Action:** Delete all 11 files. If any scripts might be needed again (e.g., `import-recipes.ts`), move them to a `scripts/legacy/` folder and add it to `.gitignore`.

### 1.2 Stale Documentation in Root
| File | Status |
|---|---|
| `handoff_magic_import.md` | Debugging log for a failed Edge Function deployment. **Delete.** |
| `implementation_plan.md` | Old implementation plan from initial build. **Delete.** |
| `user_stories.md` | Original user stories — all items still unchecked. **Either update or delete.** |
| `schema_design.md` | Appears to be an early design doc. Review and either update or delete. |
| `task.md` | Old task tracking file. **Delete.** |
| `build_log.txt` | Stale build log. **Delete.** |

### 1.3 Empty / Unnecessary Directories & Files
| Item | Status |
|---|---|
| `scripts/` (empty directory) | **Delete** |
| `src/pages/Recipes.tsx` (0 bytes, empty file) | **Delete** — the actual recipe pages live in `src/pages/recipes/` |
| `import/` directory | Contains `.xlsx` and `.ts` import files used during initial data seeding. **Delete or move to `scripts/legacy/`.** |

### 1.4 Package Name
`package.json` still has `"name": "temp_app"`. Should be renamed to `"heyink-meals"`.

---

## 2. Dead Code & Duplication

### 2.1 Unused Type Definitions (`src/types/index.ts`)
This 73-line file defines interfaces for `GroceryCategory`, `Store`, `GroceryType`, `GroceryList`, `Recipe`, `MealPlanEntry`, etc. — yet **it is imported by zero files** in the entire `src/` directory. Every component and service uses inline types or `any` instead.

**Proposed Action:** Delete `src/types/index.ts` entirely. Replace with auto-generated Supabase types (see Section 4).

### 2.2 Duplicate `listService` in `recipeService.ts`
`recipeService.ts` exports two objects: `listService` and `recipeService`. The `listService` within `recipeService.ts` duplicates functionality that exists in `groceryListService.ts`. It is only imported by `AddFromListModal.tsx`.

**Proposed Action:** Migrate `AddFromListModal.tsx` to use `groceryListService` and remove the duplicate `listService` from `recipeService.ts`.

### 2.3 Duplicate `DEFAULT_PLANNER_CONFIG`
The default planner config (`[{id: 'Everyone', ...}, ...]`) is defined identically in both `PlannerPage.tsx` (line 15) and `preferencesService.ts` (line 8).

**Proposed Action:** Remove the duplicate from `PlannerPage.tsx` and import it from `preferencesService.ts`.

### 2.4 Duplicate Type Aliases
`plannerService.ts` re-declares `MealSlot`, `DinerType`, and `PlanType` as local type aliases (lines 4-6), which are also defined (differently named) in `types/index.ts`. Neither references the other.

**Proposed Action:** Define canonical types once and import everywhere.

---

## 3. State Management & Data Fetching

### 3.1 No Caching / Global State Layer
Components like `PlannerPage` manually orchestrate data refetching (`loadData(days[0], days[10])`) after every single mutation. There is no global caching, background revalidation, or optimistic update mechanism.

**Risk:** Over-fetching (unnecessary database reads/costs), and no optimistic UI (users wait for full network roundtrips before seeing changes reflected).

**Proposed Action:** Adopt **TanStack Query (React Query)** to handle all remote state with automatic caching and stale-while-revalidate.

### 3.2 Excessive `any` Usage
| File | Example |
|---|---|
| `PlannerPage.tsx` | `useState<any[]>([])` for `plans` and `recipes` |
| `GroceryListModal.tsx` | `useState<any[]>([])` for `groceries` |
| `groceryListService.ts` | `(list.items as any)?.[0]?.count` |
| `plannerService.ts` | `(recipe.grocery_list as any).is_archived` |
| `MobileCookingView.tsx` | `plans: any[]`, `recipes: any[]` props |

**Risk:** TypeScript's safety net is completely bypassed. Schema changes in Supabase will cause silent runtime failures.

**Proposed Action:** Generate Supabase types via `supabase gen types typescript` and use them throughout all services and components.

---

## 4. Component Architecture

### 4.1 "God Components"
`PlannerPage.tsx` is ~575 lines and handles: data fetching, state management, preference loading, debounced persistence, mobile/desktop conditional rendering, recipe creation modal state, and the entire desktop grid rendering logic.

`GroceryListModal.tsx` is ~520 lines and handles: data fetching, CRUD for items, edit mode state, recipe linking, delete confirmation, error state, and the add-grocery sub-modal.

**Proposed Action:** Extract business logic into custom hooks (`usePlannerData`, `useGroceryListMutations`). Split rendering into focused sub-components.

---

## 5. Error Handling

### 5.1 No Error Boundaries
There are no React Error Boundaries anywhere in the component tree. An unhandled exception in any component will crash the entire application with a blank white screen.

### 5.2 No Global Toast/Notification System
User-visible error messages rely on per-component `useState<string | null>(null)` error state. Success feedback is entirely absent — the user has no confirmation that actions completed.

**Proposed Action:** Add a root-level `<ErrorBoundary>` and integrate a toast library (e.g., `sonner`).

---

## 6. Proposed Folder Structure

### Current (Messy)
```
/
├── check-migration.ts      ← ad-hoc script
├── clear-database.ts       ← ad-hoc script
├── diag-recipes.ts         ← ad-hoc script
├── fix-ingredients-suffix.ts ← ad-hoc script
├── import-recipes.ts       ← ad-hoc script
├── inspect-db.ts           ← ad-hoc script
├── inspect-excel.ts        ← ad-hoc script
├── seed-example-recipes.ts ← ad-hoc script
├── seed-test-data.ts       ← ad-hoc script
├── test-db.ts              ← ad-hoc script
├── update-categories.ts    ← ad-hoc script
├── handoff_magic_import.md ← stale doc
├── implementation_plan.md  ← stale doc
├── user_stories.md         ← stale doc
├── build_log.txt           ← stale log
├── schema_design.md        ← stale doc
├── task.md                 ← stale doc
├── import/                 ← one-time import data
├── scripts/                ← empty
├── src/
│   ├── pages/
│   │   ├── Recipes.tsx     ← empty file (0 bytes)
│   │   └── ...
│   └── types/
│       ├── index.ts        ← unused (0 imports)
│       └── supabase.ts
└── ...
```

### Proposed (Clean)
```
/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   └── types/
│       └── supabase.ts     ← auto-generated
├── supabase/
├── tests/
├── schema.sql
├── package.json
├── vite.config.ts
├── tsconfig*.json
├── eslint.config.js
├── vercel.json
├── index.html
├── .env
├── .gitignore
└── README.md               ← updated with real project docs
```

Everything else gets deleted.

---

## Summary of Priority Actions

| Priority | Action | Files Affected |
|---|---|---|
| **P0** | Delete 11 ad-hoc root scripts | Root directory |
| **P0** | Delete stale docs (`handoff_magic_import.md`, `implementation_plan.md`, `build_log.txt`, `task.md`) | Root directory |
| **P0** | Delete empty `src/pages/Recipes.tsx` | `src/pages/` |
| **P0** | Delete or archive `import/` directory | Root directory |
| **P0** | Delete empty `scripts/` directory | Root directory |
| **P1** | Delete unused `src/types/index.ts` | `src/types/` |
| **P1** | Remove duplicate `listService` from `recipeService.ts` | `src/services/recipeService.ts`, `src/components/AddFromListModal.tsx` |
| **P1** | Remove duplicate `DEFAULT_PLANNER_CONFIG` | `src/pages/planner/PlannerPage.tsx` |
| **P1** | Rename package from `temp_app` to `heyink-meals` | `package.json` |
| **P2** | Add Error Boundary + Toast notifications | New components |
| **P2** | Generate and enforce Supabase TypeScript types | `src/types/`, all services |
| **P3** | Adopt React Query for data fetching | All services and page components |
| **P3** | Break down God Components | `PlannerPage.tsx`, `GroceryListModal.tsx` |
