import { supabase } from '../lib/supabase';
import { recipeService } from './recipeService';

type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner';
type DinerType = 'Parents' | 'Children' | 'Everyone';
type PlanType = 'Recipe' | 'AdHocList';

export const plannerService = {

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
                recipe: recipes (name),
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
    }
};
