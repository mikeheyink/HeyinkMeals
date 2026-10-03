import { ArrowDown, ArrowUp, Plus, Timer, X } from 'lucide-react';
import type { RecipeStep } from '../../lib/recipeSteps';

export interface EditorIngredient {
    id: string;
    name: string;
}

interface StepsEditorProps {
    steps: RecipeStep[];
    ingredients: EditorIngredient[];
    onChange: (steps: RecipeStep[]) => void;
}

/**
 * Edit the cooking cards: each step's text, which ingredients it uses (tap to toggle — the full
 * amount is used unless a partial amount was set elsewhere) and an optional timer.
 */
export function StepsEditor({ steps, ingredients, onChange }: StepsEditorProps) {
    const update = (i: number, patch: Partial<RecipeStep>) =>
        onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

    const move = (i: number, delta: number) => {
        const j = i + delta;
        if (j < 0 || j >= steps.length) return;
        const next = [...steps];
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };

    const toggleIngredient = (i: number, ingredientId: string) => {
        const step = steps[i];
        const has = step.ingredients.some(r => r.ingredient_id === ingredientId);
        update(i, {
            ingredients: has
                ? step.ingredients.filter(r => r.ingredient_id !== ingredientId)
                : [...step.ingredients, { ingredient_id: ingredientId }],
        });
    };

    const unused = ingredients.filter(ing => !steps.some(s => s.ingredients.some(r => r.ingredient_id === ing.id)));

    return (
        <div className="space-y-3">
            {steps.map((step, i) => (
                <div key={i} className="rounded-xl border border-base-300 bg-white p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-400 flex-1">Step {i + 1}</span>
                        <label className="flex items-center gap-1 text-xs text-ink-500" title="Timer (minutes)">
                            <Timer size={14} />
                            <input
                                type="number"
                                min="0"
                                value={step.timer_minutes ?? ''}
                                onChange={(e) => update(i, { timer_minutes: parseInt(e.target.value) || undefined })}
                                className="zen-input w-14 py-0.5 px-1.5 text-center"
                                placeholder="min"
                            />
                        </label>
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-ink-400 disabled:opacity-20" aria-label="Move step up"><ArrowUp size={16} /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="p-1 text-ink-400 disabled:opacity-20" aria-label="Move step down"><ArrowDown size={16} /></button>
                        <button type="button" onClick={() => onChange(steps.filter((_, idx) => idx !== i))} className="p-1 text-ink-400 hover:text-red-500" aria-label="Delete step"><X size={16} /></button>
                    </div>
                    <textarea
                        value={step.text}
                        onChange={(e) => update(i, { text: e.target.value })}
                        rows={3}
                        className="zen-input w-full resize-y text-base"
                        placeholder="e.g. Fry the onion until soft and golden, 6–8 min."
                    />
                    {ingredients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {ingredients.map(ing => {
                                const on = step.ingredients.some(r => r.ingredient_id === ing.id);
                                return (
                                    <button
                                        key={ing.id}
                                        type="button"
                                        onClick={() => toggleIngredient(i, ing.id)}
                                        aria-pressed={on}
                                        className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${on ? 'bg-accent text-white border-accent' : 'bg-white text-ink-500 border-base-300 hover:border-accent'}`}
                                    >
                                        {ing.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={() => onChange([...steps, { text: '', ingredients: [] }])}
                className="w-full py-2.5 flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-base-300 text-sm font-medium text-ink-400 hover:text-accent hover:border-accent/40"
            >
                <Plus size={16} /> Add step
            </button>

            {steps.length > 0 && unused.length > 0 && (
                <p className="text-xs text-amber-600">
                    Not used in any step yet: {unused.map(u => u.name).join(', ')}
                </p>
            )}
        </div>
    );
}
