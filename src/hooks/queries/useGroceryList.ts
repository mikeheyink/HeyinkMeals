import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groceryListService } from '../../services/groceryListService';

export const groceryKeys = {
    all: ['groceries'] as const,
    grouped: () => [...groceryKeys.all, 'grouped'] as const,
    details: (id: string) => [...groceryKeys.all, 'details', id] as const,
};

export function useGroceryListsGrouped() {
    return useQuery({
        queryKey: groceryKeys.grouped(),
        queryFn: () => groceryListService.getGroceryListsGrouped(),
    });
}

export function useGroceryListDetails(listId: string | null) {
    return useQuery({
        queryKey: groceryKeys.details(listId!),
        queryFn: () => groceryListService.getGroceryListDetails(listId!),
        enabled: !!listId,
    });
}

export function useAddGroceryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ listId, groceryTypeId, quantity, unit }: {
            listId: string;
            groceryTypeId: string;
            quantity: number;
            unit: string;
        }) => groceryListService.addItem(listId, groceryTypeId, quantity, unit),
        onSuccess: (_, { listId }) => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.details(listId) });
            queryClient.invalidateQueries({ queryKey: groceryKeys.grouped() });
        },
    });
}

export function useUpdateGroceryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ itemId, updates }: { itemId: string, updates: { quantity?: number, unit?: string } }) =>
            groceryListService.updateItem(itemId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.all });
        }
    });
}

export function useDeleteGroceryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (itemId: string) => groceryListService.deleteItem(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.all });
        }
    });
}

export function useClearGroceryRecipe() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (recipeId: string) => groceryListService.clearRecipe(recipeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.all });
        }
    });
}

export function useDeleteGroceryList() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (listId: string) => groceryListService.deleteGroceryList(listId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.all });
        }
    });
}

export function useAddRecipeToList() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ listId, name, servings }: { listId: string, name: string, servings?: number }) =>
            groceryListService.createRecipeForList(listId, name, servings),
        onSuccess: (_, { listId }) => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.details(listId) });
            queryClient.invalidateQueries({ queryKey: groceryKeys.grouped() });
        }
    });
}

export function useUpdateGroceryRecipe() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ recipeId, updates }: { recipeId: string, updates: { name?: string, servings?: number, instructions?: string, web_source?: string } }) =>
            groceryListService.updateRecipe(recipeId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.all });
        }
    });
}
