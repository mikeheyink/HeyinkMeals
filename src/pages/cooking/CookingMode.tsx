import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChefHat, Timer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { recipeService } from '../../services/recipeService';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useCountdown } from '../../hooks/useCountdown';
import { cookingSteps } from '../../lib/recipeSteps';
import { servingsFactor } from '../../lib/cooking';
import type { CookIngredient } from '../../lib/cooking';
import { RecipeThumb } from '../../components/recipes/RecipeThumb';
import { SourceLink } from '../../components/recipes/SourceLink';
import { IngredientChecklist } from '../../components/cooking/IngredientChecklist';
import { StepCards } from '../../components/cooking/StepCards';
import { CookTimer } from '../../components/cooking/CookTimer';

type Recipe = Awaited<ReturnType<typeof recipeService.getRecipe>>;
type Phase = 'ready' | 'cook';

const TIMER_PRESETS = [1, 5, 10, 15, 20, 30];

/**
 * Distraction-free cooking: first get everything out (a checklist grouped by kitchen zone), then
 * cook one step card at a time — each card shows only the ingredients that step needs.
 * Amounts are scaled to the servings planned for this meal.
 */
export const CookingMode = () => {
    const { mealId } = useParams();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const timer = useCountdown();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [plannedServings, setPlannedServings] = useState<number | null>(null);
    const [mealLabel, setMealLabel] = useState('');
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState<Phase>('ready');
    const [stepIndex, setStepIndex] = useState(0);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [showPresets, setShowPresets] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!mealId) return;
            setLoading(true);
            try {
                const { data: meal, error } = await supabase
                    .from('meal_plan_entries')
                    .select('recipe_id, servings, slot, diner_type')
                    .eq('id', mealId)
                    .single();
                if (error) throw error;
                setPlannedServings(meal.servings);
                setMealLabel(`${meal.slot} · ${meal.diner_type}`);
                if (meal.recipe_id) setRecipe(await recipeService.getRecipe(meal.recipe_id));
            } catch (e) {
                console.error('Failed to load meal for cooking:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [mealId]);

    if (loading) {
        return <div className="p-20 text-center text-ink-300"><ChefHat className="animate-bounce inline-block" size={40} /></div>;
    }
    if (!recipe) {
        return (
            <div className="p-12 text-center space-y-4">
                <p className="text-ink-500">This meal isn't a recipe you can cook.</p>
                <button onClick={() => navigate('/cooking')} className="text-accent font-semibold">Back to Cook</button>
            </div>
        );
    }

    const ingredients: CookIngredient[] = recipe.ingredients ?? [];
    const steps = cookingSteps(recipe.steps, recipe.instructions);
    const factor = servingsFactor(plannedServings, recipe.servings);
    const servings = plannedServings ?? recipe.servings;

    const toggle = (id: string) => setChecked(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const checklist = (
        <IngredientChecklist ingredients={ingredients} factor={factor} checked={checked} onToggle={toggle} />
    );
    const stepCards = (
        <StepCards
            steps={steps}
            ingredients={ingredients}
            factor={factor}
            index={stepIndex}
            onIndexChange={setStepIndex}
            onStartTimer={timer.start}
            onFinish={() => navigate('/cooking')}
        />
    );

    return (
        <div className="max-w-5xl mx-auto pb-32 space-y-5">
            {/* Header */}
            <header className="flex items-start gap-3">
                <button
                    onClick={() => navigate('/cooking')}
                    className="flex-shrink-0 -ml-2 p-2 rounded-lg text-ink-500 hover:bg-base-300"
                    aria-label="Back to Cook"
                >
                    <ChevronLeft size={22} />
                </button>
                <RecipeThumb imageUrl={recipe.image_url} name={recipe.name} className="w-14 h-14 rounded-xl" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-ink-900 leading-tight">{recipe.name}</h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink-500">
                        <span>{mealLabel}</span>
                        {servings && <span>Serves {servings}</span>}
                        <SourceLink url={recipe.web_source} />
                    </div>
                </div>
                <button
                    onClick={() => setShowPresets(v => !v)}
                    className={`flex-shrink-0 p-2 rounded-lg ${showPresets ? 'bg-accent/10 text-accent' : 'text-ink-500 hover:bg-base-300'}`}
                    aria-label="Set a timer"
                    aria-expanded={showPresets}
                >
                    <Timer size={20} />
                </button>
            </header>

            {showPresets && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Timer presets">
                    {TIMER_PRESETS.map(m => (
                        <button
                            key={m}
                            onClick={() => { timer.start(m); setShowPresets(false); }}
                            className="px-3.5 py-1.5 rounded-full border border-base-300 bg-white text-sm font-semibold text-ink-700 active:bg-base-200"
                        >
                            {m} min
                        </button>
                    ))}
                </div>
            )}

            {isMobile ? (
                <>
                    <div className="flex p-1 bg-base-300/60 rounded-xl" role="tablist">
                        {([['ready', `Get ready ${checked.size}/${ingredients.length}`], ['cook', `Cook · ${steps.length} steps`]] as const).map(([key, label]) => (
                            <button
                                key={key}
                                role="tab"
                                aria-selected={phase === key}
                                onClick={() => setPhase(key)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${phase === key ? 'bg-white shadow-sm text-ink-900' : 'text-ink-500'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {phase === 'ready' ? (
                        <div className="space-y-5">
                            {checklist}
                            <button
                                onClick={() => setPhase('cook')}
                                className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold active:bg-accent/90"
                            >
                                Start cooking
                            </button>
                        </div>
                    ) : stepCards}
                </>
            ) : (
                <div className="grid grid-cols-5 gap-8 items-start">
                    <div className="col-span-2 space-y-2">
                        <h2 className="section-title">Get ready · {checked.size}/{ingredients.length}</h2>
                        {checklist}
                    </div>
                    <div className="col-span-3 sticky top-8">{stepCards}</div>
                </div>
            )}

            <CookTimer timer={timer} />
        </div>
    );
};
