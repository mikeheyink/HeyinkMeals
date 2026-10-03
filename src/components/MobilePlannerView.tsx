import { useEffect, useRef, useState } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PlanEntryForm } from './planner/PlanEntryForm';
import { PlanEntrySheet } from './planner/PlanEntrySheet';
import type { PlannedEntry } from './planner/PlanEntrySheet';
import { ResponsiveModal } from './ui/ResponsiveModal';
import { RecipeThumb } from './recipes/RecipeThumb';
import { planEntryLabel } from '../lib/planEntry';
import type { PlanEntryDraft } from '../services/plannerService';

interface NamedOption { id: string; name: string }
interface RecipeOption { id: string; name: string; servings?: number | null; isFavourite?: boolean }
interface SlotTarget { date: Date; slot: string; dinerId: string }

interface MobilePlannerViewProps {
    days: Date[];
    plans: PlannedEntry[];
    recipes: RecipeOption[];
    items: NamedOption[];
    lists: NamedOption[];
    activeConfigs: { id: string; slots: string[] }[];
    onAddEntry: (date: Date, slot: string, dinerId: string, draft: PlanEntryDraft) => Promise<void>;
    onDeleteMeal: (planId: string) => Promise<void>;
    onCreateRecipe?: () => Promise<{ id: string; servings?: number | null } | undefined>;
    onCreateItem?: (name: string) => Promise<string | undefined>;
    onRequestPreviousWeek?: () => void;
    onRequestNextWeek?: () => void;
}

const SLOT_ORDER = ['Breakfast', 'Lunch', 'Dinner'];

const dayLabel = (d: Date) => (isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEEE'));

/**
 * The phone planner: one scrolling agenda of days. Each day lists its meal slots as slim rows —
 * planned meals show a thumbnail and name (tap for details), empty slots are a single quiet "+"
 * row. Adding happens in a bottom sheet, so the agenda never reflows under your thumb.
 */
export const MobilePlannerView = ({
    days,
    plans,
    recipes,
    items,
    lists,
    activeConfigs,
    onAddEntry,
    onDeleteMeal,
    onCreateRecipe,
    onCreateItem,
    onRequestPreviousWeek,
    onRequestNextWeek,
}: MobilePlannerViewProps) => {
    const [addingTo, setAddingTo] = useState<SlotTarget | null>(null);
    const [openEntry, setOpenEntry] = useState<PlannedEntry | null>(null);
    const dayRefs = useRef<Map<string, HTMLElement>>(new Map());
    const showDiner = activeConfigs.length > 1;

    // Rows in the order you eat: Breakfast → Lunch → Dinner, each diner group within a slot.
    const rows = SLOT_ORDER.flatMap(slot =>
        activeConfigs.filter(c => c.slots.includes(slot)).map(c => ({ slot, dinerId: c.id })),
    );

    const plansFor = (dateStr: string, slot: string, dinerId: string) =>
        plans.filter(p => p.date === dateStr && p.slot === slot && p.diner_type === dinerId);

    const scrollToDay = (day: Date) => {
        dayRefs.current.get(format(day, 'yyyy-MM-dd'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Land on today when the view first contains it.
    const firstDay = days[0] ? format(days[0], 'yyyy-MM-dd') : '';
    useEffect(() => {
        const today = days.find(d => isToday(d));
        if (today) dayRefs.current.get(format(today, 'yyyy-MM-dd'))?.scrollIntoView({ block: 'start' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firstDay]);

    return (
        <div className="-mx-4">
            {/* Week strip — jump to a day; dots show days that already have something planned */}
            <div className="sticky top-0 z-30 bg-base-200/95 backdrop-blur px-2 py-2 flex items-center gap-1 border-b border-base-300">
                <button onClick={onRequestPreviousWeek} className="p-2 text-ink-400 active:text-ink-900" aria-label="Previous week">
                    <ChevronLeft size={18} />
                </button>
                <div className="flex-1 flex justify-between">
                    {days.slice(0, 7).map(day => {
                        const planned = plans.some(p => p.date === format(day, 'yyyy-MM-dd'));
                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => scrollToDay(day)}
                                className={`flex flex-col items-center w-10 py-1 rounded-lg ${isToday(day) ? 'bg-accent text-white' : 'text-ink-700 active:bg-base-300'}`}
                            >
                                <span className="text-[10px] font-semibold uppercase opacity-70">{format(day, 'EEEEE')}</span>
                                <span className="text-sm font-bold leading-tight">{format(day, 'd')}</span>
                                <span className={`w-1 h-1 rounded-full mt-0.5 ${planned ? (isToday(day) ? 'bg-white' : 'bg-accent') : 'bg-transparent'}`} />
                            </button>
                        );
                    })}
                </div>
                <button onClick={onRequestNextWeek} className="p-2 text-ink-400 active:text-ink-900" aria-label="Next week">
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Agenda */}
            <div className="pb-6">
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    return (
                        <section
                            key={dateStr}
                            ref={el => { if (el) dayRefs.current.set(dateStr, el); else dayRefs.current.delete(dateStr); }}
                            className="scroll-mt-16"
                        >
                            <h2 className={`px-4 pt-5 pb-1.5 text-sm font-bold ${isToday(day) ? 'text-accent' : 'text-ink-900'}`}>
                                {dayLabel(day)} <span className="font-medium text-ink-400">{format(day, 'd MMM')}</span>
                            </h2>
                            <div className="bg-white border-y border-base-300 divide-y divide-base-300">
                                {rows.map(({ slot, dinerId }) => {
                                    const entries = plansFor(dateStr, slot, dinerId);
                                    const add = () => setAddingTo({ date: day, slot, dinerId });
                                    return (
                                        <div key={`${slot}-${dinerId}`} className="flex items-start gap-3 pl-4 pr-1 min-h-[2.75rem]">
                                            <div className="w-[4.5rem] flex-shrink-0 pt-2.5 leading-tight">
                                                <div className="text-xs font-semibold text-ink-500">{slot}</div>
                                                {showDiner && <div className="text-[11px] text-ink-300">{dinerId}</div>}
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                {entries.map(entry => (
                                                    <button
                                                        key={entry.id}
                                                        onClick={() => setOpenEntry(entry)}
                                                        className="w-full flex items-center gap-2.5 py-1.5 text-left active:opacity-60"
                                                    >
                                                        {entry.entry_type === 'Recipe' ? (
                                                            <RecipeThumb imageUrl={entry.recipe?.image_url} name={planEntryLabel(entry)} className="w-8 h-8 rounded-md text-xs" />
                                                        ) : (
                                                            <span className="w-8 h-8 flex-shrink-0 rounded-md border border-dashed border-base-300" aria-hidden="true" />
                                                        )}
                                                        <span className={`truncate text-[15px] ${entry.entry_type === 'Note' ? 'italic text-ink-500' : 'font-medium text-ink-900'}`}>
                                                            {planEntryLabel(entry)}
                                                        </span>
                                                    </button>
                                                ))}
                                                {entries.length === 0 && (
                                                    <button onClick={add} className="w-full h-9" aria-label={`Add to ${slot}, ${format(day, 'EEEE')}`} />
                                                )}
                                            </div>
                                            <button
                                                onClick={add}
                                                className="flex-shrink-0 w-11 h-11 flex items-center justify-center text-ink-300 active:text-accent"
                                                aria-label={`Add another to ${slot}, ${format(day, 'EEEE')}`}
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>

            {/* Add sheet */}
            {/* Tall sheet: keeps the search box near the top so its results open downwards, in view. */}
            <ResponsiveModal isOpen={!!addingTo} onClose={() => setAddingTo(null)} className="w-full h-[85vh]">
                {addingTo && (
                    <div className="px-5 pb-6 sm:pt-5 space-y-4 overflow-y-auto">
                        <div>
                            <h3 className="text-lg font-bold text-ink-900">Plan {addingTo.slot.toLowerCase()}</h3>
                            <p className="text-sm text-ink-500">
                                {dayLabel(addingTo.date)}, {format(addingTo.date, 'd MMM')}{showDiner ? ` · ${addingTo.dinerId}` : ''}
                            </p>
                        </div>
                        <PlanEntryForm
                            recipes={recipes}
                            items={items}
                            lists={lists}
                            onCreateRecipe={onCreateRecipe}
                            onCreateItem={onCreateItem}
                            onSubmit={async (draft) => {
                                await onAddEntry(addingTo.date, addingTo.slot, addingTo.dinerId, draft);
                                setAddingTo(null);
                            }}
                        />
                    </div>
                )}
            </ResponsiveModal>

            <PlanEntrySheet entry={openEntry} onClose={() => setOpenEntry(null)} onRemove={onDeleteMeal} />
        </div>
    );
};
