import { supabase, isUndefinedColumn } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Recipe = Database['public']['Tables']['recipes']['Row'];

export interface RecipeSummary {
    id: string;
    name: string;
    category: string | null;
    servings: number | null;
    total_time_mins: number | null;
    web_source: string | null;
    isFavourite: boolean;
    itemCount: number;
}

/** The shape both library queries below return, before it becomes a RecipeSummary. */
interface RecipeSummaryRow {
    id: string;
    name: string;
    category: string | null;
    servings: number | null;
    total_time_mins: number | null;
    web_source: string | null;
    ingredients: unknown;
}

const toSummary = (row: RecipeSummaryRow, isFavourite: boolean): RecipeSummary => {
    const counts = row.ingredients as { count: number }[];
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        servings: row.servings,
        total_time_mins: row.total_time_mins,
        web_source: row.web_source,
        isFavourite,
        itemCount: counts?.[0]?.count ?? 0,
    };
};

export const recipeService = {
    /**
     * List all (non-archived) recipes with their ingredient counts, for the recipe library.
     */
    async getRecipes(): Promise<RecipeSummary[]> {
        const { data, error } = await supabase
            .from('recipes')
            .select(`
                id, name, category, servings, total_time_mins, web_source, is_favourite,
                ingredients:recipe_ingredients(count)
            `)
            .eq('is_archived', false)
            .order('name');

        // A database that hasn't had the favourites migration applied yet: retry
        // without the column so the library still loads, with nothing starred.
        if (isUndefinedColumn(error)) {
            const legacy = await supabase
                .from('recipes')
                .select(`
                    id, name, category, servings, total_time_mins, web_source,
                    ingredients:recipe_ingredients(count)
                `)
                .eq('is_archived', false)
                .order('name');
            if (legacy.error) throw legacy.error;
            return (legacy.data ?? []).map(r => toSummary(r, false));
        }
        if (error) throw error;

        return (data ?? []).map(r => toSummary(r, !!r.is_favourite));
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

    /**
     * Star or un-star a recipe. Favourites are household-wide (matching the rest of
     * the data model) and drive the "Favourites" filters in the library and planner.
     */
    async setRecipeFavourite(recipeId: string, isFavourite: boolean) {
        const { error } = await supabase.from('recipes').update({ is_favourite: isFavourite }).eq('id', recipeId);
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
