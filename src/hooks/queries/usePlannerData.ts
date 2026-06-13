import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { plannerService } from '../../services/plannerService';
import type { PlanEntryInput } from '../../services/plannerService';
import { groceryListService } from '../../services/groceryListService';
import { pantryService } from '../../services/pantryService';
import { preferencesService } from '../../services/preferencesService';
import type { PlannerConfigItem } from '../../services/preferencesService';

export const plannerKeys = {
    all: ['planner'] as const,
    plans: (start: string, end: string) => [...plannerKeys.all, 'plans', start, end] as const,
    recipes: () => [...plannerKeys.all, 'recipes'] as const,
    lists: () => [...plannerKeys.all, 'lists'] as const,
    items: () => [...plannerKeys.all, 'items'] as const,
    config: () => [...plannerKeys.all, 'config'] as const,
    anchor: () => [...plannerKeys.all, 'anchor'] as const,
};

export function usePlannerPlans(startDate: Date, endDate: Date) {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    return useQuery({
        queryKey: plannerKeys.plans(startStr, endStr),
        queryFn: () => plannerService.getPlanForRange(startStr, endStr),
        staleTime: 1000 * 60 * 5, // 5 mins
    });
}

export function usePlannerRecipes() {
    return useQuery({
        queryKey: plannerKeys.recipes(),
        queryFn: () => plannerService.getRecipesForPicker(),
        staleTime: 1000 * 60 * 15, // 15 mins
    });
}

export function usePlannerLists() {
    return useQuery({
        queryKey: plannerKeys.lists(),
        queryFn: () => groceryListService.getAllLists(),
        staleTime: 1000 * 60 * 15,
    });
}

export function usePlannerItems() {
    return useQuery({
        queryKey: plannerKeys.items(),
        queryFn: () => pantryService.getGroceries(),
        staleTime: 1000 * 60 * 15,
    });
}

export function usePlannerConfig() {
    return useQuery({
        queryKey: plannerKeys.config(),
        queryFn: () => preferencesService.getPlannerConfig(),
        staleTime: Infinity,
    });
}

export function usePlannerAnchor() {
    return useQuery({
        queryKey: plannerKeys.anchor(),
        queryFn: () => preferencesService.getPlannerViewportAnchor(),
        staleTime: Infinity,
    });
}

export function useMutatePlannerConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (newConfig: PlannerConfigItem[]) => preferencesService.setPlannerConfig(newConfig),
        onSuccess: (_, newConfig) => {
            queryClient.setQueryData(plannerKeys.config(), newConfig);
        },
    });
}

export function useMutatePlannerAnchor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dateStr: string) => preferencesService.setPlannerViewportAnchor(dateStr),
        onSuccess: (_, dateStr) => {
            queryClient.setQueryData(plannerKeys.anchor(), dateStr);
        },
    });
}

export function useAddMealPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: PlanEntryInput) => plannerService.addPlanEntry(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...plannerKeys.all, 'plans'] });
        },
        onError: (err) => {
            console.error('Failed to add to plan:', err);
            toast.error('Could not add to the plan. Please try again.');
        },
    });
}

export function useDeleteMealPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (planId: string) => plannerService.deletePlanEntry(planId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...plannerKeys.all, 'plans'] });
        },
        onError: (err) => {
            console.error('Failed to remove from plan:', err);
            toast.error('Could not remove that entry. Please try again.');
        },
    });
}
