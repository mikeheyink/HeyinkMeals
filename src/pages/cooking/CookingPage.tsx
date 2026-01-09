import { useEffect, useState } from 'react';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { plannerService } from '../../services/plannerService';
import { preferencesService } from '../../services/preferencesService';
import type { PlannerConfigItem } from '../../services/preferencesService';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { ChefHat, ChevronRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { MobileCookingView } from '../../components/MobileCookingView';
import { useIsMobile } from '../../hooks/useMediaQuery';

const DEFAULT_PLANNER_CONFIG: PlannerConfigItem[] = [
    { id: 'Everyone', slots: ['Breakfast', 'Lunch', 'Dinner'] },
    { id: 'Parents', slots: ['Breakfast', 'Lunch', 'Dinner'] },
    { id: 'Children', slots: ['Breakfast', 'Lunch', 'Dinner'] }
];

export const CookingPage = () => {
    const navigate = useNavigate();
    const [days, setDays] = useState<Date[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Load config from database
    const [plannerConfig, setPlannerConfig] = useState<PlannerConfigItem[]>(DEFAULT_PLANNER_CONFIG);

    useEffect(() => {
        preferencesService.getPlannerConfig().then(config => {
            setPlannerConfig(config);
        });
    }, []);

    useEffect(() => {
        const today = startOfDay(new Date());
        // Focused 3-day view: Yesterday, Today, Tomorrow
        const range = [addDays(today, -1), today, addDays(today, 1)];
        setDays(range);
        loadData(range[0], range[2]);
    }, []);

    const loadData = async (start: Date, end: Date) => {
        setLoading(true);
        try {
            const startStr = format(start, 'yyyy-MM-dd');
            const endStr = format(end, 'yyyy-MM-dd');
            const p = await plannerService.getPlanForRange(startStr, endStr);
            setPlans(p || []);

            const { data } = await supabase.from('recipes').select('id, name');
            if (data) setRecipes(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getPlanForSlot = (date: Date, mealType: string, dinerType: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return plans.find(p => p.date === dateStr && p.slot === mealType && p.diner_type === dinerType);
    };

    const activeConfigs = plannerConfig.filter(c => c.slots.length > 0);
    const totalActiveSlots = activeConfigs.reduce((sum, c) => sum + c.slots.length, 0);
    const isMobile = useIsMobile();

    return (
        <div className="space-y-8">
            <PageHeader
                title="Cooking Terminal"
                subtitle="Execute your culinary sequence with focus."
            />

            {loading ? (
                <div className="flex items-center justify-center p-20 text-ink-300">
                    <ChefHat size={48} className="animate-bounce" />
                </div>
            ) : isMobile ? (
                <MobileCookingView
                    days={days}
                    plans={plans}
                    recipes={recipes}
                    activeConfigs={activeConfigs}
                />
            ) : (
                /* Desktop View */
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-[1000px] compact-grid !gap-0 !bg-transparent border-none">
                        {/* Header: Diner Types */}
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

                        {/* Header: Slots */}
                        <div
                            className="grid sticky top-[33px] z-30 bg-base-100 text-[10px] font-black uppercase tracking-widest text-ink-500 border-b border-base-300 shadow-sm"
                            style={{ gridTemplateColumns: `120px repeat(${totalActiveSlots}, 1fr)` }}
                        >
                            <div className="p-3 border-r border-base-300 sticky left-0 z-40 bg-base-100">Date</div>
                            {activeConfigs.map((config, cIdx) =>
                                config.slots.map((slot, sIdx) => (
                                    <div
                                        key={`${config.id}-${slot}`}
                                        className={`p-3 text-center border-r border-base-300 bg-base-100 ${(cIdx === activeConfigs.length - 1 && sIdx === config.slots.length - 1) ? 'border-r-0' : ''}`}
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
                                className={`grid border-t border-base-300 ${isToday(day) ? 'bg-accent/[0.03]' : ''}`}
                                style={{ gridTemplateColumns: `120px repeat(${totalActiveSlots}, 1fr)` }}
                            >
                                {/* Date Cell */}
                                <div className={`p-4 border-r border-base-300 flex flex-col justify-center sticky-left min-h-[120px] ${isToday(day) ? 'bg-accent/10 shadow-[2px_0_5px_-2px_rgba(37,99,235,0.1)]' : 'bg-base-200'}`}>
                                    <span className={`text-xs font-bold ${isToday(day) ? 'text-accent' : 'text-ink-900'}`}>
                                        {isToday(day) ? 'Today' : format(day, 'EEEE')}
                                    </span>
                                    <span className="text-[10px] text-ink-500">{format(day, 'MMM d')}</span>
                                </div>

                                {/* Interaction Cells */}
                                {activeConfigs.map((config) =>
                                    config.slots.map((meal) => {
                                        const plan = getPlanForSlot(day, meal, config.id);
                                        const currentRecipeName = plan ? recipes.find(r => r.id === plan.reference_id)?.name : null;

                                        return (
                                            <div key={`${config.id}-${meal}`} className={`p-3 min-h-[120px] bg-white group border-r border-base-300 last:border-r-0 flex flex-col justify-between items-start transition-colors ${isToday(day) ? 'bg-accent/[0.01]' : ''}`}>
                                                {plan ? (
                                                    <>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 text-ink-300">
                                                                <BookOpen size={10} />
                                                                <span className="text-[9px] font-bold uppercase tracking-tight">{meal}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-ink-900 line-clamp-2 leading-tight">
                                                                {currentRecipeName}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            onClick={() => navigate(`/cooking/${plan.id}`)}
                                                            variant="primary"
                                                            className="w-full mt-2 h-8 text-[10px] font-black uppercase tracking-widest py-0 px-2 justify-between group/btn"
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                                Start
                                                            </span>
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 select-none">
                                                        <ChefHat size={20} className="text-ink-300 mb-1" />
                                                        <span className="text-[8px] font-black uppercase tracking-tighter text-ink-300">Resting</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
