import { useRef, useEffect } from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { ChefHat, ChevronRight, ChevronLeft, BookOpen, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';

interface MobileCookingViewProps {
    days: Date[];
    plans: any[];
    recipes: any[];
    activeConfigs: { id: string; slots: string[] }[];
    anchorDate: Date;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onNavigateWeek: (direction: 'prev' | 'next') => void;
    onNavigateDay: (direction: 'prev' | 'next') => void;
    onJumpToToday: () => void;
}

export const MobileCookingView = ({
    days,
    plans,
    recipes,
    activeConfigs,
    selectedDate,
    onSelectDate,
    onNavigateDay,
    onJumpToToday
}: MobileCookingViewProps) => {
    const navigate = useNavigate();
    const stripRef = useRef<HTMLDivElement>(null);
    const todayChipRef = useRef<HTMLButtonElement>(null);

    // Auto-scroll selected day chip into view using scrollLeft for reliability
    useEffect(() => {
        const strip = stripRef.current;
        const chip = strip?.querySelector('[data-selected="true"]') as HTMLElement | null;
        if (strip && chip) {
            const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
            const scrollTarget = chipCenter - strip.offsetWidth / 2;
            strip.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        }
    }, [selectedDate, days]);

    const getPlansForSlot = (date: Date, mealType: string, dinerType: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return plans.filter(p => p.date === dateStr && p.slot === mealType && p.diner_type === dinerType);
    };

    // Find the next upcoming meals for today
    const findNextMeals = () => {
        const today = days.find(d => isToday(d));
        if (!today) return null;

        const slotOrder = ['Breakfast', 'Lunch', 'Dinner'];
        const currentHour = new Date().getHours();
        const currentSlotIndex = currentHour < 10 ? 0 : currentHour < 14 ? 1 : 2;

        for (let i = currentSlotIndex; i < slotOrder.length; i++) {
            const slotMeals: { plan: any; recipe: any; displayName: string; slot: string; diner: string; time: string }[] = [];
            for (const config of activeConfigs) {
                if (config.slots.includes(slotOrder[i])) {
                    const slotPlans = getPlansForSlot(today, slotOrder[i], config.id);
                    for (const plan of slotPlans) {
                        const recipe = recipes.find(r => r.id === plan.reference_id);
                        const displayName = recipe?.grocery_list?.name || recipe?.name || 'Unknown';
                        slotMeals.push({
                            plan,
                            recipe,
                            displayName,
                            slot: slotOrder[i],
                            diner: config.id,
                            time: i === 0 ? '8:00 AM' : i === 1 ? '12:30 PM' : '6:30 PM'
                        });
                    }
                }
            }
            if (slotMeals.length > 0) return slotMeals;
        }
        return null;
    };

    const nextMeals = findNextMeals();
    const viewingToday = isToday(selectedDate);
    const viewContainsToday = days.some(d => isToday(d));

    // Build meal cards for the selected day
    const dayPlans: any[] = [];
    activeConfigs.forEach(config => {
        config.slots.forEach(slot => {
            const slotPlans = getPlansForSlot(selectedDate, slot, config.id);
            for (const plan of slotPlans) {
                const recipe = recipes.find(r => r.id === plan.reference_id);
                const displayName = recipe?.grocery_list?.name || recipe?.name || 'Unknown';
                dayPlans.push({ plan, recipe, displayName, slot, diner: config.id });
            }
        });
    });

    return (
        <div className="space-y-6">
            {/* Date Strip Navigation */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onNavigateDay('prev')}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-base-200 active:bg-base-300 text-ink-500 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>

                <div
                    ref={stripRef}
                    className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide py-1 px-1 snap-x snap-mandatory"
                >
                    {days.map((day) => {
                        const selected = isSameDay(day, selectedDate);
                        const today = isToday(day);
                        return (
                            <button
                                key={day.toString()}
                                ref={today ? todayChipRef : undefined}
                                data-selected={selected ? 'true' : undefined}
                                onClick={() => onSelectDate(day)}
                                className={`snap-center flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-center transition-all min-w-[52px] ${selected
                                        ? today
                                            ? 'bg-accent text-white shadow-md'
                                            : 'bg-ink-900 text-white shadow-md'
                                        : today
                                            ? 'bg-accent/10 text-accent'
                                            : 'bg-base-200 text-ink-500 hover:bg-base-300'
                                    }`}
                            >
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {format(day, 'EEE')}
                                </span>
                                <span className="text-lg font-black leading-none">
                                    {format(day, 'd')}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => onNavigateDay('next')}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-base-200 active:bg-base-300 text-ink-500 transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Today pill — only show when today is not in the current view */}
            {!viewContainsToday && (
                <div className="flex justify-center">
                    <button
                        onClick={onJumpToToday}
                        className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-bold shadow-md hover:bg-accent/90 active:bg-accent/80 transition-colors"
                    >
                        Jump to Today
                    </button>
                </div>
            )}

            {/* Hero: Next Meal — only when viewing today */}
            {viewingToday && nextMeals && nextMeals.length > 0 && (
                <div className="bg-gradient-to-br from-accent to-accent/80 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-wider mb-3">
                        <Clock size={14} />
                        <span>Up Next • {nextMeals[0].time}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">{nextMeals[0].displayName}</h2>
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase">
                            {nextMeals[0].slot}
                        </span>
                        <span>•</span>
                        <span>{nextMeals[0].diner}</span>
                        {nextMeals.length > 1 && (
                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">
                                +{nextMeals.length - 1} more
                            </span>
                        )}
                    </div>
                    <Button
                        onClick={() => navigate(`/cooking/${nextMeals[0].plan.id}`)}
                        className="w-full bg-white text-accent hover:bg-white/90 font-bold"
                    >
                        <ChevronRight size={18} />
                        Start Cooking
                    </Button>
                </div>
            )}

            {/* No meals hero — only when viewing today and nothing scheduled */}
            {viewingToday && (!nextMeals || nextMeals.length === 0) && dayPlans.length === 0 && (
                <div className="bg-base-200 rounded-2xl p-8 text-center">
                    <ChefHat size={48} className="mx-auto text-ink-300 mb-4" />
                    <h2 className="text-lg font-bold text-ink-700">No meals scheduled</h2>
                    <p className="text-sm text-ink-500">Plan your meals in the Planner tab</p>
                </div>
            )}

            {/* Meal Cards for Selected Day */}
            {dayPlans.length > 0 ? (
                <div className="space-y-3">
                    <h3 className={`text-xs font-black uppercase tracking-widest px-1 ${viewingToday ? 'text-accent' : 'text-ink-300'
                        }`}>
                        {viewingToday ? 'Today' : format(selectedDate, 'EEEE')} — {format(selectedDate, 'MMM d')}
                    </h3>
                    <div className="space-y-2">
                        {dayPlans.map(({ plan, displayName, slot, diner }) => (
                            <button
                                key={plan.id}
                                onClick={() => navigate(`/cooking/${plan.id}`)}
                                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-base-300 shadow-sm hover:shadow-md active:bg-base-100 transition-all text-left"
                            >
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center">
                                    <BookOpen size={18} className="text-ink-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-ink-900 truncate">
                                        {displayName}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-ink-500">
                                        <span className="font-bold uppercase">{slot}</span>
                                        <span className="text-ink-300">•</span>
                                        <span>{diner}</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-ink-300 flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            ) : !viewingToday && (
                <div className="bg-base-200 rounded-2xl p-8 text-center">
                    <ChefHat size={48} className="mx-auto text-ink-300 mb-4" />
                    <h2 className="text-lg font-bold text-ink-700">No meals planned</h2>
                    <p className="text-sm text-ink-500">Nothing scheduled for {format(selectedDate, 'EEEE, MMM d')}</p>
                </div>
            )}
        </div>
    );
};
