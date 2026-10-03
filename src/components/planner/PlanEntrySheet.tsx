import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ChefHat, Trash2 } from 'lucide-react';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { RecipeThumb } from '../recipes/RecipeThumb';
import { SourceLink } from '../recipes/SourceLink';
import { planEntryLabel, isCookable } from '../../lib/planEntry';
import type { PlanEntryLike } from '../../lib/planEntry';

export interface PlannedEntry extends PlanEntryLike {
    id: string;
    date: string;
    slot: string;
    diner_type: string;
    servings?: number | null;
}

interface PlanEntrySheetProps {
    entry: PlannedEntry | null;
    onClose: () => void;
    onRemove: (id: string) => void;
}

/**
 * Tapping a planned meal opens this: the recipe's photo, a link to the original page, and the two
 * things you actually do from here — cook it, or take it off the plan.
 */
export function PlanEntrySheet({ entry, onClose, onRemove }: PlanEntrySheetProps) {
    const navigate = useNavigate();
    const recipe = entry?.recipe;

    return (
        <ResponsiveModal isOpen={!!entry} onClose={onClose}>
            {entry && (
                <div className="px-5 pb-6 sm:pt-5 space-y-4 overflow-y-auto">
                    {recipe?.image_url && (
                        <RecipeThumb imageUrl={recipe.image_url} name={recipe.name} className="w-full aspect-[16/9] rounded-xl" />
                    )}
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-ink-900 leading-tight">{planEntryLabel(entry)}</h3>
                        <p className="text-sm text-ink-500">
                            {format(parseISO(entry.date), 'EEE d MMM')} · {entry.slot} · {entry.diner_type}
                            {entry.servings ? ` · Serves ${entry.servings}` : ''}
                        </p>
                        {recipe && <SourceLink url={recipe.web_source} className="pt-1" />}
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={() => { onRemove(entry.id); onClose(); }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-base-300 text-sm font-semibold text-red-600 active:bg-red-50"
                        >
                            <Trash2 size={16} /> Remove
                        </button>
                        {isCookable(entry) && (
                            <button
                                onClick={() => navigate(`/cooking/${entry.id}`)}
                                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white text-sm font-semibold active:bg-accent/90"
                            >
                                <ChefHat size={16} /> Cook
                            </button>
                        )}
                    </div>
                </div>
            )}
        </ResponsiveModal>
    );
}
