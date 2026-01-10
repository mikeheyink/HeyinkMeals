import { useState, useRef, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { recipeService } from '../services/recipeService';
import { pantryService } from '../services/pantryService';
import { Button } from './ui/Button';
import { SearchableSelect } from './ui/SearchableSelect';
import { AddGroceryModal } from './AddGroceryModal';

interface AddRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRecipeCreated: (recipeId: string) => void;
}

export const AddRecipeModal = ({ isOpen, onClose, onRecipeCreated }: AddRecipeModalProps) => {
    const [name, setName] = useState('');
    const [servings, setServings] = useState(4);
    const [instructions, setInstructions] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [availableGroceries, setAvailableGroceries] = useState<any[]>([]);
    const [isAddGroceryModalOpen, setIsAddGroceryModalOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setServings(4);
            setInstructions('');
            setIngredients([]);
            setError('');
            loadGroceries();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const loadGroceries = async () => {
        try {
            const data = await pantryService.getGroceries();
            setAvailableGroceries(data || []);
        } catch (e) {
            console.error('Failed to load groceries:', e);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Recipe name is required');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const recipe = await recipeService.createRecipe(name.trim(), instructions.trim(), servings);

            if (ingredients.length > 0) {
                await Promise.all(ingredients.map(ing =>
                    recipeService.addIngredientToRecipe(
                        recipe.id,
                        ing.id,
                        parseFloat(ing.quantity) || 0,
                        ing.unit
                    )
                ));
            }

            onRecipeCreated(recipe.id);
            onClose();
        } catch (e) {
            console.error('Failed to create recipe:', e);
            setError('Failed to create recipe. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (!isAddGroceryModalOpen) {
                onClose();
            }
        }
    };

    const addIngredient = (groceryId: string) => {
        const grocery = availableGroceries.find(g => g.id === groceryId);
        if (!grocery) return;

        if (ingredients.some(i => i.id === groceryId)) {
            return;
        }

        setIngredients(prev => [...prev, {
            id: grocery.id,
            name: grocery.name,
            quantity: 1,
            unit: 'pcs'
        }]);
    };

    const removeIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const updateIngredient = (index: number, field: 'quantity' | 'unit', value: string) => {
        setIngredients(prev => prev.map((ing, i) => {
            if (i === index) {
                return { ...ing, [field]: value };
            }
            return ing;
        }));
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onKeyDown={handleKeyDown}>
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-white w-full sm:w-[500px] sm:max-h-[85vh] max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                        <h2 className="text-lg font-semibold text-ink-900">New Recipe</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-base-200 text-ink-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                                Recipe Name *
                            </label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Grandma's Stew"
                                className="zen-input w-full text-base"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                                    Servings
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={servings}
                                    onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="zen-input w-full"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                                Ingredients
                            </label>

                            <div className="mb-2">
                                <SearchableSelect
                                    options={availableGroceries}
                                    value=""
                                    onChange={(val) => addIngredient(val)}
                                    getOptionValue={(g) => g.id}
                                    getOptionLabel={(g) => g.name}
                                    placeholder="Add an ingredient..."
                                    searchPlaceholder="Search ingredients..."
                                    onAddNew={() => setIsAddGroceryModalOpen(true)}
                                    addNewLabel="Create new ingredient..."
                                />
                            </div>

                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {ingredients.map((ing, idx) => (
                                    <div key={ing.id} className="flex items-center gap-2 bg-base-100 p-2 rounded-lg border border-base-200">
                                        <div className="flex-1 font-medium text-sm text-ink-900 truncate">
                                            {ing.name}
                                        </div>
                                        <input
                                            type="number"
                                            value={ing.quantity}
                                            onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                                            className="zen-input w-16 h-8 text-sm p-1 text-center"
                                            placeholder="Qty"
                                        />
                                        <input
                                            type="text"
                                            value={ing.unit}
                                            onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                                            className="zen-input w-20 h-8 text-sm p-1"
                                            placeholder="Unit"
                                        />
                                        <button
                                            onClick={() => removeIngredient(idx)}
                                            className="p-1.5 text-ink-400 hover:text-red-500 hover:bg-base-200 rounded-md transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {ingredients.length === 0 && (
                                    <div className="text-center py-3 text-xs text-ink-400 italic bg-base-100/50 rounded-lg border border-dashed border-base-300">
                                        No ingredients added yet
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                                Instructions (Optional)
                            </label>
                            <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="Cooking steps..."
                                rows={4}
                                className="zen-input w-full resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-base-300 safe-area-bottom flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="flex-1" icon={saving ? Loader2 : Save}>
                            {saving ? 'Creating...' : 'Create Recipe'}
                        </Button>
                    </div>
                </div>
            </div>

            <AddGroceryModal
                isOpen={isAddGroceryModalOpen}
                onClose={() => setIsAddGroceryModalOpen(false)}
                onItemAdded={(item) => {
                    setAvailableGroceries(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
                    addIngredient(item.id);
                    setIsAddGroceryModalOpen(false);
                }}
            />
        </>
    );
};
