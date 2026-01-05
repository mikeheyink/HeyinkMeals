export type MeasurementUnit = 'g' | 'kg' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'item' | 'pkg';

// --- Reference Data ---

export interface GroceryCategory {
    id: string;
    name: string;
    sortOrder: number;
}

export interface Store {
    id: string;
    name: string;
}

export interface GroceryType {
    id: string;
    name: string;
    categoryId: string; // References GroceryCategory.id
    defaultStoreId?: string; // References Store.id
}

// --- Collections ---

export interface GroceryListItem {
    id: string; // Unique ID for the item in the list
    groceryTypeId: string; // References GroceryType.id
    quantity: number;
    unit: string; // Could be free text or MeasurementUnit
    isPurchased: boolean;
    isInStock: boolean;
}

export interface GroceryList {
    id: string;
    name: string;
    items: GroceryListItem[];
}

export interface NutritionInfo {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
}

export interface Recipe {
    id: string;
    name: string;
    instructions: string; // Markdown supported
    servings: number;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    ingredients: GroceryList; // Encapsulated list of ingredients
    nutrition?: NutritionInfo;
    estimatedCost?: number;
}

// --- The Plan ---

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner';
export type DinerType = 'Parents' | 'Children' | 'Everyone';
export type MealPlanType = 'Recipe' | 'AdHocList';

export interface MealPlanEntry {
    id: string;
    date: string; // ISO 8601 Date string (YYYY-MM-DD)
    slot: MealSlot;
    dinerType: DinerType;
    type: MealPlanType;
    referenceId: string; // ID of the Recipe or GroceryList
}
