import type { LucideIcon } from 'lucide-react';
import { Apple, ShoppingBasket, UtensilsCrossed } from 'lucide-react';
import type { GroceryListKind } from '../../services/groceryListService';

/**
 * The three list groups (grocery_lists.kind), in display order. `short` labels the per-card picker.
 * Only shopping lists start open.
 */
export const LIST_KINDS: { key: GroceryListKind; label: string; short: string; icon: LucideIcon; openByDefault: boolean }[] = [
    { key: 'shopping', label: 'Shopping lists', short: 'Shopping', icon: ShoppingBasket, openByDefault: true },
    { key: 'meal', label: 'Meals & snacks', short: 'Meal', icon: UtensilsCrossed, openByDefault: false },
    { key: 'single', label: 'Single items', short: 'Single', icon: Apple, openByDefault: false },
];
