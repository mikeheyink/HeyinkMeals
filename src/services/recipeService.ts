import { supabase } from '../lib/supabase';
import { groceryListService } from './groceryListService';


export const recipeService = {

    async createRecipe(name: string, instructions: string, servings: number) {
        // 1. Create a Grocery List first to hold ingredients
        const { data: listData, error: listError } = await supabase
            .from('grocery_lists')
            .insert({ name })
            .select()
            .single();

        if (listError) throw listError;

        // 2. Create the Recipe linking to that list
        const { data, error } = await supabase
            .from('recipes')
            .insert({
                name,
                instructions,
                servings,
                ingredients_list_id: listData.id,
                category: 'other' // Default category
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async addIngredientToRecipe(recipeId: string, groceryTypeId: string, quantity: number, unit: string) {
        // 1. Get the recipe to find the ingredients_list_id
        const { data: recipe, error: fetchError } = await supabase
            .from('recipes')
            .select('ingredients_list_id')
            .eq('id', recipeId)
            .single();

        if (fetchError) throw fetchError;
        if (!recipe.ingredients_list_id) throw new Error('Recipe has no ingredients list linked');

        // 2. Add item to that list
        return groceryListService.addItem(recipe.ingredients_list_id, groceryTypeId, quantity, unit);
    },

    async updateRecipeCategory(recipeId: string, category: string) {
        const { error } = await supabase
            .from('recipes')
            .update({ category })
            .eq('id', recipeId);

        if (error) throw error;
    },

    async getRecipe(recipeId: string) {
        const { data, error } = await supabase
            .from('recipes')
            .select(`
            *,
            ingredients_list: grocery_lists (
                *,
                items: grocery_list_items (
                    *,
                    grocery_type: grocery_types (name)
                )
            )
        `)
            .eq('id', recipeId)
            .single();

        if (error) throw error;
        return data;
    }
};

