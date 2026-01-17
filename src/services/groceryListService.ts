import { supabase } from '../lib/supabase';

export interface GroceryListWithRecipe {
    id: string;
    name: string;
    created_at: string;
    is_archived: boolean;
    itemCount: number;
    recipe: {
        id: string;
        name: string;
        servings: number;
        total_time_mins: number;
        web_source: string | null;
    } | null;
}

export interface GroceryListsGrouped {
    withRecipes: GroceryListWithRecipe[];
    withoutRecipes: GroceryListWithRecipe[];
}

export const groceryListService = {
    /**
     * Get all grocery lists grouped by whether they have an associated recipe
     */
    async getGroceryListsGrouped(): Promise<GroceryListsGrouped> {
        // Fetch all non-archived grocery lists with their item counts
        const { data: lists, error: listsError } = await supabase
            .from('grocery_lists')
            .select(`
                id,
                name,
                created_at,
                is_archived,
                items:grocery_list_items(count)
            `)
            .eq('is_archived', false)
            .order('name');

        if (listsError) throw listsError;

        // Fetch all non-archived recipes to map which lists have recipes
        const { data: recipes, error: recipesError } = await supabase
            .from('recipes')
            .select('id, name, servings, total_time_mins, web_source, ingredients_list_id')
            .eq('is_archived', false);

        if (recipesError) throw recipesError;

        // Create a map of list_id -> recipe
        const recipeMap = new Map<string, typeof recipes[0]>();
        recipes?.forEach(recipe => {
            if (recipe.ingredients_list_id) {
                recipeMap.set(recipe.ingredients_list_id, recipe);
            }
        });

        // Transform and group the lists
        const withRecipes: GroceryListWithRecipe[] = [];
        const withoutRecipes: GroceryListWithRecipe[] = [];

        lists?.forEach(list => {
            const recipe = recipeMap.get(list.id);
            const itemCount = (list.items as any)?.[0]?.count || 0;

            const groceryList: GroceryListWithRecipe = {
                id: list.id,
                name: list.name,
                created_at: list.created_at,
                is_archived: list.is_archived ?? false,
                itemCount,
                recipe: recipe ? {
                    id: recipe.id,
                    name: recipe.name,
                    servings: recipe.servings,
                    total_time_mins: recipe.total_time_mins,
                    web_source: recipe.web_source
                } : null
            };

            if (recipe) {
                withRecipes.push(groceryList);
            } else {
                withoutRecipes.push(groceryList);
            }
        });

        return { withRecipes, withoutRecipes };
    },

    /**
     * Get details of a single grocery list with its items and associated recipe
     */
    async getGroceryListDetails(listId: string) {
        const { data: list, error: listError } = await supabase
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

        if (listError) throw listError;

        // Find associated recipe
        const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .select('id, name, servings, total_time_mins, web_source, instructions')
            .eq('ingredients_list_id', listId)
            .eq('is_archived', false)
            .maybeSingle();

        if (recipeError) throw recipeError;

        return { list, recipe };
    },

    /**
     * Archive a recipe (soft delete)
     */
    async clearRecipe(recipeId: string): Promise<void> {
        const { error } = await supabase
            .from('recipes')
            .update({ is_archived: true })
            .eq('id', recipeId);

        if (error) throw error;
    },

    /**
     * Delete (archive) a grocery list and all associated data
     */
    async deleteGroceryList(listId: string): Promise<void> {
        // 1. Archive all items in the list
        const { error: itemsError } = await supabase
            .from('grocery_list_items')
            .update({ is_archived: true })
            .eq('list_id', listId);

        if (itemsError) throw itemsError;

        // 2. Archive any recipe that uses this list
        const { error: recipeError } = await supabase
            .from('recipes')
            .update({ is_archived: true })
            .eq('ingredients_list_id', listId);

        if (recipeError) throw recipeError;

        // 3. Archive the list itself
        const { error: listError } = await supabase
            .from('grocery_lists')
            .update({ is_archived: true })
            .eq('id', listId);

        if (listError) throw listError;
    },

    /**
     * Add an item to a grocery list
     */
    async addItem(listId: string, groceryTypeId: string, quantity: number, unit: string) {
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

    /**
     * Update an item in a grocery list
     */
    async updateItem(itemId: string, updates: { quantity?: number; unit?: string }) {
        const { error } = await supabase
            .from('grocery_list_items')
            .update(updates)
            .eq('id', itemId);

        if (error) throw error;
    },

    /**
     * Delete (archive) an item from a grocery list
     */
    async deleteItem(itemId: string): Promise<void> {
        const { error } = await supabase
            .from('grocery_list_items')
            .update({ is_archived: true })
            .eq('id', itemId);

        if (error) throw error;
    },

    /**
     * Create a new recipe and link it to an existing grocery list
     */
    async createRecipeForList(listId: string, recipeName: string, servings: number = 4): Promise<string> {
        const { data, error } = await supabase
            .from('recipes')
            .insert({
                name: recipeName,
                ingredients_list_id: listId,
                servings
            })
            .select('id')
            .single();

        if (error) throw error;
        return data.id;
    },

    /**
     * Update recipe details
     */
    async updateRecipe(recipeId: string, updates: {
        name?: string;
        servings?: number;
        instructions?: string;
        web_source?: string;
    }) {
        const { error } = await supabase
            .from('recipes')
            .update(updates)
            .eq('id', recipeId);

        if (error) throw error;
    }
};
