import { supabase } from '../lib/supabase';

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner';
export type DinerType = 'Parents' | 'Children' | 'Everyone';
export type EntryType = 'Recipe' | 'Item' | 'List' | 'Note';

export interface PlanEntryInput {
    date: string;
    slot: MealSlot;
    dinerType: DinerType;
    entryType: EntryType;
    recipeId?: string;
    listId?: string;
    groceryTypeId?: string;
    quantity?: number;
    unit?: string;
    noteText?: string;
    servings?: number;
}

/** A plan entry without the slot coordinates (which the planner supplies). */
export type PlanEntryDraft = Omit<PlanEntryInput, 'date' | 'slot' | 'dinerType'>;

type ShoppingInsert = {
    meal_plan_entry_id: string;
    recipe_id?: string | null;
    grocery_type_id: string | null;
    quantity: number;
    unit: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const plannerService = {
    /**
     * Recipes available to schedule (non-archived), with base servings for scaling.
     */
    async getRecipesForPicker() {
        const { data, error } = await supabase
            .from('recipes')
            .select('id, name, servings')
            .eq('is_archived', false)
            .order('name');
        if (error) throw error;
        return data ?? [];
    },

    /**
     * Create a typed meal-plan entry and snapshot the resulting groceries into the
     * shopping ledger. Snapshot failures throw (so the caller can surface them) rather
     * than silently leaving a meal with no ingredients on the list.
     */
    async addPlanEntry(entry: PlanEntryInput) {
        const { data: created, error } = await supabase
            .from('meal_plan_entries')
            .insert({
                date: entry.date,
                slot: entry.slot,
                diner_type: entry.dinerType,
                entry_type: entry.entryType,
                recipe_id: entry.entryType === 'Recipe' ? entry.recipeId : null,
                list_id: entry.entryType === 'List' ? entry.listId : null,
                item_grocery_type_id: entry.entryType === 'Item' ? entry.groceryTypeId : null,
                quantity: entry.entryType === 'Item' ? entry.quantity ?? 1 : null,
                unit: entry.entryType === 'Item' ? entry.unit ?? 'item' : null,
                note_text: entry.entryType === 'Note' ? entry.noteText ?? '' : null,
                servings: entry.entryType === 'Recipe' ? entry.servings ?? null : null,
            })
            .select()
            .single();
        if (error) throw error;

        if (entry.entryType === 'Recipe') {
            const { data: recipe, error: rErr } = await supabase
                .from('recipes')
                .select('servings, ingredients:recipe_ingredients (grocery_type_id, quantity, unit)')
                .eq('id', entry.recipeId!)
                .single();
            if (rErr) throw rErr;

            const base = recipe.servings || 4;
            const target = entry.servings || base;
            const factor = base > 0 ? target / base : 1;
            const ings = (recipe.ingredients ?? []) as {
                grocery_type_id: string | null;
                quantity: number | null;
                unit: string | null;
            }[];

            const rows: ShoppingInsert[] = ings
                .filter(i => i.grocery_type_id)
                .map(i => ({
                    meal_plan_entry_id: created.id,
                    recipe_id: entry.recipeId,
                    grocery_type_id: i.grocery_type_id,
                    quantity: round2((i.quantity || 1) * factor),
                    unit: i.unit || 'item',
                }));

            if (rows.length > 0) {
                const { error: insErr } = await supabase.from('shopping_list_items').insert(rows);
                if (insErr) throw insErr;
            }
        } else if (entry.entryType === 'Item') {
            const { error: insErr } = await supabase.from('shopping_list_items').insert({
                meal_plan_entry_id: created.id,
                grocery_type_id: entry.groceryTypeId!,
                quantity: entry.quantity ?? 1,
                unit: entry.unit ?? 'item',
            });
            if (insErr) throw insErr;
        } else if (entry.entryType === 'List') {
            const { data: items, error: lErr } = await supabase
                .from('grocery_list_items')
                .select('grocery_type_id, quantity, unit')
                .eq('list_id', entry.listId!)
                .eq('is_archived', false);
            if (lErr) throw lErr;

            const rows: ShoppingInsert[] = (items ?? [])
                .filter(i => i.grocery_type_id)
                .map(i => ({
                    meal_plan_entry_id: created.id,
                    grocery_type_id: i.grocery_type_id,
                    quantity: i.quantity ?? 1,
                    unit: i.unit ?? 'item',
                }));

            if (rows.length > 0) {
                const { error: insErr } = await supabase.from('shopping_list_items').insert(rows);
                if (insErr) throw insErr;
            }
        }
        // 'Note' entries add nothing to the shopping list.

        return created;
    },

    async deletePlanEntry(entryId: string) {
        // shopping_list_items cascade-delete via FK
        const { error } = await supabase.from('meal_plan_entries').delete().eq('id', entryId);
        if (error) throw error;
    },

    /**
     * Plan entries for a date range, with the referenced recipe/list/item names embedded
     * so the planner/cooking views can render labels without a separate lookup.
     */
    async getPlanForRange(startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .select(`
                *,
                recipe:recipes (id, name),
                list:grocery_lists (id, name),
                item:grocery_types (id, name)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date');
        if (error) throw error;
        return data;
    },

    /**
     * Persistent shopping ledger (non-archived), with source meal + grocery metadata.
     */
    async getShoppingList() {
        const { data, error } = await supabase
            .from('shopping_list_items')
            .select(`
                *,
                recipe: recipes (name),
                grocery_types (
                    id,
                    name,
                    category: grocery_categories (name),
                    store: stores (id, name)
                ),
                meal_plan: meal_plan_entries (
                    date,
                    slot,
                    diner_type
                )
            `)
            .eq('is_archived', false)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async toggleItemStatus(itemId: string, field: 'is_purchased' | 'is_in_stock', value: boolean) {
        const { data, error } = await supabase
            .from('shopping_list_items')
            .update({ [field]: value })
            .eq('id', itemId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Bulk-set a status field across several ledger rows (used when toggling an
     * aggregated shopping-list row that represents multiple underlying items).
     */
    async setItemsStatus(itemIds: string[], field: 'is_purchased' | 'is_in_stock', value: boolean) {
        if (itemIds.length === 0) return;
        const { error } = await supabase
            .from('shopping_list_items')
            .update({ [field]: value })
            .in('id', itemIds);
        if (error) throw error;
    },

    async archivePurchased() {
        const { error } = await supabase
            .from('shopping_list_items')
            .update({ is_archived: true })
            .eq('is_purchased', true);
        if (error) throw error;
    },

    /**
     * Add a manual item to the shopping list (not tied to a meal plan).
     */
    async addManualItem(groceryTypeId: string, quantity: number, unit: string) {
        const { data, error } = await supabase
            .from('shopping_list_items')
            .insert({
                grocery_type_id: groceryTypeId,
                quantity,
                unit,
                meal_plan_entry_id: null,
                recipe_id: null,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async addListItemsToShoppingList(listId: string) {
        const { data: listItems, error: fetchError } = await supabase
            .from('grocery_list_items')
            .select('grocery_type_id, quantity, unit')
            .eq('list_id', listId)
            .eq('is_archived', false);
        if (fetchError) throw fetchError;
        if (!listItems || listItems.length === 0) return;

        const itemsToInsert = listItems
            .filter(item => item.grocery_type_id)
            .map(item => ({
                grocery_type_id: item.grocery_type_id,
                quantity: item.quantity ?? 1,
                unit: item.unit ?? 'item',
                is_purchased: false,
                is_in_stock: false,
                meal_plan_entry_id: null,
                recipe_id: null,
            }));

        const { error: insertError } = await supabase.from('shopping_list_items').insert(itemsToInsert);
        if (insertError) throw insertError;
    },
};
