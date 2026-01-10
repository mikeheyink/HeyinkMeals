import { supabase } from '../lib/supabase';
import { recipeService } from './recipeService';

type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner';
type DinerType = 'Parents' | 'Children' | 'Everyone';
type PlanType = 'Recipe' | 'AdHocList';

export const plannerService = {

    /**
     * Fetches recipes with their linked grocery list names for display in dropdowns
     */
    async getRecipesWithListNames() {
        const { data, error } = await supabase
            .from('recipes')
            .select(`
                id,
                name,
                ingredients_list_id,
                grocery_list:grocery_lists!ingredients_list_id (name)
            `)
            .order('name');
        if (error) throw error;
        return data;
    },

    async addPlanEntry(date: string, slot: MealSlot, dinerType: DinerType, type: PlanType, referenceId: string) {
        // 1. Create the meal plan entry
        const { data: entry, error: entryError } = await supabase
            .from('meal_plan_entries')
            .insert({
                date,
                slot,
                diner_type: dinerType,
                plan_type: type,
                reference_id: referenceId
            })
            .select()
            .single();

        if (entryError) throw entryError;

        // 2. Snapshot ingredients into shopping_list_items
        if (type === 'Recipe') {
            const recipe = await recipeService.getRecipe(referenceId);
            if (recipe.ingredients_list && recipe.ingredients_list.items) {
                const itemsToInsert = recipe.ingredients_list.items.map((item: any) => ({
                    meal_plan_entry_id: entry.id,
                    recipe_id: referenceId,
                    grocery_type_id: item.grocery_type_id,
                    quantity: item.quantity,
                    unit: item.unit,
                    is_in_stock: item.is_in_stock || false,
                    is_purchased: item.is_purchased || false
                }));

                if (itemsToInsert.length > 0) {
                    const { error: itemsError } = await supabase
                        .from('shopping_list_items')
                        .insert(itemsToInsert);
                    if (itemsError) console.error('Error snapshotting ingredients:', itemsError);
                }
            }
        }

        return entry;
    },

    async deletePlanEntry(entryId: string) {
        // Shopping list items will cascade delete due to FK constraint
        const { error } = await supabase
            .from('meal_plan_entries')
            .delete()
            .eq('id', entryId);

        if (error) throw error;
    },

    async getPlanForRange(startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date');

        if (error) throw error;
        return data;
    },

    /**
     * Fetches the persistent shopping list items
     */
    async getShoppingList() {
        const { data, error } = await supabase
            .from('shopping_list_items')
            .select(`
                *,
                recipe: recipes (name, grocery_list:grocery_lists!ingredients_list_id (name)),
                grocery_types (
                    name,
                    category: grocery_categories (name),
                    store: stores (name)
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

    async archivePurchased() {
        const { error } = await supabase
            .from('shopping_list_items')
            .update({ is_archived: true })
            .eq('is_purchased', true);

        if (error) throw error;
    },

    /**
     * Adds a manual item to the shopping list (not tied to a meal plan)
     */
    async addManualItem(groceryTypeId: string, quantity: number, unit: string) {
        const { data, error } = await supabase
            .from('shopping_list_items')
            .insert({
                grocery_type_id: groceryTypeId,
                quantity,
                unit,
                meal_plan_entry_id: null,
                recipe_id: null
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async addListItemsToShoppingList(listId: string) {
        // 1. Fetch items from the grocery list
        const { data: listItems, error: fetchError } = await supabase
            .from('grocery_list_items')
            .select('grocery_type_id, quantity, unit')
            .eq('list_id', listId);

        if (fetchError) throw fetchError;
        if (!listItems || listItems.length === 0) return;

        // 2. Insert into shopping_list_items
        const itemsToInsert = listItems.map(item => ({
            grocery_type_id: item.grocery_type_id,
            quantity: item.quantity,
            unit: item.unit,
            is_purchased: false,
            is_in_stock: false,
            meal_plan_entry_id: null, // or could link to a generic "AdHoc" entry if needed
            recipe_id: null
        }));

        const { error: insertError } = await supabase
            .from('shopping_list_items')
            .insert(itemsToInsert);

        if (insertError) throw insertError;
    }
};
