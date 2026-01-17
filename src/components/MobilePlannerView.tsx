import { useState, useRef } from 'react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { SearchableSelect } from './ui/SearchableSelect';
import { AddRecipeModal } from './AddRecipeModal';

interface MobilePlannerViewProps {
    days: Date[];
    plans: any[];
    recipes: any[];
    activeConfigs: { id: string; slots: string[] }[];
    onAddMeal: (date: Date, slot: string, dinerId: string, recipeId: string) => Promise<void>;
    onDeleteMeal: (planId: string) => Promise<void>;
    onRequestPreviousWeek?: () => void;
    onRequestNextWeek?: () => void;
    onJumpToToday?: () => void;
    viewContainsToday?: boolean;
    onRefreshRecipes?: () => Promise<void>;
}

export const MobilePlannerView = ({
    days,
    plans,
    recipes,
    activeConfigs,
    onAddMeal,
    onDeleteMeal,
    onRequestPreviousWeek,
    onRequestNextWeek,
    onJumpToToday,
    viewContainsToday = true,
    onRefreshRecipes
}: MobilePlannerViewProps) => {
    const [currentDayIndex, setCurrentDayIndex] = useState(() => {
        // Start on today
        const todayIdx = days.findIndex(d => isToday(d));
        return todayIdx >= 0 ? todayIdx : 0;
    });
    const [addingTo, setAddingTo] = useState<{ date: Date; slot: string; dinerId: string } | null>(null);
    const [selectedRecipe, setSelectedRecipe] = useState('');
    const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
    const [pendingSlotInfo, setPendingSlotInfo] = useState<{ date: Date; slot: string; dinerId: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentDay = days[currentDayIndex];

    const getDayLabel = (date: Date) => {
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'EEEE');
    };

    const getPlansForSlot = (date: Date, mealType: string, dinerType: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return plans.filter(p => p.date === dateStr && p.slot === mealType && p.diner_type === dinerType);
    };

    const handleSwipe = (direction: 'left' | 'right') => {
        if (direction === 'left') {
            if (currentDayIndex < days.length - 1) {
                setCurrentDayIndex(prev => prev + 1);
            } else if (onRequestNextWeek) {
                // At edge - load next week
                onRequestNextWeek();
            }
        } else if (direction === 'right') {
            if (currentDayIndex > 0) {
                setCurrentDayIndex(prev => prev - 1);
            } else if (onRequestPreviousWeek) {
                // At edge - load previous week
                onRequestPreviousWeek();
            }
        }
    };

    // Touch swipe handling
    const touchStart = useRef<number>(0);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart.current - touchEnd;
        if (Math.abs(diff) > 50) {
            handleSwipe(diff > 0 ? 'left' : 'right');
        }
    };

    const handleAddRecipe = async () => {
        if (!addingTo || !selectedRecipe) return;
        await onAddMeal(addingTo.date, addingTo.slot, addingTo.dinerId, selectedRecipe);
        setAddingTo(null);
        setSelectedRecipe('');
    };

    const handleRecipeCreated = async (recipeId: string) => {
        if (onRefreshRecipes) {
            await onRefreshRecipes();
        }

        // If we were in the middle of adding a meal, finish it now
        if (pendingSlotInfo) {
            await onAddMeal(pendingSlotInfo.date, pendingSlotInfo.slot, pendingSlotInfo.dinerId, recipeId);
            setPendingSlotInfo(null);
            setAddingTo(null);
        }

        setIsAddRecipeModalOpen(false);
    };

    // Guard: Wait for days to be populated
    if (days.length === 0 || !currentDay) {
        return (
            <div className="flex items-center justify-center p-12 text-ink-300">
                <div className="animate-pulse">Loading planner...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Day Navigation Header */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-base-300 p-3 shadow-sm">
                <button
                    onClick={() => handleSwipe('right')}
                    className="p-2 rounded-lg hover:bg-base-200 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="text-center flex-1">
                    <div className={`text-lg font-bold ${isToday(currentDay) ? 'text-accent' : 'text-ink-900'}`}>
                        {getDayLabel(currentDay)}
                    </div>
                    <div className="text-xs text-ink-500">{format(currentDay, 'MMMM d, yyyy')}</div>
                </div>
                <button
                    onClick={() => handleSwipe('left')}
                    className="p-2 rounded-lg hover:bg-base-200 transition-colors"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Day dots indicator with Today button */}
            <div className="flex items-center justify-center gap-3">
                {!viewContainsToday && onJumpToToday && (
                    <button
                        onClick={onJumpToToday}
                        className="px-3 py-1 text-xs font-semibold bg-accent text-white rounded-full hover:bg-accent/90 transition-colors"
                    >
                        Today
                    </button>
                )}
                {days.map((day, idx) => (
                    <button
                        key={day.toString()}
                        onClick={() => setCurrentDayIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentDayIndex
                            ? 'bg-accent w-4'
                            : isToday(day)
                                ? 'bg-accent/40'
                                : 'bg-base-300'
                            }`}
                    />
                ))}
            </div>

            {/* Meal Cards */}
            <div
                ref={containerRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="space-y-3"
            >
                {activeConfigs.map((config) =>
                    config.slots.map((slot) => {
                        const slotPlans = getPlansForSlot(currentDay, slot, config.id);
                        const hasPlans = slotPlans.length > 0;
                        const isEditing = addingTo?.date === currentDay && addingTo?.slot === slot && addingTo?.dinerId === config.id;

                        // Get recipe info for each plan
                        const recipesInSlot = slotPlans.map(plan => {
                            const recipeData = recipes.find(r => r.id === plan.reference_id);
                            return {
                                planId: plan.id,
                                name: recipeData?.grocery_list?.name || recipeData?.name || 'Unknown'
                            };
                        });

                        return (
                            <div
                                key={`${config.id}-${slot}`}
                                className={`bg-white rounded-xl border border-base-300 overflow-hidden shadow-sm transition-all ${isEditing ? 'ring-2 ring-accent' : ''}`}
                            >
                                {/* Slot Header */}
                                <div className="flex items-center justify-between px-4 py-2 bg-base-200/50 border-b border-base-300">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">
                                            {slot === 'Breakfast' ? '🍳' : slot === 'Lunch' ? '🥗' : '🍝'}
                                        </span>
                                        <span className="text-xs font-black uppercase tracking-wider text-ink-500">
                                            {slot}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-ink-300 bg-base-300 px-2 py-0.5 rounded">
                                        {config.id}
                                    </span>
                                </div>

                                {/* Slot Content */}
                                <div className="p-4">
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <SearchableSelect
                                                options={recipes}
                                                value={selectedRecipe}
                                                onChange={(val) => setSelectedRecipe(val)}
                                                getOptionValue={(r) => r.id}
                                                getOptionLabel={(r) => r.grocery_list?.name || r.name}
                                                placeholder="Select a recipe..."
                                                searchPlaceholder="Search recipes..."
                                                autoFocus
                                                onAddNew={() => {
                                                    setPendingSlotInfo({ date: currentDay, slot, dinerId: config.id });
                                                    setIsAddRecipeModalOpen(true);
                                                }}
                                                addNewLabel="Create new recipe..."
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setAddingTo(null); setSelectedRecipe(''); }}
                                                    className="flex-1 py-2 text-sm font-medium text-ink-500 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddRecipe}
                                                    disabled={!selectedRecipe}
                                                    className="flex-1 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                                                >
                                                    Add Meal
                                                </button>
                                            </div>
                                        </div>
                                    ) : hasPlans ? (
                                        <div className="space-y-2">
                                            {/* Recipe Pills - show up to 2, collapse rest */}
                                            {slotPlans.length <= 2 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {recipesInSlot.map(({ planId, name }) => (
                                                        <div
                                                            key={planId}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full text-sm font-medium text-ink-800"
                                                        >
                                                            <span className="max-w-[140px] truncate">{name}</span>
                                                            <button
                                                                onClick={() => onDeleteMeal(planId)}
                                                                className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-base-100 border border-base-300 rounded-full text-sm font-medium text-ink-800">
                                                        <span className="max-w-[140px] truncate">{recipesInSlot[0].name}</span>
                                                        <button
                                                            onClick={() => onDeleteMeal(recipesInSlot[0].planId)}
                                                            className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <span className="px-3 py-1.5 bg-base-200 rounded-full text-xs font-medium text-ink-500">
                                                        +{slotPlans.length - 1} more
                                                    </span>
                                                </div>
                                            )}
                                            {/* Add Another Button */}
                                            <button
                                                onClick={() => setAddingTo({ date: currentDay, slot, dinerId: config.id })}
                                                className="w-full py-2 flex items-center justify-center gap-1.5 text-accent text-sm font-medium hover:bg-accent/5 rounded-lg transition-colors"
                                            >
                                                <Plus size={16} />
                                                <span>Add Another</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingTo({ date: currentDay, slot, dinerId: config.id })}
                                            className="w-full py-4 flex items-center justify-center gap-2 text-ink-300 hover:text-accent border-2 border-dashed border-base-300 rounded-lg hover:border-accent/30 transition-colors"
                                        >
                                            <Plus size={18} />
                                            <span className="text-sm font-medium">Add Meal</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <AddRecipeModal
                isOpen={isAddRecipeModalOpen}
                onClose={() => {
                    setIsAddRecipeModalOpen(false);
                    setPendingSlotInfo(null);
                }}
                onRecipeCreated={handleRecipeCreated}
            />
        </div>
    );
};
