import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { stepIngredientLines } from '../../lib/cooking';
import type { CookIngredient } from '../../lib/cooking';
import type { RecipeStep } from '../../lib/recipeSteps';

interface StepCardsProps {
    steps: RecipeStep[];
    ingredients: CookIngredient[];
    factor: number;
    index: number;
    onIndexChange: (index: number) => void;
    onStartTimer: (minutes: number) => void;
    onFinish: () => void;
}

/**
 * One step at a time: what you need for this step (with amounts), then what to do.
 * Swipe or use the buttons / arrow keys to move between steps.
 */
export function StepCards({ steps, ingredients, factor, index, onIndexChange, onStartTimer, onFinish }: StepCardsProps) {
    const touchStartX = useRef<number | null>(null);
    const step = steps[index];
    const isLast = index === steps.length - 1;

    const go = (delta: number) => {
        const next = index + delta;
        if (next >= 0 && next < steps.length) onIndexChange(next);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!step) {
        return <p className="text-sm text-ink-400 italic px-1">No instructions for this recipe yet.</p>;
    }

    const lines = stepIngredientLines(step, ingredients, factor);
    const timerMinutes = step.timer_minutes;

    return (
        <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-ink-500 tabular-nums whitespace-nowrap">
                    Step {index + 1} of {steps.length}
                </span>
                <div className="flex-1 flex gap-1" aria-hidden="true">
                    {steps.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            tabIndex={-1}
                            onClick={() => onIndexChange(i)}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= index ? 'bg-accent' : 'bg-base-300'}`}
                        />
                    ))}
                </div>
            </div>

            {/* The card */}
            <article
                className="bg-white rounded-2xl border border-base-300 shadow-sm overflow-hidden min-h-[16rem] flex flex-col"
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                    if (touchStartX.current == null) return;
                    const dx = e.changedTouches[0].clientX - touchStartX.current;
                    touchStartX.current = null;
                    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
                }}
            >
                {lines.length > 0 && (
                    <ul className="px-5 pt-4 pb-3 bg-base-200/60 border-b border-base-300 space-y-1.5">
                        {lines.map(line => (
                            <li key={line.id} className="flex items-baseline justify-between gap-4 text-sm">
                                <span className="text-ink-800 font-medium">{line.name}</span>
                                <span className="text-ink-500 font-semibold tabular-nums whitespace-nowrap">{line.amount}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="px-5 py-5 text-lg sm:text-xl leading-relaxed text-ink-900 flex-1">{step.text}</p>
                {timerMinutes && (
                    <div className="px-5 pb-5">
                        <button
                            type="button"
                            onClick={() => onStartTimer(timerMinutes)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-bold active:bg-accent/20"
                        >
                            <Timer size={16} />
                            Start {timerMinutes} min timer
                        </button>
                    </div>
                )}
            </article>

            {/* Navigation */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => go(-1)}
                    disabled={index === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-3.5 rounded-xl border border-base-300 bg-white font-semibold text-ink-700 disabled:opacity-30"
                >
                    <ChevronLeft size={18} /> Back
                </button>
                <button
                    type="button"
                    onClick={() => (isLast ? onFinish() : go(1))}
                    className="flex-[2] flex items-center justify-center gap-1 py-3.5 rounded-xl bg-accent text-white font-semibold active:bg-accent/90"
                >
                    {isLast ? 'Done' : <>Next <ChevronRight size={18} /></>}
                </button>
            </div>
        </div>
    );
}
