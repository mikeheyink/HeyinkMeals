import { useEffect, useState } from 'react';
import { plannerService } from '../../services/plannerService';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, X, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';

export const PlannerPage = () => {
    const [days, setDays] = useState<Date[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);

    const [addingTo, setAddingTo] = useState<{ date: Date, meal: string } | null>(null);
    const [selectedRecipe, setSelectedRecipe] = useState('');

    const allSlots = ['Breakfast', 'Lunch', 'Dinner'] as const;

    // Customization Settings
    const [plannerConfig, setPlannerConfig] = useState<{ id: string, slots: string[] }[]>(() => {
        const saved = localStorage.getItem('planner_config_v3');
        if (saved) return JSON.parse(saved);
        return [
            { id: 'Everyone', slots: ['Breakfast', 'Lunch', 'Dinner'] },
            { id: 'Parents', slots: ['Breakfast', 'Lunch', 'Dinner'] },
            { id: 'Children', slots: ['Breakfast', 'Lunch', 'Dinner'] }
        ];
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('planner_config_v3', JSON.stringify(plannerConfig));
    }, [plannerConfig]);

    useEffect(() => {
        const today = startOfDay(new Date());
        const week = Array.from({ length: 11 }, (_, i) => addDays(today, i));
        setDays(week);
        loadData(week[0], week[10]);
    }, []);

    const loadData = async (start: Date, end: Date) => {
        try {
            const startStr = format(start, 'yyyy-MM-dd');
            const endStr = format(end, 'yyyy-MM-dd');
            const p = await plannerService.getPlanForRange(startStr, endStr);
            setPlans(p || []);

            const { data } = await supabase.from('recipes').select('id, name');
            if (data) {
                setRecipes(data);
                if (data.length > 0 && !selectedRecipe) setSelectedRecipe(data[0].id);
            }
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
            setPlannerConfig(newConfig);
        }
    };

    const toggleSlot = (dinerId: string, slot: string) => {
        setPlannerConfig(prev => prev.map(item => {
            if (item.id !== dinerId) return item;
            const newSlots = item.slots.includes(slot)
                ? item.slots.filter(s => s !== slot)
                : [...item.slots, slot].sort((a, b) =>
                    allSlots.indexOf(a as any) - allSlots.indexOf(b as any)
                );
            return { ...item, slots: newSlots };
        }));
    };

    const activeConfigs = plannerConfig.filter(c => c.slots.length > 0);
    const totalActiveSlots = activeConfigs.reduce((sum, c) => sum + c.slots.length, 0);

    return (
        <div className="space-y-8">
            <PageHeader
                title="Meal Planner"
                subtitle={`${format(days[0] || new Date(), 'MMM d')} — ${format(days[10] || new Date(), 'MMM d')}`}
                actions={
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            icon={Settings}
                        >
                            Customize View
                        </Button>

                        {isSettingsOpen && (
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
                    </div>
                }
            />

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
                                        const currentRecipeName = plan ? recipes.find(r => r.id === plan.reference_id)?.name : null;

                                        return (
                                            <div key={`${config.id}-${meal}`} className={`p-3 bg-white min-h-[100px] group border-r border-base-300 last:border-r-0`}>
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-1 h-full">
                                                        <select
                                                            value={selectedRecipe || plan?.reference_id || ''}
                                                            onChange={async (e) => {
                                                                const newVal = e.target.value;
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
                                                            className="zen-input w-full p-1 text-xs"
                                                            autoFocus
                                                        >
                                                            <option value="">Select...</option>
                                                            {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                        </select>
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
        </div>
    );
};
