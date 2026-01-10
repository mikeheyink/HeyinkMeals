import { supabase } from '../lib/supabase';


export const listService = {

    async createList(name: string) {
        const { data, error } = await supabase
            .from('grocery_lists')
            .insert({ name })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getAllLists() {
        const { data, error } = await supabase
            .from('grocery_lists')
            .select('id, name')
            .order('name');
        if (error) throw error;
        return data;
    },

    async addListItem(listId: string, groceryTypeId: string, quantity: number, unit: string) {
        const { data, error } = await supabase
            .from('grocery_list_items')
            .insert({
                list_id: listId,
                grocery_type_id: groceryTypeId,
                quantity,
                unit
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getListDetails(listId: string) {
        const { data, error } = await supabase
            .from('grocery_lists')
            .select(`
        *,
        items: grocery_list_items (
          *,
          grocery_type: grocery_types (name)
        )
      `)
            .eq('id', listId)
            .single();
        if (error) throw error;
        return data;
    }
};

export const recipeService = {

    async createRecipe(name: string, instructions: string, servings: number) {
        // 1. Create a Grocery List first to hold ingredients
        const { data: listData, error: listError } = await supabase
            .from('grocery_lists')
            .insert({ name: `${name} Ingredients` })
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
                ingredients_list_id: listData.id
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
        return listService.addListItem(recipe.ingredients_list_id, groceryTypeId, quantity, unit);
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
