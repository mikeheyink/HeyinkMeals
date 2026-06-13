// Helpers for rendering meal-plan entries, which can be a Recipe, single Item, List, or Note.
// Plan rows from plannerService.getPlanForRange embed the referenced recipe/list/item names.

export interface PlanEntryLike {
    entry_type?: string | null;
    note_text?: string | null;
    quantity?: number | null;
    unit?: string | null;
    recipe?: { id: string; name: string } | null;
    list?: { id: string; name: string } | null;
    item?: { id: string; name: string } | null;
}

/** Human-readable label for a plan entry, regardless of its type. */
export function planEntryLabel(plan: PlanEntryLike): string {
    switch (plan.entry_type) {
        case 'Recipe':
            return plan.recipe?.name ?? 'Recipe';
        case 'List':
            return plan.list?.name ?? 'List';
        case 'Item':
            return plan.item?.name ?? 'Item';
        case 'Note':
            return plan.note_text ?? 'Note';
        default:
            // Fallback for any pre-migration / unexpected row.
            return plan.recipe?.name ?? plan.list?.name ?? plan.item?.name ?? plan.note_text ?? 'Unknown';
    }
}

/** Only Recipe entries can be opened in Cooking Mode. */
export function isCookable(plan: PlanEntryLike): boolean {
    return plan.entry_type === 'Recipe' && !!plan.recipe;
}
