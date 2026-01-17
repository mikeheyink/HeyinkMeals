import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Wand2, Loader2, AlertTriangle, Check, Save } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { listService } from '../services/recipeService';

interface MagicImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ExtractedIngredient {
    originalText: string;
    quantity: number;
    unit: string;
    name: string;
    groceryTypeId?: string; // Mapped ID
}

interface ExtractedRecipe {
    name: string;
    description: string;
    servings: number;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    ingredients: ExtractedIngredient[];
    instructions: string;
}

export const MagicImportModal = ({ isOpen, onClose, onSuccess }: MagicImportModalProps) => {
    const [step, setStep] = useState<'input' | 'processing' | 'review' | 'saving'>('input');
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('Reading website...');

    // Extracted Data State
    const [recipeData, setRecipeData] = useState<ExtractedRecipe | null>(null);
    const [groceryTypes, setGroceryTypes] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        if (isOpen) {
            reset();
            fetchGroceryTypes();
        }
    }, [isOpen]);

    const reset = () => {
        setStep('input');
        setUrl('');
        setError(null);
        setRecipeData(null);
    };

    const fetchGroceryTypes = async () => {
        const { data } = await supabase.from('grocery_types').select('id, name');
        if (data) setGroceryTypes(data);
    };

    const handleAnalyze = async () => {
        if (!url) return;

        try {
            setStep('processing');
            setError(null);
            setStatusMessage('Reading website...');

            // Call Edge Function
            // Note: In local dev without supabase functions serve, this might fail unless mocked or proxied.
            // For now assuming standard invocation.
            const { data, error } = await supabase.functions.invoke('extract-recipe', {
                body: { url }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setStatusMessage('Analyzing ingredients...');

            // Auto-map ingredients
            const mappedIngredients = data.data.ingredients.map((ing: any) => {
                const match = groceryTypes.find(gt =>
                    gt.name.toLowerCase() === ing.name.toLowerCase() ||
                    gt.name.toLowerCase().includes(ing.name.toLowerCase()) ||
                    ing.name.toLowerCase().includes(gt.name.toLowerCase())
                );
                return {
                    ...ing,
                    groceryTypeId: match?.id
                };
            });

            setRecipeData({
                ...data.data,
                ingredients: mappedIngredients
            });
            setStep('review');

        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Failed to extract recipe. Please try another link.');
            setStep('input');
        }
    };

    const handleSave = async () => {
        if (!recipeData) return;

        try {
            setStep('saving');
            setStatusMessage('Saving recipe and creating list...');

            // 1. Create List
            // We'll create a list named "[Recipe Name] Ingredients"
            const listName = `${recipeData.name} Ingredients`;
            const listData = await listService.createList(listName);

            // 2. Add Items
            // We only add items we could map to a grocery type for now. 
            // Ideally we'd create new types or ask user, but for MVP we skip unmapped? 
            // Or maybe we pick a default "Misc" type if available?
            // PRD says: "MVP: Create new unmatched grocery types automatically or flag for review"
            // Let's just create them if they don't exist? That's risky for duplicate data.
            // Let's filter for now and maybe alert user about unmapped items in a real app.

            const promises = recipeData.ingredients
                .filter(ing => ing.groceryTypeId)
                .map(ing =>
                    listService.addListItem(
                        listData.id,
                        ing.groceryTypeId!,
                        ing.quantity,
                        ing.unit
                    )
                );

            await Promise.all(promises);

            // 3. Create Recipe
            // Note: recipeService.createRecipe does step 1 internally optionally, but we did it manually to control items.
            // We should use a method that links an existing list or update recipeService.
            // Existing createRecipe makes a new list. 
            // We should just insert the recipe directly linked to our new list.

            const { error: recipeError } = await supabase.from('recipes').insert({
                name: recipeData.name,
                instructions: recipeData.instructions,
                servings: recipeData.servings,
                ingredients_list_id: listData.id,
                total_time_mins: (recipeData.prepTimeMinutes || 0) + (recipeData.cookTimeMinutes || 0),
                web_source: url
            });

            if (recipeError) throw recipeError;

            onSuccess();
            onClose();

        } catch (e: any) {
            console.error(e);
            setError('Failed to save recipe.');
            setStep('review');
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-base-200 flex items-center justify-between bg-base-50">
                    <div className="flex items-center gap-2 text-accent">
                        <Wand2 size={20} />
                        <h2 className="font-bold text-lg">Magic Import</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-base-200 rounded-full text-ink-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {step === 'input' && (
                        <div className="space-y-4">
                            <p className="text-ink-500 text-sm">
                                Paste a recipe URL below and I'll extract the ingredients and instructions for you using AI.
                            </p>

                            <div className="relative">
                                <input
                                    type="url"
                                    placeholder="https://www.example.com/yummy-recipe"
                                    className="w-full p-4 pr-12 rounded-xl border border-base-300 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                    autoFocus
                                />
                                <button
                                    onClick={handleAnalyze}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-lg hover:bg-accent-focus transition-colors disabled:opacity-50"
                                    disabled={!url}
                                >
                                    <Send size={18} />
                                </button>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="mt-8 pt-8 border-t border-base-200">
                                <h3 className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-3">Supported Sites</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['AllRecipes', 'BBC Good Food', 'Food Network', 'Tasty', 'Any Food Blog'].map(site => (
                                        <span key={site} className="px-2 py-1 bg-base-100 text-ink-400 text-xs rounded-md">
                                            {site}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {(step === 'processing' || step === 'saving') && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
                                <Loader2 size={48} className="text-accent animate-spin relative z-10" />
                            </div>
                            <h3 className="font-semibold text-ink-800 text-lg">{statusMessage}</h3>
                            <p className="text-ink-400 text-sm max-w-xs mx-auto">
                                This might take a few seconds accurately convert units to South African standards.
                            </p>
                        </div>
                    )}

                    {step === 'review' && recipeData && (
                        <div className="space-y-6">

                            {/* Recipe Meta */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-ink-400 uppercase tracking-wider">Recipe Name</label>
                                <input
                                    className="w-full font-serif text-2xl font-bold text-ink-900 bg-transparent border-b border-dashed border-base-300 focus:border-accent outline-none pb-1"
                                    value={recipeData.name}
                                    onChange={(e) => setRecipeData({ ...recipeData, name: e.target.value })}
                                />

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs text-ink-400 mb-1">Servings</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 bg-base-100 rounded-lg text-sm"
                                            value={recipeData.servings}
                                            onChange={(e) => setRecipeData({ ...recipeData, servings: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-ink-400 mb-1">Prep Time (min)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 bg-base-100 rounded-lg text-sm"
                                            value={recipeData.prepTimeMinutes}
                                            onChange={(e) => setRecipeData({ ...recipeData, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Ingredients Review */}
                            <div>
                                <h3 className="font-bold text-ink-800 mb-3 flex items-center justify-between">
                                    <span>Ingredients</span>
                                    <span className="text-xs font-normal text-ink-400 bg-base-100 px-2 py-1 rounded">
                                        {recipeData.ingredients.filter(i => i.groceryTypeId).length}/{recipeData.ingredients.length} Mapped
                                    </span>
                                </h3>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {recipeData.ingredients.map((ing, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-base-200 bg-base-50 hover:bg-white transition-colors group">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${ing.groceryTypeId ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {ing.groceryTypeId ? <Check size={12} /> : <AlertTriangle size={12} />}
                                            </div>

                                            {/* Quantity */}
                                            <input
                                                type="number"
                                                className="w-16 p-1 text-sm bg-transparent border-b border-transparent focus:border-accent outline-none text-right"
                                                value={ing.quantity}
                                                onChange={(e) => {
                                                    const newIngredients = [...recipeData.ingredients];
                                                    newIngredients[idx].quantity = parseFloat(e.target.value) || 0;
                                                    setRecipeData({ ...recipeData, ingredients: newIngredients });
                                                }}
                                            />

                                            {/* Unit */}
                                            <input
                                                className="w-16 p-1 text-sm text-ink-500 bg-transparent border-b border-transparent focus:border-accent outline-none"
                                                value={ing.unit}
                                                onChange={(e) => {
                                                    const newIngredients = [...recipeData.ingredients];
                                                    newIngredients[idx].unit = e.target.value;
                                                    setRecipeData({ ...recipeData, ingredients: newIngredients });
                                                }}
                                            />

                                            {/* Name */}
                                            <input
                                                className="flex-1 p-1 text-sm font-medium bg-transparent border-b border-transparent focus:border-accent outline-none min-w-0"
                                                value={ing.name}
                                                onChange={(e) => {
                                                    const newIngredients = [...recipeData.ingredients];
                                                    newIngredients[idx].name = e.target.value;
                                                    setRecipeData({ ...recipeData, ingredients: newIngredients });
                                                }}
                                            />

                                            {/* Delete Action (Optional, for now just removing from display?) No, let's just keep editable */}
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'review' && (
                    <div className="p-4 border-t border-base-200 bg-base-50 flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={() => setStep('input')}>
                            Try Another
                        </Button>
                        <Button className="flex-1" icon={Save} onClick={handleSave}>
                            Save Recipe
                        </Button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
