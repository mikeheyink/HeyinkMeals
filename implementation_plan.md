# HeyinkMeals Implementation Plan

## Goal Description
Build a premium, aesthetically pleasing web application to assist the household with meal planning, shopping lists, and recipe management.
**Status**: Logic Layer (Supabase Services) is complete and verified.
**Next Phase**: UI Implementation, following a strict domain-by-domain rollout.

## User Review Required
> [!IMPORTANT]
> **Sequential UI**: We will build the UI in the same order we built the logic: Pantry -> Recipes -> Planning.

## Proposed Changes

### 0. Core UI Setup
*Foundation for the app.*
#### [NEW] [src/components]
- `Layout.tsx`: Main shell with navigation.
- `App.tsx`: Routing configuration.
- `index.css`: Glassmorphism theme (already started).

### 1. Pantry UI
*User Stories 1.1 (Managing Ingredients)*
#### [NEW] [src/pages/pantry]
- `IngredientsPage.tsx`: View all ingredients, add new ones.
- **Verification**: User can see the list of ingredients we created in the test scripts.

### 2. Recipes & Lists UI
*User Stories 1.2 & 1.3 (Recipes)*
#### [NEW] [src/pages/recipes]
- `RecipeListPage.tsx`: Grid of recipes.
- `RecipeEditor.tsx`: Form to create a recipe and add ingredients.
- **Verification**: Create a new recipe via UI and see it in the DB.

### 4. Shopping List Refactor
*Implementing granular tracking per meal entry.*

#### [NEW] [Database]
- Create `shopping_list_items` table:
    - `id` (uuid)
    - `meal_plan_entry_id` (fk -> meal_plan_entries)
    - `recipe_id` (fk -> recipes, nullable)
    - `grocery_type_id` (fk -> grocery_types)
    - `quantity` (numeric)
    - `unit` (text)
    - `is_in_stock` (boolean, default false)
    - `is_purchased` (boolean, default false)
    - `is_archived` (boolean, default false)

#### [MODIFY] [src/services/plannerService.ts]
- **`addPlanEntry`**: After creating the meal plan entry, fetch the ingredients (from the recipe or list) and insert corresponding records into `shopping_list_items`.
- **`getShoppingList`**: Query `shopping_list_items` where `is_archived = false`, joining with `meal_plan_entries`, `recipes`, and `grocery_types` to show context.
- **`toggleItemStatus`**: Update `is_in_stock` or `is_purchased`.

#### [MODIFY] [src/pages/planner/ShoppingListPage.tsx]
- Change from on-the-fly generation to fetching from `shopping_list_items`.
- Add context display: "For [Recipe] on [Date] ([Meal Slot])".
- Implement status toggles.

## Verification Plan
### Manual Verification
1. Add a meal (e.g., Steak Salad) to the planner.
2. Go to Shopping List: verify ingredients appear with "Steak Salad" context.
3. Mark "Steak" as purchased: verify it disappears or dims (based on filters).
4. Verify recipe ingredients themselves remain untouched.

### Manual Verification
- For each phase, we will launch the app (`npm run dev`) and manually walk through the User Story (e.g., "Add an ingredient") to ensure the UI successfully calls the service.
