// Structured cooking steps (recipes.steps). Each step names the ingredients it uses so Cooking Mode
// can show a focused card: what to do + exactly what you need for it. Shape documented in
// supabase/migrations/20261003_recipe_image_and_steps.sql and docs/claude/recipes.md.

import type { Json } from '../types/supabase';

export interface StepIngredientRef {
    /** recipe_ingredients.id */
    ingredient_id: string;
    /** Only set when the step uses part of the ingredient; otherwise the full amount applies. */
    quantity?: number;
    unit?: string;
}

export interface RecipeStep {
    text: string;
    ingredients: StepIngredientRef[];
    timer_minutes?: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

function parseRef(raw: unknown): StepIngredientRef | null {
    if (!isRecord(raw) || typeof raw.ingredient_id !== 'string') return null;
    const ref: StepIngredientRef = { ingredient_id: raw.ingredient_id };
    if (typeof raw.quantity === 'number') ref.quantity = raw.quantity;
    if (typeof raw.unit === 'string') ref.unit = raw.unit;
    return ref;
}

/** Narrow the stored JSON into steps, dropping anything malformed rather than crashing the cook. */
export function parseSteps(raw: Json | undefined): RecipeStep[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
        if (!isRecord(item) || typeof item.text !== 'string' || !item.text.trim()) return [];
        const refs = Array.isArray(item.ingredients) ? item.ingredients : [];
        const step: RecipeStep = {
            text: item.text.trim(),
            ingredients: refs.map(parseRef).filter((r): r is StepIngredientRef => r !== null),
        };
        if (typeof item.timer_minutes === 'number' && item.timer_minutes > 0) step.timer_minutes = item.timer_minutes;
        return [step];
    });
}

/**
 * Fallback for recipes that only have free-text instructions: one step per paragraph (or per line
 * when there are no blank lines), with any leading "1." / "Step 1:" numbering stripped.
 */
export function stepsFromInstructions(instructions: string | null | undefined): RecipeStep[] {
    const text = (instructions ?? '').replace(/\r\n/g, '\n').trim();
    if (!text) return [];
    const chunks = /\n\s*\n/.test(text) ? text.split(/\n\s*\n/) : text.split('\n');
    return chunks
        .map(c => c.replace(/^\s*(step\s*)?\d+[.):]\s*/i, '').trim())
        .filter(Boolean)
        .map(c => ({ text: c, ingredients: [] }));
}

/** Plain-text rendering kept in recipes.instructions so older views still read sensibly. */
export function stepsToInstructions(steps: RecipeStep[]): string {
    return steps.map(s => s.text.trim()).filter(Boolean).join('\n\n');
}

/** Steps to cook from: the structured ones when present, else derived from the instructions. */
export function cookingSteps(raw: Json | undefined, instructions: string | null | undefined): RecipeStep[] {
    const steps = parseSteps(raw);
    return steps.length > 0 ? steps : stepsFromInstructions(instructions);
}

/** Converts StepIngredientRef[] → JSON for storage (keeps the payload free of undefined keys). */
export function stepsToJson(steps: RecipeStep[]): Json {
    return steps.map(s => ({
        text: s.text,
        ingredients: s.ingredients.map(r => ({
            ingredient_id: r.ingredient_id,
            ...(r.quantity != null ? { quantity: r.quantity } : {}),
            ...(r.unit ? { unit: r.unit } : {}),
        })),
        ...(s.timer_minutes ? { timer_minutes: s.timer_minutes } : {}),
    }));
}
