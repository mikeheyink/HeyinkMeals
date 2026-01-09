import { useState, useRef } from 'react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

interface MobilePlannerViewProps {
    days: Date[];
    plans: any[];
    recipes: any[];
    activeConfigs: { id: string; slots: string[] }[];
    onAddMeal: (date: Date, slot: string, dinerId: string, recipeId: string) => Promise<void>;
    onDeleteMeal: (planId: string) => Promise<void>;
}

export const MobilePlannerView = ({
    days,
    plans,
    recipes,
    activeConfigs,
    onAddMeal,
    onDeleteMeal
}: MobilePlannerViewProps) => {
    const [currentDayIndex, setCurrentDayIndex] = useState(() => {
        // Start on today
        const todayIdx = days.findIndex(d => isToday(d));
        return todayIdx >= 0 ? todayIdx : 0;
    });
    const [addingTo, setAddingTo] = useState<{ date: Date; slot: string; dinerId: string } | null>(null);
    const [selectedRecipe, setSelectedRecipe] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const currentDay = days[currentDayIndex];

    const getDayLabel = (date: Date) => {
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'EEEE');
    };

    const getPlanForSlot = (date: Date, mealType: string, dinerType: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return plans.find(p => p.date === dateStr && p.slot === mealType && p.diner_type === dinerType);
    };

    const handleSwipe = (direction: 'left' | 'right') => {
        if (direction === 'left' && currentDayIndex < days.length - 1) {
            setCurrentDayIndex(prev => prev + 1);
        } else if (direction === 'right' && currentDayIndex > 0) {
            setCurrentDayIndex(prev => prev - 1);
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
                    disabled={currentDayIndex === 0}
                    className="p-2 rounded-lg hover:bg-base-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="text-center">
                    <div className={`text-lg font-bold ${isToday(currentDay) ? 'text-accent' : 'text-ink-900'}`}>
                        {getDayLabel(currentDay)}
                    </div>
                    <div className="text-xs text-ink-500">{format(currentDay, 'MMMM d, yyyy')}</div>
                </div>
                <button
                    onClick={() => handleSwipe('left')}
                    disabled={currentDayIndex === days.length - 1}
                    className="p-2 rounded-lg hover:bg-base-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Day dots indicator */}
            <div className="flex justify-center gap-1.5">
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
                        const plan = getPlanForSlot(currentDay, slot, config.id);
                        const recipeName = plan ? recipes.find(r => r.id === plan.reference_id)?.name : null;
                        const isEditing = addingTo?.date === currentDay && addingTo?.slot === slot && addingTo?.dinerId === config.id;

                        return (
                            <div
                                key={`${config.id}-${slot}`}
                                className={`bg-white rounded-xl border border-base-300 overflow-hidden shadow-sm transition-all ${isEditing ? 'ring-2 ring-accent' : ''
                                    }`}
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
                                            <select
                                                value={selectedRecipe}
                                                onChange={(e) => setSelectedRecipe(e.target.value)}
                                                className="zen-input w-full"
                                                autoFocus
                                            >
                                                <option value="">Select a recipe...</option>
                                                {recipes.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
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
                                    ) : plan ? (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-ink-900">{recipeName || 'Unknown Recipe'}</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setAddingTo({ date: currentDay, slot, dinerId: config.id })}
                                                    className="p-2 rounded-lg text-ink-300 hover:text-accent hover:bg-accent/10 transition-colors"
                                                    title="Change"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteMeal(plan.id)}
                                                    className="p-2 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Remove"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
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
        </div>
    );
};
