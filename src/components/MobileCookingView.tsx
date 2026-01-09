import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ChefHat, ChevronRight, BookOpen, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';

interface MobileCookingViewProps {
    days: Date[];
    plans: any[];
    recipes: any[];
    activeConfigs: { id: string; slots: string[] }[];
}

export const MobileCookingView = ({
    days,
    plans,
    recipes,
    activeConfigs
}: MobileCookingViewProps) => {
    const navigate = useNavigate();

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

    // Find the next upcoming meal for today
    const findNextMeal = () => {
        const today = days.find(d => isToday(d));
        if (!today) return null;

        const slotOrder = ['Breakfast', 'Lunch', 'Dinner'];
        const currentHour = new Date().getHours();
        const currentSlotIndex = currentHour < 10 ? 0 : currentHour < 14 ? 1 : 2;

        for (let i = currentSlotIndex; i < slotOrder.length; i++) {
            for (const config of activeConfigs) {
                if (config.slots.includes(slotOrder[i])) {
                    const plan = getPlanForSlot(today, slotOrder[i], config.id);
                    if (plan) {
                        const recipe = recipes.find(r => r.id === plan.reference_id);
                        return {
                            plan,
                            recipe,
                            slot: slotOrder[i],
                            diner: config.id,
                            time: i === 0 ? '8:00 AM' : i === 1 ? '12:30 PM' : '6:30 PM'
                        };
                    }
                }
            }
        }
        return null;
    };

    const nextMeal = findNextMeal();

    return (
        <div className="space-y-6">
            {/* Hero: Next Meal */}
            {nextMeal ? (
                <div className="bg-gradient-to-br from-accent to-accent/80 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-wider mb-3">
                        <Clock size={14} />
                        <span>Up Next • {nextMeal.time}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">{nextMeal.recipe?.name || 'Unknown Recipe'}</h2>
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase">
                            {nextMeal.slot}
                        </span>
                        <span>•</span>
                        <span>{nextMeal.diner}</span>
                    </div>
                    <Button
                        onClick={() => navigate(`/cooking/${nextMeal.plan.id}`)}
                        className="w-full bg-white text-accent hover:bg-white/90 font-bold"
                    >
                        <ChevronRight size={18} />
                        Start Cooking
                    </Button>
                </div>
            ) : (
                <div className="bg-base-200 rounded-2xl p-8 text-center">
                    <ChefHat size={48} className="mx-auto text-ink-300 mb-4" />
                    <h2 className="text-lg font-bold text-ink-700">No meals scheduled</h2>
                    <p className="text-sm text-ink-500">Plan your meals in the Planner tab</p>
                </div>
            )}

            {/* Day Timeline */}
            {days.map((day) => {
                const dayPlans: any[] = [];
                activeConfigs.forEach(config => {
                    config.slots.forEach(slot => {
                        const plan = getPlanForSlot(day, slot, config.id);
                        if (plan) {
                            const recipe = recipes.find(r => r.id === plan.reference_id);
                            dayPlans.push({ plan, recipe, slot, diner: config.id });
                        }
                    });
                });

                if (dayPlans.length === 0) return null;

                return (
                    <div key={day.toString()} className="space-y-3">
                        <h3 className={`text-xs font-black uppercase tracking-widest px-1 ${isToday(day) ? 'text-accent' : 'text-ink-300'
                            }`}>
                            {getDayLabel(day)} — {format(day, 'MMM d')}
                        </h3>
                        <div className="space-y-2">
                            {dayPlans.map(({ plan, recipe, slot, diner }) => (
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
                                            {recipe?.name || 'Unknown Recipe'}
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
                );
            })}
        </div>
    );
};
