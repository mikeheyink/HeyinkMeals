import { useState } from 'react';
import { Plus, BookOpen, Save, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface RecipeDetails {
    id: string;
    name: string;
    servings: number;
    total_time_mins: number;
    web_source: string | null;
    instructions: string | null;
}

interface GroceryListRecipeProps {
    recipe: RecipeDetails | null | undefined;
    isSaving: boolean;
    onAddRecipe: (name: string, servings: number) => Promise<void>;
    onClearRecipe: () => Promise<void>;
}

export function GroceryListRecipe({
    recipe,
    isSaving,
    onAddRecipe,
    onClearRecipe
}: GroceryListRecipeProps) {
    const [showAddRecipe, setShowAddRecipe] = useState(false);
    const [newRecipeName, setNewRecipeName] = useState('');
    const [newRecipeServings, setNewRecipeServings] = useState(4);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!newRecipeName.trim()) return;
        setError(null);
        try {
            await onAddRecipe(newRecipeName.trim(), newRecipeServings);
            setShowAddRecipe(false);
            setNewRecipeName('');
            setNewRecipeServings(4);
        } catch (e) {
            setError('Failed to create recipe. Please try again.');
        }
    };

    return (
        <section className="border-t border-base-200 pt-4">
            <h3 className="section-title mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-accent" />
                Recipe
            </h3>

            {error && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
                        <X size={14} />
                    </button>
                </div>
            )}

            {recipe ? (
                <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-ink-900">{recipe.name}</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearRecipe}
                            className="text-red-500 hover:bg-red-50"
                        >
                            Clear Recipe
                        </Button>
                    </div>
                    <div className="flex gap-4 text-sm text-ink-500">
                        <span>{recipe.servings} servings</span>
                        {recipe.total_time_mins > 0 && (
                            <span>{recipe.total_time_mins} min</span>
                        )}
                    </div>
                    {recipe.instructions && (
                        <p className="mt-3 text-sm text-ink-600 line-clamp-3">
                            {recipe.instructions}
                        </p>
                    )}
                </div>
            ) : showAddRecipe ? (
                <div className="p-4 bg-base-100 rounded-xl border border-base-200 space-y-3">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-ink-300 block mb-1">
                            Recipe Name
                        </label>
                        <input
                            value={newRecipeName}
                            onChange={e => setNewRecipeName(e.target.value)}
                            className="zen-input w-full"
                            placeholder="e.g. Chicken Stir Fry"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-ink-300 block mb-1">
                            Servings
                        </label>
                        <input
                            type="number"
                            value={newRecipeServings}
                            onChange={e => setNewRecipeServings(Number(e.target.value))}
                            className="zen-input w-24"
                            min="1"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddRecipe(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleAdd}
                            disabled={!newRecipeName.trim() || isSaving}
                            icon={isSaving ? Loader2 : Save}
                        >
                            Create Recipe
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    variant="outline"
                    onClick={() => setShowAddRecipe(true)}
                    icon={Plus}
                    className="w-full"
                >
                    Add Recipe
                </Button>
            )}
        </section>
    );
}
