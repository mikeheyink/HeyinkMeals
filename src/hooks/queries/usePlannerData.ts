import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plannerService } from '../../services/plannerService';
import { preferencesService } from '../../services/preferencesService';
import type { PlannerConfigItem } from '../../services/preferencesService';
import { format } from 'date-fns';

export const plannerKeys = {
    all: ['planner'] as const,
    plans: (start: string, end: string) => [...plannerKeys.all, 'plans', start, end] as const,
    recipes: () => [...plannerKeys.all, 'recipes'] as const,
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
        queryFn: () => plannerService.getRecipesWithListNames(),
        staleTime: 1000 * 60 * 15, // 15 mins
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
        mutationFn: ({ date, slot, dinerType, planType, referenceId }: {
            date: string;
            slot: 'Breakfast' | 'Lunch' | 'Dinner';
            dinerType: 'Parents' | 'Children' | 'Everyone';
            planType: 'Recipe' | 'AdHocList';
            referenceId: string;
        }) => plannerService.addPlanEntry(date, slot, dinerType, planType, referenceId),
        onSuccess: () => {
            // Invalidate all plan ranges to ensure data is fresh
            queryClient.invalidateQueries({ queryKey: [...plannerKeys.all, 'plans'] });
        },
    });
}

export function useDeleteMealPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (planId: string) => plannerService.deletePlanEntry(planId),
        onSuccess: () => {
            // Invalidate all plan ranges to ensure data is fresh
            queryClient.invalidateQueries({ queryKey: [...plannerKeys.all, 'plans'] });
        },
    });
}
