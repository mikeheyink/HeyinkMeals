import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type GroceryType = Database['public']['Tables']['grocery_types']['Row'];


export const pantryService = {

    // --- Categories ---

    async getCategories() {
        const { data, error } = await supabase
            .from('grocery_categories')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data;
    },

    async addCategory(name: string, sortOrder: number = 99) {
        const { data, error } = await supabase
            .from('grocery_categories')
            .insert({ name, sort_order: sortOrder })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Groceries ---

    async getGroceries() {
        const { data, error } = await supabase
            .from('grocery_types')
            .select(`
        *,
        grocery_categories (name),
        stores (name)
      `)
            .order('name');

        if (error) throw error;
        return data;
    },

    async addGrocery(name: string, categoryId: string, defaultStoreId?: string) {
        const { data, error } = await supabase
            .from('grocery_types')
            .insert({
                name,
                category_id: categoryId,
                default_store_id: defaultStoreId
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteGrocery(id: string) {
        const { error } = await supabase
            .from('grocery_types')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async updateGrocery(id: string, updates: Partial<GroceryType>) {
        const { data, error } = await supabase
            .from('grocery_types')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
