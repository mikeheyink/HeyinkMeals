import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { Card } from '../ui/Card';
import type { PlannerConfigItem } from '../../services/preferencesService';
import { planEntryLabel } from '../../lib/planEntry';

interface PlannerGridProps {
    days: Date[];
    plans: any[];
    activeConfigs: PlannerConfigItem[];
    onSelectSlot: (date: Date, mealSlot: string) => void;
    onDeleteMeal: (planId: string) => Promise<void>;
}

export function PlannerGrid({
    days,
    plans,
    activeConfigs,
    onSelectSlot,
    onDeleteMeal
}: PlannerGridProps) {
    const totalActiveSlots = activeConfigs.reduce((sum, c) => sum + c.slots.length, 0);

    const getPlansForSlot = (date: Date, mealType: string, dinerType: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return plans.filter(p => p.date === dateStr && p.slot === mealType && p.diner_type === dinerType);
    };

    return (
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
                            className="grid border-t border-base-300 shadow-none hover:bg-base-50/50 transition-colors"
                            style={{ gridTemplateColumns: `120px repeat(${totalActiveSlots}, 1fr)` }}
                        >
                            {/* Date Cell */}
                            <div className="p-4 bg-base-200 border-r border-base-300 flex flex-col justify-center sticky-left min-h-[100px] group">
                                <span className="text-xs font-bold text-ink-900">{format(day, 'EEEE')}</span>
                                <span className="text-[10px] text-ink-500">{format(day, 'MMM d')}</span>
                            </div>

                            {/* Meal Cells */}
                            {activeConfigs.map((config) =>
                                config.slots.map((meal) => {
                                    const slotPlans = getPlansForSlot(day, meal, config.id);
                                    const hasPlans = slotPlans.length > 0;
                                    const mealSlotStr = `${config.id}-${meal}`;

                                    const recipesInSlot = slotPlans.map(plan => ({
                                        planId: plan.id,
                                        name: planEntryLabel(plan)
                                    }));

                                    return (
                                        <div
                                            key={mealSlotStr}
                                            className="p-3 bg-white min-h-[100px] group/cell border-r border-base-300 last:border-r-0 hover:bg-base-50 transition-colors cursor-pointer"
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('button')) return;
                                                onSelectSlot(day, mealSlotStr);
                                            }}
                                        >
                                            {hasPlans ? (
                                                <div className="h-full flex flex-col justify-between">
                                                    <div className="space-y-1">
                                                        {slotPlans.length <= 2 ? (
                                                            recipesInSlot.map(({ planId, name }) => (
                                                                <div key={planId} className="flex items-center gap-1 group/chip">
                                                                    <span className="text-[11px] font-semibold text-ink-900 line-clamp-1 leading-tight flex-1">
                                                                        {name}
                                                                    </span>
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            await onDeleteMeal(planId);
                                                                        }}
                                                                        className="p-1 rounded hover:bg-red-100 hover:text-red-600 transition-all text-ink-400"
                                                                    title="Remove meal"
    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-1 group/chip">
                                                                    <span className="text-[11px] font-semibold text-ink-900 line-clamp-1 leading-tight flex-1">
                                                                        {recipesInSlot[0].name}
                                                                    </span>
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            await onDeleteMeal(recipesInSlot[0].planId);
                                                                        }}
                                                                        className="p-1 rounded hover:bg-red-100 hover:text-red-600 transition-all text-ink-400"
                                                                    title="Remove meal"
    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                                <span className="text-[10px] text-ink-400">
                                                                    +{slotPlans.length - 1} more recipe{slotPlans.length > 2 ? 's' : ''}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div
                                                        className="flex items-center justify-end gap-1 text-[10px] text-accent mt-1 opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                                    >
                                                        <Plus size={10} /> Add
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="w-full h-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity bg-base-100/50 rounded-md border border-dashed border-base-300 group-active/cell:bg-base-200"
                                                >
                                                    <Plus size={14} className="text-ink-300 group-hover/cell:text-accent transition-colors" />
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
        </Card>
    );
}
