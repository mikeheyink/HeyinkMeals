import { supabase } from '../lib/supabase';

export interface GroceryListSummary {
    id: string;
    name: string;
    created_at: string;
    itemCount: number;
}

export const groceryListService = {
    /**
     * Simple id + name list (for dropdowns / pickers).
     */
    async getAllLists() {
        const { data, error } = await supabase
            .from('grocery_lists')
            .select('id, name')
            .eq('is_archived', false)
            .order('name');
        if (error) throw error;
        return data;
    },

    /**
     * All (non-archived) lists with their item counts, for the Lists library.
     */
    async getLists(): Promise<GroceryListSummary[]> {
        const { data, error } = await supabase
            .from('grocery_lists')
            .select(`id, name, created_at, items:grocery_list_items(count)`)
            .eq('is_archived', false)
            .order('name');
        if (error) throw error;

        return (data ?? []).map(list => {
            const items = list.items as unknown as { count: number }[];
            return {
                id: list.id,
                name: list.name,
                created_at: list.created_at ?? new Date().toISOString(),
                itemCount: items?.[0]?.count ?? 0,
            };
        });
    },

    async createList(name: string) {
        const { data, error } = await supabase
            .from('grocery_lists')
            .insert({ name })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async renameList(listId: string, name: string) {
        const { error } = await supabase.from('grocery_lists').update({ name }).eq('id', listId);
        if (error) throw error;
    },

    /**
     * Single list with its (non-archived) items.
     */
    async getGroceryListDetails(listId: string) {
        const { data: list, error } = await supabase
            .from('grocery_lists')
            .select(`
                id,
                name,
                created_at,
                is_archived,
                items:grocery_list_items (
                    id,
                    quantity,
                    unit,
                    is_purchased,
                    grocery_type:grocery_types (
                        id,
                        name,
                        category:grocery_categories (name)
                    )
                )
            `)
            .eq('id', listId)
            .eq('grocery_list_items.is_archived', false)
            .single();
        if (error) throw error;
        return { list };
    },

    async addItem(listId: string, groceryTypeId: string, quantity: number, unit: string) {
        const { data, error } = await supabase
            .from('grocery_list_items')
            .insert({ list_id: listId, grocery_type_id: groceryTypeId, quantity, unit })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateItem(itemId: string, updates: { quantity?: number; unit?: string }) {
        const { error } = await supabase.from('grocery_list_items').update(updates).eq('id', itemId);
        if (error) throw error;
    },

    /**
     * Soft-delete an item from a list.
     */
    async deleteItem(itemId: string): Promise<void> {
        const { error } = await supabase
            .from('grocery_list_items')
            .update({ is_archived: true })
            .eq('id', itemId);
        if (error) throw error;
    },

    /**
     * Soft-delete a list and archive its items.
     */
    async deleteGroceryList(listId: string): Promise<void> {
        const { error: itemsError } = await supabase
            .from('grocery_list_items')
            .update({ is_archived: true })
            .eq('list_id', listId);
        if (itemsError) throw itemsError;

        const { error: listError } = await supabase
            .from('grocery_lists')
            .update({ is_archived: true })
            .eq('id', listId);
        if (listError) throw listError;
    },
};
