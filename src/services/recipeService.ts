import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Recipe = Database['public']['Tables']['recipes']['Row'];

export interface RecipeSummary {
    id: string;
    name: string;
    category: string | null;
    servings: number | null;
    total_time_mins: number | null;
    web_source: string | null;
    itemCount: number;
}

export const recipeService = {
    /**
     * List all (non-archived) recipes with their ingredient counts, for the recipe library.
     */
    async getRecipes(): Promise<RecipeSummary[]> {
        const { data, error } = await supabase
            .from('recipes')
            .select(`
                id, name, category, servings, total_time_mins, web_source,
                ingredients:recipe_ingredients(count)
            `)
            .eq('is_archived', false)
            .order('name');
        if (error) throw error;

        return (data ?? []).map(r => {
            const counts = r.ingredients as unknown as { count: number }[];
            return {
                id: r.id,
                name: r.name,
                category: r.category,
                servings: r.servings,
                total_time_mins: r.total_time_mins,
                web_source: r.web_source,
                itemCount: counts?.[0]?.count ?? 0,
            };
        });
    },

    async createRecipe(name: string, instructions: string, servings: number) {
        const { data, error } = await supabase
            .from('recipes')
            .insert({ name, instructions, servings, category: 'other' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateRecipe(
        recipeId: string,
        updates: Partial<Pick<Recipe, 'name' | 'instructions' | 'servings' | 'web_source' | 'category'>>
    ) {
        const { error } = await supabase.from('recipes').update(updates).eq('id', recipeId);
        if (error) throw error;
    },

    async updateRecipeCategory(recipeId: string, category: string) {
        const { error } = await supabase.from('recipes').update({ category }).eq('id', recipeId);
        if (error) throw error;
    },

    /**
     * Soft-delete a recipe (and let its meal-plan/shopping references cascade via FK).
     */
    async archiveRecipe(recipeId: string) {
        const { error } = await supabase.from('recipes').update({ is_archived: true }).eq('id', recipeId);
        if (error) throw error;
    },

    /**
     * Fetch a single recipe with its ingredients (from recipe_ingredients).
     */
    async getRecipe(recipeId: string) {
        const { data, error } = await supabase
            .from('recipes')
            .select(`
                *,
                ingredients:recipe_ingredients (
                    id, grocery_type_id, quantity, unit,
                    grocery_type:grocery_types (name)
                )
            `)
            .eq('id', recipeId)
            .single();
        if (error) throw error;
        return data;
    },

    async addIngredientToRecipe(recipeId: string, groceryTypeId: string, quantity: number, unit: string) {
        const { data, error } = await supabase
            .from('recipe_ingredients')
            .insert({ recipe_id: recipeId, grocery_type_id: groceryTypeId, quantity, unit })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateIngredient(ingredientId: string, updates: { quantity?: number; unit?: string }) {
        const { error } = await supabase.from('recipe_ingredients').update(updates).eq('id', ingredientId);
        if (error) throw error;
    },

    async removeIngredient(ingredientId: string) {
        const { error } = await supabase.from('recipe_ingredients').delete().eq('id', ingredientId);
        if (error) throw error;
    },
};
