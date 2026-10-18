import type { GroceryListKind } from '../../services/groceryListService';

/**
 * The three list groups (grocery_lists.kind), in display order. `short` labels the per-card picker.
 * Only shopping lists start open.
 */
export const LIST_KINDS: { key: GroceryListKind; label: string; short: string; openByDefault: boolean }[] = [
    { key: 'shopping', label: 'Shopping lists', short: 'Shopping', openByDefault: true },
    { key: 'meal', label: 'Meals & snacks', short: 'Meal', openByDefault: false },
    { key: 'single', label: 'Single items', short: 'Single', openByDefault: false },
];
