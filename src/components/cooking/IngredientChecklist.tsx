import { Check } from 'lucide-react';
import { groupByZone, ingredientName, scaledAmount } from '../../lib/cooking';
import type { CookIngredient } from '../../lib/cooking';

interface IngredientChecklistProps {
    ingredients: CookIngredient[];
    factor: number;
    checked: Set<string>;
    onToggle: (id: string) => void;
}

/**
 * "Get everything out" checklist, grouped by kitchen zone so one trip to the fridge (or pantry
 * shelf) collects everything that lives there.
 */
export function IngredientChecklist({ ingredients, factor, checked, onToggle }: IngredientChecklistProps) {
    if (ingredients.length === 0) {
        return <p className="text-sm text-ink-400 italic px-1">No ingredients listed for this recipe.</p>;
    }

    return (
        <div className="space-y-5">
            {groupByZone(ingredients).map(({ zone, items }) => (
                <section key={zone}>
                    <h3 className="section-title mb-1.5">{zone}</h3>
                    <ul className="bg-white rounded-xl border border-base-300 divide-y divide-base-300 overflow-hidden">
                        {items.map(ing => {
                            const isChecked = checked.has(ing.id);
                            const amount = scaledAmount(ing.quantity, ing.unit, factor);
                            return (
                                <li key={ing.id}>
                                    <button
                                        type="button"
                                        onClick={() => onToggle(ing.id)}
                                        aria-pressed={isChecked}
                                        className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-base-200 transition-colors"
                                    >
                                        <span
                                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-success border-success text-white' : 'border-base-300'}`}
                                        >
                                            {isChecked && <Check size={14} strokeWidth={3} />}
                                        </span>
                                        <span className={`flex-1 min-w-0 text-base transition-opacity ${isChecked ? 'opacity-40 line-through' : 'text-ink-900'}`}>
                                            {ingredientName(ing)}
                                        </span>
                                        {amount && (
                                            <span className={`flex-shrink-0 text-sm font-semibold tabular-nums ${isChecked ? 'opacity-40' : 'text-ink-500'}`}>
                                                {amount}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
}
