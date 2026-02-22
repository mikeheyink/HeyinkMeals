# HeyinkMeals UX & Ergonomics Review

From the perspective of product design and digital ergonomics, the current application provides a functional baseline but suffers from high "interaction cost" (too many clicks/taps required for core workflows) and inconsistent paradigms between mobile and desktop. 

Here is a detailed breakdown of weaknesses and a prioritized action plan to improve the user experience.

## Desktop Experience Weaknesses

1. **Information Density in the Planner:**
   - **Issue:** The Desktop Planner uses a rigid spreadsheet grid. While this is data-dense, it is cognitively overwhelming. The "Add Recipe" flow occurs inline within tiny cell targets, creating a cramped and claustrophobic interaction. 
   - **Ergonomic Fix:** Move away from inline editing within the grid. Clicking a cell should open a spacious right-hand slide-over (drawer) where the user can view the day's full context, search recipes with large thumbnails, and adjust servings comfortably without breaking the table layout.

2. **Modal Fatigue in Core Workflows:**
   - **Issue:** The `GroceryListModal` tries to do too much. Users have to explicitly enter an "edit mode", save line items, or confirm deletions. Grocery shopping is a rapid-fire mental activity; friction here is extremely frustrating.
   - **Ergonomic Fix:** Eliminate the "Save" button for quantity updates. Inputs should auto-save `onBlur` or use a simple `+ / -` stepper mechanism. Deletions should be instant with a brief "Undo" toast, eliminating confirmation modals for low-stakes actions.

3. **Navigation Taxonomy:**
   - **Issue:** The sidebar categorizes items rigidly into "Operations" and "Library". This terminology sounds like enterprise software, not a consumer meal planner.
   - **Ergonomic Fix:** Flatten the hierarchy. Use terms like "Plan", "Shop", "Cook", and "Recipes". 

## Mobile Experience Weaknesses

1. **Hidden Core Features (Hamburger Menu):**
   - **Issue:** On mobile, the bottom tab bar only holds "Operations" (Planner, Shopping, Cooking). Vital features like "Recipes" and "Pantry" are hidden behind an old-fashioned hamburger menu at the top right. 
   - **Ergonomic Fix:** Mobile users rely almost entirely on the bottom bar for thumb-reachability. "Recipes" must be in the bottom navigation tab. If you exceed 4-5 tabs, use a bottom sheet "More" tab, completely removing the unreachable top hamburger menu.

2. **Scroll Ergonomics & Missing Gestures:**
   - **Issue:** The horizontal date slider in `MobileCookingView` uses standard CSS overflow. Without CSS `scroll-snap-type`, users can accidentally leave a date chip half off-screen. Furthermore, list items in the Groceries view require tapping tiny icons to edit or delete.
   - **Ergonomic Fix:** Implement `scroll-snap-align` on the date strip so it magnetizes to complete days. For list items, implement native-feeling "Swipe to Delete" and "Swipe to Complete" gestures using Framer Motion. This transforms the app from a "web page" to an "app".

3. **Inauthentic "Native" Components:**
   - **Issue:** The mobile customizations menu uses a full-screen white overlay or a basic bottom sheet that cannot be swiped down to dismiss. It feels like a web modal, violating the mental models of iOS/Android users.
   - **Ergonomic Fix:** Use proper gesture-driven bottom sheets (e.g., via `vaul` or `framer-motion`) that support drag-to-dismiss and dynamic heights based on content.

---

## Prioritized Action Plan

### Tier 1: Immediate Friction Removals (Quick Wins)
1. **Auto-save & Steppers:** Replace the "Edit -> Save -> Close" flow in grocery lists with instant `+ / -` steppers and auto-saving text inputs.
2. **Bottom Bar Restructure:** Move "Recipes" into the mobile bottom navigation bar immediately, dropping the top hamburger menu.
3. **Scroll Snapping:** Add 3 lines of CSS (`scroll-snap-type: x mandatory`) to the mobile date strip to make it feel premium and tactile.

### Tier 2: Workflow Redesigns
4. **Desktop Planner Drawer:** Rip out the inline cell dropdowns for the Planner. Implement a slide-out right drawer for viewing and adding meals to a specific day.
5. **Swipe Gestures:** Implement swipe-to-delete/complete on all item lists (Groceries, Pantry) for mobile users to match native app expectations.
6. **"Undo" Toasts:** Remove all "Are you sure you want to delete?" modals for list items. Delete instantly, show a 5-second "Item removed. Undo" toast notification at the bottom of the screen.

### Tier 3: Terminology and Hierarchy
7. **Rename Navigation:** Change "Operations/Library" to a flat list: Plan, Shop, Cook, Recipes, Pantry.
8. **Native Bottom Sheets:** Replace custom mobile modals with gesture-responsive, draggable bottom sheets.
