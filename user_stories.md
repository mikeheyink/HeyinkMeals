# User Stories & Requirements

## Mode 1: Administration
*User Goal: Managing the database of ingredients, lists, and recipes.*

### 1.1 Grocery Items (The Basics)
- [ ] **Create Item**: I want to add a new grocery item with:
    - **Name** (e.g., "Basmati Rice")
    - **Category** (e.g., "Grains/Pasta" - mapping to supermarket aisle)
    - **Preferred Store** (e.g., "Woolworths")
- [ ] **Edit/Delete Item**: I want to update an item's details or remove it if no longer needed.

### 1.2 Grocery Lists (The Collections)
*A "List" acts as a container for groceries and their quantities. It can be a standalone list (e.g., "Weekly Essentials") or the ingredients for a specific recipe.*
- [ ] **Create List**: I want to create a named list of groceries.
- [ ] **Manage Content**: I want to add/remove grocery items to a list and set their **Quantity** (e.g., "500g", "2 items").
- [ ] **Edit/Delete List**: I want to rename or delete lists.

### 1.3 Recipes (The Instructions)
- [ ] **Create Recipe**: I want to define a comprehensive recipe including:
    - **Metadata**: Name, Servings, Prep Time, Cooking Time.
    - **Ingredients**: Linked to a specific **Grocery List** (defined above).
    - **Instructions**: Step-by-step cooking guide.
    - **Analytics**: Nutritional Information and Estimated Cost.
- [ ] **Manage Recipe**: I want to update instructions or tweak ingredient quantities.

---

## Mode 2: Meal Planning & Shopping
*User Goal: Scheduling meals and executing the shop.*

### 2.1 Planning (Scheduling)
- [ ] **Schedule Recipe**: I want to assign a **Recipe** (and its ingredients) to a specific:
    - **Date**
    - **Meal Slot** (Breakfast, Lunch, Dinner)
    - **Group** (Parents, Children, or Everyone)
- [ ] **Schedule Ad-hoc List**: I want to schedule a non-recipe **Grocery List** (e.g., "Sunday Cleaning") for a specific date/slot.
- [ ] **Manage Schedule**: I want to move or remove scheduled meals/lists if plans change.

### 2.2 Shopping (Execution)
- [ ] **View Shopping List**: I want to see a consolidated view of all groceries required for my planned period.
- [ ] **Process List**: I want to interact with items on the list:
    - **Mark In Stock**: "I already have this at home."
    - **Mark Purchased**: "I just put this in the trolley."

---

## Mode 3: Cooking
*User Goal: Executing the recipe.*

### 3.1 Cooking Mode
- [ ] **Cook View**: I want a distraction-free view of a Recipe that highlights instructions and ingredients.
