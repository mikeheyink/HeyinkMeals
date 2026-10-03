// The household's canonical (South African metric) units — the single source of truth for every
// unit picker. docs/claude/recipes.md explains when to use each one; keep the two in sync.

export const UNITS = [
    'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup',
    'item', 'clove', 'tin', 'bunch', 'handful', 'packet', 'slice', 'pinch', 'to taste',
] as const;

export type Unit = (typeof UNITS)[number];

/** Unit pre-selected when adding something new. */
export const DEFAULT_UNIT: Unit = 'item';

/** Count units read better pluralised ("4 cloves"); metric abbreviations never change. */
const PLURALS: Record<string, string> = {
    cup: 'cups', clove: 'cloves', tin: 'tins', bunch: 'bunches', handful: 'handfuls',
    packet: 'packets', slice: 'slices', pinch: 'pinches',
};

const FRACTIONS: [number, string][] = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']];

/** 1.5 → "1½", 0.33 → "⅓", 125 → "125". Keeps decimals for anything a fraction can't express. */
export function formatQuantity(quantity: number): string {
    const whole = Math.floor(quantity);
    const rest = quantity - whole;
    if (rest < 0.01) return String(whole);
    const fraction = FRACTIONS.find(([value]) => Math.abs(rest - value) < 0.02);
    if (fraction) return `${whole || ''}${fraction[1]}`;
    return String(Math.round(quantity * 100) / 100);
}

/**
 * Human-friendly amount for an ingredient line: "2 tbsp", "3" (countable items), "to taste".
 * Returns an empty string when there is nothing meaningful to show.
 */
export function formatAmount(quantity: number | null | undefined, unit: string | null | undefined): string {
    if (unit === 'to taste') return 'to taste';
    if (quantity == null || quantity <= 0) return '';
    const amount = formatQuantity(quantity);
    if (!unit || unit === 'item') return amount;
    return `${amount} ${quantity > 1 ? PLURALS[unit] ?? unit : unit}`;
}
