import { useEffect, useState, useRef, useCallback } from 'react';
import { plannerService } from '../../services/plannerService';
import { preferencesService } from '../../services/preferencesService';
import type { PlannerConfigItem } from '../../services/preferencesService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Plus, X, ChevronUp, ChevronDown, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfDay, parseISO, isToday } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { MobilePlannerView } from '../../components/MobilePlannerView';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { AddRecipeModal } from '../../components/AddRecipeModal';

const DEFAULT_PLANNER_CONFIG: PlannerConfigItem[] = [
    { id: 'Everyone', slots: ['Breakfast', 'Lunch', 'Dinner'] },
    { id: 'Parents', slots: ['Breakfast', 'Lunch', 'Dinner'] },
    { id: 'Children', slots: ['Breakfast', 'Lunch', 'Dinner'] }
];

export const PlannerPage = () => {
    const [days, setDays] = useState<Date[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);

    const [addingTo, setAddingTo] = useState<{ date: Date, meal: string } | null>(null);
    const [selectedRecipe, setSelectedRecipe] = useState('');

    const allSlots = ['Breakfast', 'Lunch', 'Dinner'] as const;

    // Customization Settings - load from database
    const [plannerConfig, setPlannerConfig] = useState<PlannerConfigItem[]>(DEFAULT_PLANNER_CONFIG);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
    const [pendingDesktopSlot, setPendingDesktopSlot] = useState<{ date: Date; meal: string } | null>(null);

    // Viewport anchor state - the date from which the 11-day window starts
    const [anchorDate, setAnchorDate] = useState<Date>(startOfDay(new Date()));
    const [isLoadingAnchor, setIsLoadingAnchor] = useState(true);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Check if current view contains today
    const viewContainsToday = days.some(d => isToday(d));

    // Load preferences from database on mount
    useEffect(() => {
        Promise.all([
            preferencesService.getPlannerConfig(),
            preferencesService.getPlannerViewportAnchor()
        ]).then(([config, anchor]) => {
            setPlannerConfig(config);
            if (anchor) {
                setAnchorDate(parseISO(anchor));
            }
            setIsLoadingAnchor(false);
        });
    }, []);

    // Save preferences to database when they change
    const updatePlannerConfig = (newConfig: PlannerConfigItem[]) => {
        setPlannerConfig(newConfig);
        preferencesService.setPlannerConfig(newConfig);
    };

    // Debounced save of anchor date
    const saveAnchorDebounced = useCallback((date: Date) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            preferencesService.setPlannerViewportAnchor(format(date, 'yyyy-MM-dd'));
        }, 500);
    }, []);

    // Generate days from anchor date
    useEffect(() => {
        if (isLoadingAnchor) return;
        const week = Array.from({ length: 11 }, (_, i) => addDays(anchorDate, i));
        setDays(week);
        loadData(week[0], week[10]);
    }, [anchorDate, isLoadingAnchor]);

    // Navigation handlers
    const navigateWeek = (direction: 'prev' | 'next') => {
        const offset = direction === 'prev' ? -7 : 7;
        const newAnchor = startOfDay(addDays(anchorDate, offset));
        setAnchorDate(newAnchor);
        saveAnchorDebounced(newAnchor);
    };

    const jumpToToday = () => {
        const today = startOfDay(new Date());
        setAnchorDate(today);
        saveAnchorDebounced(today);
    };

    const refreshRecipes = async () => {
        const recipeData = await plannerService.getRecipesWithListNames();
        if (recipeData) {
            setRecipes(recipeData);
        }
    };

    const loadData = async (start: Date, end: Date) => {
        try {
            const startStr = format(start, 'yyyy-MM-dd');
            const endStr = format(end, 'yyyy-MM-dd');
            const p = await plannerService.getPlanForRange(startStr, endStr);
            setPlans(p || []);

            await refreshRecipes();
        } catch (e) {
            console.error(e);
        }
    };



    const getPlanForSlot = (date: Date, mealType: string, dinerType: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return plans.find(p => p.date === dateStr && p.slot === mealType && p.diner_type === dinerType);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newConfig = [...plannerConfig];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newConfig.length) {
            [newConfig[index], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[index]];
            updatePlannerConfig(newConfig);
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
        updatePlannerConfig(newConfig);
    };

    const activeConfigs = plannerConfig.filter(c => c.slots.length > 0);
    const totalActiveSlots = activeConfigs.reduce((sum, c) => sum + c.slots.length, 0);
    const isMobile = useIsMobile();

    // Handler functions for mobile view
    const handleAddMeal = async (date: Date, slot: string, dinerId: string, recipeId: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const existingPlan = getPlanForSlot(date, slot, dinerId);
        try {
            if (existingPlan) {
                await plannerService.deletePlanEntry(existingPlan.id);
            }
            await plannerService.addPlanEntry(dateStr, slot as any, dinerId as any, 'Recipe', recipeId);
            await loadData(days[0], days[10]);
        } catch (err) {
            console.error('Failed to add meal:', err);
        }
    };

    const handleDeleteMeal = async (planId: string) => {
        try {
            await plannerService.deletePlanEntry(planId);
            await loadData(days[0], days[10]);
        } catch (err) {
            console.error('Failed to delete meal:', err);
        }
    };

    const handleRecipeCreated = async (recipeId: string) => {
        await refreshRecipes();

        if (pendingDesktopSlot) {
            const [dinerId, slot] = pendingDesktopSlot.meal.split('-');
            if (dinerId && slot) {
                await handleAddMeal(pendingDesktopSlot.date, slot, dinerId, recipeId);
            }
            setPendingDesktopSlot(null);
            setAddingTo(null);
            setSelectedRecipe('');
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

            {/* Mobile View */}
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
                    onRefreshRecipes={refreshRecipes}
                />
            ) : (
                /* Desktop View */
                <Card className="p-0 border-none shadow-none bg-transparent overflow-hidden">
                    <div className="overflow-x-auto pb-4">
                        <div className="min-w-[1000px] compact-grid !gap-0 !bg-transparent border-none">
                            {/* Row 1: Diner Type Header */}
                            <div
                                className="grid sticky top-0 z-40 bg-base-100 text-[10px] font-black uppercase tracking-widest text-ink-300 border-b border-base-300 shadow-sm"
                                style={{ gridTemplateColumns: `120px repeat(${totalActiveSlots}, 1fr)` }}
                            >
                                <div className="p-2 border-r border-base-300 bg-base-200 sticky left-0 z-50"></div>
                                {activeConfigs.map((config) => (
                                    <div
                                        key={config.id}
                                        className="p-2 text-center border-r border-base-300 last:border-r-0 bg-base-100"
                                        style={{ gridColumn: `span ${config.slots.length}` }}
                                    >
                                        {config.id}
                                    </div>
                                ))}
                            </div>

                            {/* Row 2: Slot Header */}
                            <div
                                className="grid sticky top-[33px] z-30 bg-base-100 text-[10px] font-black uppercase tracking-widest text-ink-500 border-b border-base-300 shadow-sm"
                                style={{ gridTemplateColumns: `120px repeat(${totalActiveSlots}, 1fr)` }}
                            >
                                <div className="p-3 border-r border-base-300 sticky left-0 z-40 bg-base-100">Date</div>
                                {activeConfigs.map((config, cIdx) =>
                                    config.slots.map((slot, sIdx) => (
                                        <div
                                            key={`${config.id}-${slot}`}
                                            className={`p-3 text-center border-r border-base-300 bg-base-100 ${(cIdx === activeConfigs.length - 1 && sIdx === config.slots.length - 1) ? 'border-r-0' : ''
                                                }`}
                                        >
                                            {slot}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Day Rows */}
                            {days.map((day) => (
                                <div
                                    key={day.toString()}
                                    className="grid border-t border-base-300"
                                    style={{ gridTemplateColumns: `120px repeat(${totalActiveSlots}, 1fr)` }}
                                >
                                    {/* Date Cell */}
                                    <div className="p-4 bg-base-200 border-r border-base-300 flex flex-col justify-center sticky-left min-h-[100px]">
                                        <span className="text-xs font-bold text-ink-900">{format(day, 'EEEE')}</span>
                                        <span className="text-[10px] text-ink-500">{format(day, 'MMM d')}</span>
                                    </div>

                                    {/* Meal Cells */}
                                    {activeConfigs.map((config) =>
                                        config.slots.map((meal) => {
                                            const plan = getPlanForSlot(day, meal, config.id);
                                            const isEditing = addingTo?.date === day && addingTo?.meal === `${config.id}-${meal}`;
                                            const recipeData = plan ? recipes.find(r => r.id === plan.reference_id) : null;
                                            const currentRecipeName = recipeData?.grocery_list?.name || recipeData?.name || null;

                                            return (
                                                <div key={`${config.id}-${meal}`} className={`p-3 bg-white min-h-[100px] group border-r border-base-300 last:border-r-0`}>
                                                    {isEditing ? (
                                                        <div className="flex flex-col gap-1 h-full">
                                                            <SearchableSelect
                                                                options={recipes}
                                                                value={selectedRecipe || plan?.reference_id || ''}
                                                                onChange={async (newVal) => {
                                                                    if (!newVal) {
                                                                        setAddingTo(null);
                                                                        setSelectedRecipe('');
                                                                        return;
                                                                    }

                                                                    setSelectedRecipe(newVal);
                                                                    const dateStr = format(day, 'yyyy-MM-dd');

                                                                    try {
                                                                        if (plan) {
                                                                            await plannerService.deletePlanEntry(plan.id);
                                                                        }
                                                                        await plannerService.addPlanEntry(dateStr, meal as any, config.id as any, 'Recipe', newVal);
                                                                        await loadData(days[0], days[10]);
                                                                    } catch (err) {
                                                                        console.error('Failed to update meal:', err);
                                                                    } finally {
                                                                        setAddingTo(null);
                                                                        setSelectedRecipe('');
                                                                    }
                                                                }}
                                                                getOptionValue={(r) => r.id}
                                                                getOptionLabel={(r) => r.grocery_list?.name || r.name}
                                                                placeholder="Select recipe..."
                                                                searchPlaceholder="Search recipes..."
                                                                autoFocus
                                                                onAddNew={() => {
                                                                    setPendingDesktopSlot({ date: day, meal: `${config.id}-${meal}` });
                                                                    setIsAddRecipeModalOpen(true);
                                                                }}
                                                                addNewLabel="Create new recipe..."
                                                            />
                                                            <button
                                                                onClick={async () => {
                                                                    if (plan) {
                                                                        try {
                                                                            await plannerService.deletePlanEntry(plan.id);
                                                                            await loadData(days[0], days[10]);
                                                                        } catch (err) {
                                                                            console.error('Failed to delete meal:', err);
                                                                        }
                                                                    }
                                                                    setAddingTo(null);
                                                                    setSelectedRecipe('');
                                                                }}
                                                                className="p-1 text-[10px] text-ink-400 hover:text-red-600 hover:bg-base-200 rounded flex items-center justify-center gap-1"
                                                            >
                                                                <X size={10} /> {plan ? 'Delete' : 'Cancel'}
                                                            </button>
                                                        </div>
                                                    ) : plan ? (
                                                        <button
                                                            onClick={() => setAddingTo({ date: day, meal: `${config.id}-${meal}` })}
                                                            className="w-full h-full text-left group/meal flex flex-col justify-between"
                                                        >
                                                            <span className="text-[11px] font-semibold text-ink-900 line-clamp-3 leading-tight group-hover/meal:text-accent transition-colors">
                                                                {currentRecipeName || 'Unknown Recipe'}
                                                            </span>
                                                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Plus size={12} className="text-ink-300" />
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setAddingTo({ date: day, meal: `${config.id}-${meal}` })}
                                                            className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-base-200/50 rounded-md border border-dashed border-base-300"
                                                        >
                                                            <Plus size={14} className="text-ink-300" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}
            <AddRecipeModal
                isOpen={isAddRecipeModalOpen}
                onClose={() => {
                    setIsAddRecipeModalOpen(false);
                    setPendingDesktopSlot(null);
                }}
                onRecipeCreated={handleRecipeCreated}
            />
        </div>
    );
};
