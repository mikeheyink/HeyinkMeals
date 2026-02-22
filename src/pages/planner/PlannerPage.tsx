import { useState } from 'react';
import { format, addDays, startOfDay, parseISO, isToday } from 'date-fns';
import { ChevronUp, ChevronDown, Settings, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';

import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { MobilePlannerView } from '../../components/MobilePlannerView';
import { AddRecipeModal } from '../../components/AddRecipeModal';
import { PlannerGrid } from '../../components/planner/PlannerGrid';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useIsMobile } from '../../hooks/useMediaQuery';

import {
    usePlannerConfig,
    usePlannerAnchor,
    usePlannerPlans,
    usePlannerRecipes,
    useMutatePlannerConfig,
    useMutatePlannerAnchor,
    useAddMealPlan,
    useDeleteMealPlan
} from '../../hooks/queries/usePlannerData';
import { DEFAULT_PLANNER_CONFIG } from '../../services/preferencesService';

export const PlannerPage = () => {
    const isMobile = useIsMobile();
    const allSlots = ['Breakfast', 'Lunch', 'Dinner'] as const;

    // Local UI State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
    const [selectedSlotForDrawer, setSelectedSlotForDrawer] = useState<{ date: Date; meal: string } | null>(null);
    const [drawerSelectedRecipe, setDrawerSelectedRecipe] = useState('');

    // React Query Data
    const { data: plannerConfig = DEFAULT_PLANNER_CONFIG } = usePlannerConfig();
    const { data: anchorDateStr } = usePlannerAnchor();
    const anchorDate = anchorDateStr ? parseISO(anchorDateStr) : startOfDay(new Date());

    // Derived Date State
    const days = Array.from({ length: 11 }, (_, i) => addDays(anchorDate, i));
    const viewContainsToday = days.some(d => isToday(d));

    const { data: plansData } = usePlannerPlans(days[0], days[10]);
    const plans = plansData || [];

    const { data: recipesData } = usePlannerRecipes();
    const recipes = recipesData || [];

    // React Query Mutations
    const { mutate: updateConfig } = useMutatePlannerConfig();
    const { mutate: updateAnchor } = useMutatePlannerAnchor();
    const { mutateAsync: addMealPlan } = useAddMealPlan();
    const { mutateAsync: deleteMealPlan } = useDeleteMealPlan();

    // Navigation handlers
    const navigateWeek = (direction: 'prev' | 'next') => {
        const offset = direction === 'prev' ? -7 : 7;
        const newAnchor = startOfDay(addDays(anchorDate, offset));
        updateAnchor(format(newAnchor, 'yyyy-MM-dd'));
    };

    const jumpToToday = () => {
        const today = startOfDay(new Date());
        updateAnchor(format(today, 'yyyy-MM-dd'));
    };

    // Config handlers
    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newConfig = [...plannerConfig];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newConfig.length) {
            [newConfig[index], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[index]];
            updateConfig(newConfig);
        }
    };

    const toggleSlot = (dinerId: string, slot: string) => {
        const newConfig = plannerConfig.map(item => {
            if (item.id !== dinerId) return item;
            const newSlots = item.slots.includes(slot)
                ? item.slots.filter(s => s !== slot)
                : [...item.slots, slot].sort((a, b) =>
                    allSlots.indexOf(a as any) - allSlots.indexOf(b as any)
                );
            return { ...item, slots: newSlots };
        });
        updateConfig(newConfig);
    };

    const activeConfigs = plannerConfig.filter(c => c.slots.length > 0);

    // Plan mutations handlers
    const handleAddMeal = async (date: Date, slot: string, dinerId: string, recipeId: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        try {
            await addMealPlan({
                date: dateStr,
                slot: slot as any,
                dinerType: dinerId as any,
                planType: 'Recipe',
                referenceId: recipeId
            });
        } catch (err) {
            console.error('Failed to add meal:', err);
        }
    };

    const handleDeleteMeal = async (planId: string) => {
        try {
            await deleteMealPlan(planId);
        } catch (err) {
            console.error('Failed to delete meal:', err);
        }
    };

    const handleRecipeCreated = async (recipeId: string) => {
        if (selectedSlotForDrawer) {
            const [dinerId, slot] = selectedSlotForDrawer.meal.split('-');
            if (dinerId && slot) {
                await handleAddMeal(selectedSlotForDrawer.date, slot, dinerId, recipeId);
            }
            setSelectedSlotForDrawer(null);
            setDrawerSelectedRecipe('');
        }
        setIsAddRecipeModalOpen(false);
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Meal Planner"
                subtitle={`${format(days[0] || new Date(), 'MMM d')} — ${format(days[10] || new Date(), 'MMM d')}`}
                actions={
                    <div className="flex items-center gap-2">
                        {/* Week Navigation */}
                        <div className="flex items-center gap-1 bg-base-200/60 rounded-lg p-1">
                            <button
                                onClick={() => navigateWeek('prev')}
                                className="p-1.5 rounded-md hover:bg-base-300 transition-colors text-ink-500 hover:text-ink-900"
                                title="Previous week"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={jumpToToday}
                                className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${viewContainsToday
                                    ? 'bg-accent text-white'
                                    : 'hover:bg-base-300 text-ink-500 hover:text-ink-900'
                                    }`}
                                title="Jump to today"
                            >
                                Today
                            </button>
                            <button
                                onClick={() => navigateWeek('next')}
                                className="p-1.5 rounded-md hover:bg-base-300 transition-colors text-ink-500 hover:text-ink-900"
                                title="Next week"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Settings */}
                        <div className="relative">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                icon={Settings}
                            >
                                <span className="hidden sm:inline">Customize View</span>
                                <span className="sm:hidden">Settings</span>
                            </Button>

                            {isSettingsOpen && (
                                <>
                                    {/* Mobile: Full-screen bottom sheet */}
                                    {isMobile ? (
                                        <div className="fixed inset-0 z-50">
                                            {/* Backdrop */}
                                            <div
                                                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                                                onClick={() => setIsSettingsOpen(false)}
                                            />
                                            {/* Bottom Sheet */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-6 pb-8 safe-area-bottom animate-in slide-in-from-bottom duration-200">
                                                <div className="w-12 h-1 bg-base-300 rounded-full mx-auto mb-6" />
                                                <h4 className="text-lg font-bold text-ink-900 mb-4">Customize View</h4>
                                                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                                    {plannerConfig.map((item, idx) => (
                                                        <div key={item.id} className="space-y-3 p-4 rounded-xl bg-base-200/50 border border-base-300/50">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-base font-bold text-ink-900">{item.id}</span>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        disabled={idx === 0}
                                                                        onClick={() => moveItem(idx, 'up')}
                                                                        className="p-2 hover:bg-base-300 rounded-lg disabled:opacity-20 touch-target"
                                                                    >
                                                                        <ChevronUp size={20} />
                                                                    </button>
                                                                    <button
                                                                        disabled={idx === plannerConfig.length - 1}
                                                                        onClick={() => moveItem(idx, 'down')}
                                                                        className="p-2 hover:bg-base-300 rounded-lg disabled:opacity-20 touch-target"
                                                                    >
                                                                        <ChevronDown size={20} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-3">
                                                                {allSlots.map(slot => (
                                                                    <label key={slot} className="flex items-center gap-2 cursor-pointer group flex-1 p-2 rounded-lg hover:bg-base-300 transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.slots.includes(slot)}
                                                                            onChange={() => toggleSlot(item.id, slot)}
                                                                            className="rounded border-base-300 text-accent focus:ring-accent w-5 h-5"
                                                                        />
                                                                        <span className="text-sm text-ink-700 font-medium">{slot}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-4 mt-4 border-t border-base-200">
                                                    <Button variant="primary" size="lg" className="w-full" onClick={() => setIsSettingsOpen(false)}>
                                                        Done
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Desktop: Dropdown */
                                        <div className="absolute right-0 mt-2 w-72 bg-white border border-base-300 rounded-lg shadow-xl z-50 p-4 space-y-4">
                                            <div>
                                                <h4 className="section-title mb-3">Re-order & Configure</h4>
                                                <div className="space-y-4">
                                                    {plannerConfig.map((item, idx) => (
                                                        <div key={item.id} className="space-y-2 p-2 rounded-md bg-base-200/50 border border-base-300/50">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-bold text-ink-900">{item.id}</span>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        disabled={idx === 0}
                                                                        onClick={() => moveItem(idx, 'up')}
                                                                        className="p-1 hover:bg-base-300 rounded disabled:opacity-20"
                                                                    >
                                                                        <ChevronUp size={14} />
                                                                    </button>
                                                                    <button
                                                                        disabled={idx === plannerConfig.length - 1}
                                                                        onClick={() => moveItem(idx, 'down')}
                                                                        className="p-1 hover:bg-base-300 rounded disabled:opacity-20"
                                                                    >
                                                                        <ChevronDown size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {allSlots.map(slot => (
                                                                    <label key={slot} className="flex items-center gap-1.5 cursor-pointer group flex-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.slots.includes(slot)}
                                                                            onChange={() => toggleSlot(item.id, slot)}
                                                                            className="rounded border-base-300 text-accent focus:ring-accent w-3 h-3"
                                                                        />
                                                                        <span className="text-[10px] text-ink-500 group-hover:text-ink-900 transition-colors uppercase tracking-tight">{slot.charAt(0)}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-base-200">
                                                <Button variant="outline" size="sm" className="w-full" onClick={() => setIsSettingsOpen(false)}>
                                                    Done
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                }
            />

            {isMobile ? (
                <MobilePlannerView
                    days={days}
                    plans={plans}
                    recipes={recipes}
                    activeConfigs={activeConfigs}
                    onAddMeal={handleAddMeal}
                    onDeleteMeal={handleDeleteMeal}
                    onRequestPreviousWeek={() => navigateWeek('prev')}
                    onRequestNextWeek={() => navigateWeek('next')}
                    onJumpToToday={jumpToToday}
                    viewContainsToday={viewContainsToday}
                    onRefreshRecipes={async () => { }}
                />
            ) : (
                <PlannerGrid
                    days={days}
                    plans={plans}
                    recipes={recipes}
                    activeConfigs={activeConfigs}
                    onSelectSlot={(date, meal) => setSelectedSlotForDrawer({ date, meal })}
                    onDeleteMeal={handleDeleteMeal}
                />
            )}

            {/* Desktop Slide-over Drawer for Adding Meals */}
            {selectedSlotForDrawer && !isMobile && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[60] animate-in fade-in duration-200"
                        onClick={() => setSelectedSlotForDrawer(null)}
                    />

                    {/* Drawer Panel */}
                    <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300 border-l border-base-200">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-ink-900">Plan a Meal</h3>
                                <p className="text-sm font-medium text-ink-500 mt-1">
                                    {format(selectedSlotForDrawer.date, 'EEEE, MMM d')} • <span className="text-accent">{selectedSlotForDrawer.meal.replace('-', ' ')}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSlotForDrawer(null)}
                                className="p-2 bg-white hover:bg-base-200 text-ink-500 hover:text-ink-900 rounded-xl transition-all shadow-sm border border-base-200"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="p-6 flex-1 overflow-y-auto bg-base-50/30">
                            <div className="bg-white p-5 rounded-2xl border border-base-200 shadow-sm space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-ink-900 mb-2">Select Existing Recipe</label>
                                    <SearchableSelect
                                        options={recipes}
                                        value={drawerSelectedRecipe}
                                        onChange={async (newVal) => {
                                            if (!newVal) return;
                                            setDrawerSelectedRecipe(newVal);
                                            const [dinerId, slot] = selectedSlotForDrawer.meal.split('-');
                                            await handleAddMeal(selectedSlotForDrawer.date, slot, dinerId, newVal);
                                            setSelectedSlotForDrawer(null);
                                            setDrawerSelectedRecipe('');
                                        }}
                                        getOptionValue={(r) => r.id}
                                        getOptionLabel={(r) => r.grocery_list?.name || r.name}
                                        placeholder="Search your library..."
                                        searchPlaceholder="Search recipes..."
                                        autoFocus
                                    />
                                </div>

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-base-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest text-ink-300">
                                        <span className="bg-white px-3">or</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full border-dashed hover:border-accent hover:text-accent hover:bg-accent/5"
                                    icon={Plus}
                                    onClick={() => {
                                        setIsAddRecipeModalOpen(true);
                                        // The modal appears above the drawer, so we don't close the drawer.
                                        // When modal finishes, it handles adding the meal.
                                    }}
                                >
                                    Create New Recipe
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <AddRecipeModal
                isOpen={isAddRecipeModalOpen}
                onClose={() => {
                    setIsAddRecipeModalOpen(false);
                }}
                onRecipeCreated={handleRecipeCreated}
            />
        </div>
    );
};;
