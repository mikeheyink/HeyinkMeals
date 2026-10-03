// Helpers for Cooking Mode: scale a recipe to the planned servings and resolve which ingredients
// (and how much of each) a given step needs.

import { formatAmount } from './units';
import type { RecipeStep } from './recipeSteps';

export interface CookIngredient {
    id: string;
    quantity: number | null;
    unit: string | null;
    grocery_type: {
        name: string;
        category: { name: string; sort_order: number | null } | null;
    } | null;
}

export interface StepIngredientLine {
    id: string;
    name: string;
    amount: string;
}

/** Factor from the recipe's base servings to the servings planned for this meal. */
export function servingsFactor(plannedServings: number | null | undefined, baseServings: number | null | undefined): number {
    const base = baseServings && baseServings > 0 ? baseServings : null;
    if (!base || !plannedServings || plannedServings <= 0) return 1;
    return plannedServings / base;
}

/** "2 tbsp" for an ingredient scaled by `factor`. */
export function scaledAmount(quantity: number | null | undefined, unit: string | null | undefined, factor: number): string {
    return formatAmount(quantity == null ? quantity : quantity * factor, unit);
}

export const ingredientName = (ing: CookIngredient) => ing.grocery_type?.name ?? 'Unknown ingredient';

/**
 * The ingredient lines a step card shows. A step reference without its own quantity uses the
 * ingredient's full (scaled) amount; references to removed ingredients are skipped.
 */
export function stepIngredientLines(step: RecipeStep, ingredients: CookIngredient[], factor: number): StepIngredientLine[] {
    const byId = new Map(ingredients.map(i => [i.id, i]));
    return step.ingredients.flatMap(ref => {
        const ing = byId.get(ref.ingredient_id);
        if (!ing) return [];
        const amount = ref.quantity != null
            ? scaledAmount(ref.quantity, ref.unit ?? ing.unit, factor)
            : scaledAmount(ing.quantity, ing.unit, factor);
        return [{ id: ing.id, name: ingredientName(ing), amount }];
    });
}

export interface ZoneGroup {
    zone: string;
    items: CookIngredient[];
}

/** Ingredients grouped by kitchen zone, in walking order, so you fetch everything from one place at once. */
export function groupByZone(ingredients: CookIngredient[]): ZoneGroup[] {
    const groups = new Map<string, { order: number; items: CookIngredient[] }>();
    for (const ing of ingredients) {
        const zone = ing.grocery_type?.category?.name ?? 'Other';
        const order = ing.grocery_type?.category?.sort_order ?? 999;
        const group = groups.get(zone) ?? { order, items: [] };
        group.items.push(ing);
        groups.set(zone, group);
    }
    return [...groups.entries()]
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([zone, g]) => ({
            zone,
            items: g.items.sort((a, b) => ingredientName(a).localeCompare(ingredientName(b))),
        }));
}
