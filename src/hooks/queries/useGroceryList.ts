import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groceryListService } from '../../services/groceryListService';

export const groceryKeys = {
    all: ['groceries'] as const,
    lists: () => [...groceryKeys.all, 'lists'] as const,
    details: (id: string) => [...groceryKeys.all, 'details', id] as const,
};

export function useLists() {
    return useQuery({
        queryKey: groceryKeys.lists(),
        queryFn: () => groceryListService.getLists(),
    });
}

export function useGroceryListDetails(listId: string | null) {
    return useQuery({
        queryKey: groceryKeys.details(listId!),
        queryFn: () => groceryListService.getGroceryListDetails(listId!),
        enabled: !!listId,
    });
}

export function useCreateList() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => groceryListService.createList(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
        },
    });
}

export function useRenameList() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ listId, name }: { listId: string; name: string }) =>
            groceryListService.renameList(listId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.all });
        },
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
            queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
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

export function useDeleteGroceryList() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (listId: string) => groceryListService.deleteGroceryList(listId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groceryKeys.all });
        }
    });
}
