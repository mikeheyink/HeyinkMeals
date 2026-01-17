import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Plus, BookOpen, Save, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { SearchableSelect } from './ui/SearchableSelect';
import { AddGroceryModal } from './AddGroceryModal';
import { groceryListService } from '../services/groceryListService';
import type { GroceryListWithRecipe } from '../services/groceryListService';
import { pantryService } from '../services/pantryService';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface GroceryListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    groceryList: GroceryListWithRecipe | null;
}

interface ListItem {
    id: string;
    quantity: number;
    unit: string;
    grocery_type: {
        id: string;
        name: string;
        category?: { name: string } | null;
    };
}

interface RecipeDetails {
    id: string;
    name: string;
    servings: number;
    total_time_mins: number;
    web_source: string | null;
    instructions: string | null;
}

export function GroceryListModal({ isOpen, onClose, onUpdate, groceryList }: GroceryListModalProps) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ListItem[]>([]);
    const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
    const [groceries, setGroceries] = useState<any[]>([]);

    // Edit item state
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editQuantity, setEditQuantity] = useState(1);
    const [editUnit, setEditUnit] = useState('');

    // Add item state
    const [selectedGrocery, setSelectedGrocery] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState('items');
    const [addingItem, setAddingItem] = useState(false);
    const [isAddGroceryModalOpen, setIsAddGroceryModalOpen] = useState(false);

    // Add recipe state
    const [showAddRecipe, setShowAddRecipe] = useState(false);
    const [newRecipeName, setNewRecipeName] = useState('');
    const [newRecipeServings, setNewRecipeServings] = useState(4);
    const [savingRecipe, setSavingRecipe] = useState(false);

    // Delete confirmation
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);
    useFocusTrap({ isOpen, onClose, containerRef: modalRef });

    useEffect(() => {
        if (isOpen && groceryList) {
            loadDetails();
            loadGroceries();
            setConfirmDelete(false);
            setShowAddRecipe(false);
        }
    }, [isOpen, groceryList?.id]);

    const loadDetails = async () => {
        if (!groceryList) return;
        setLoading(true);
        try {
            const details = await groceryListService.getGroceryListDetails(groceryList.id);
            setItems((details.list?.items as unknown as ListItem[]) || []);
            setRecipe(details.recipe);
        } catch (e) {
            console.error('Failed to load list details:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadGroceries = async () => {
        try {
            const data = await pantryService.getGroceries();
            setGroceries(data || []);
            if (data?.length) setSelectedGrocery(data[0].id);
        } catch (e) {
            console.error('Failed to load groceries:', e);
        }
    };

    const handleAddItem = async () => {
        if (!groceryList || !selectedGrocery) return;
        setAddingItem(true);
        try {
            await groceryListService.addItem(groceryList.id, selectedGrocery, quantity, unit);
            await loadDetails();
            setQuantity(1);
            setUnit('items');
        } catch (e) {
            console.error('Failed to add item:', e);
        } finally {
            setAddingItem(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        try {
            await groceryListService.deleteItem(itemId);
            setItems(items.filter(i => i.id !== itemId));
        } catch (e) {
            console.error('Failed to delete item:', e);
        }
    };

    const handleClearRecipe = async () => {
        if (!recipe) return;
        try {
            await groceryListService.clearRecipe(recipe.id);
            setRecipe(null);
            onUpdate();
        } catch (e) {
            console.error('Failed to clear recipe:', e);
        }
    };

    const handleAddRecipe = async () => {
        if (!groceryList || !newRecipeName.trim()) return;
        setSavingRecipe(true);
        try {
            await groceryListService.createRecipeForList(
                groceryList.id,
                newRecipeName.trim(),
                newRecipeServings
            );
            await loadDetails();
            setShowAddRecipe(false);
            setNewRecipeName('');
            setNewRecipeServings(4);
            onUpdate();
        } catch (e) {
            console.error('Failed to create recipe:', e);
        } finally {
            setSavingRecipe(false);
        }
    };

    const handleDeleteList = async () => {
        if (!groceryList) return;
        setDeleting(true);
        try {
            await groceryListService.deleteGroceryList(groceryList.id);
            onUpdate();
            onClose();
        } catch (e) {
            console.error('Failed to delete list:', e);
        } finally {
            setDeleting(false);
        }
    };

    if (!isOpen || !groceryList) return null;

    return (
        <div ref={modalRef} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-50">
                    <h2 className="text-lg font-bold text-ink-900 truncate">{groceryList.name}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-base-200 text-ink-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-accent" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Items Section */}
                            <section>
                                <h3 className="section-title mb-3">Items ({items.length})</h3>

                                {/* Add item form */}
                                <div className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-base-100 rounded-xl border border-base-200">
                                    <div className="flex-1">
                                        <SearchableSelect
                                            options={groceries}
                                            value={selectedGrocery}
                                            onChange={setSelectedGrocery}
                                            getOptionValue={(g) => g.id}
                                            getOptionLabel={(g) => g.name}
                                            placeholder="Select ingredient..."
                                            searchPlaceholder="Search..."
                                            onAddNew={() => setIsAddGroceryModalOpen(true)}
                                            addNewLabel="Create new..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={e => setQuantity(Number(e.target.value))}
                                            className="zen-input w-16 text-center"
                                            min="0.25"
                                            step="0.25"
                                        />
                                        <input
                                            value={unit}
                                            onChange={e => setUnit(e.target.value)}
                                            className="zen-input w-20"
                                            placeholder="unit"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleAddItem}
                                            disabled={addingItem || !selectedGrocery}
                                            icon={addingItem ? Loader2 : Plus}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>

                                {/* Items list */}
                                {items.length === 0 ? (
                                    <p className="text-sm text-ink-400 text-center py-4 italic">
                                        No items in this list yet.
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {items.map(item => {
                                            const isEditing = editingItemId === item.id;

                                            // Initialize edit values when entering edit mode
                                            const startEditing = () => {
                                                setEditingItemId(item.id);
                                                setEditQuantity(item.quantity);
                                                setEditUnit(item.unit);
                                            };

                                            const cancelEditing = () => {
                                                setEditingItemId(null);
                                            };

                                            const saveEdit = async () => {
                                                try {
                                                    await groceryListService.updateItem(item.id, {
                                                        quantity: editQuantity,
                                                        unit: editUnit
                                                    });

                                                    // Update local state
                                                    setItems(items.map(i =>
                                                        i.id === item.id
                                                            ? { ...i, quantity: editQuantity, unit: editUnit }
                                                            : i
                                                    ));
                                                    setEditingItemId(null);
                                                } catch (e) {
                                                    console.error('Failed to update item:', e);
                                                }
                                            };

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${isEditing ? 'bg-base-100 ring-2 ring-accent/20' : 'hover:bg-base-100 group'
                                                        }`}
                                                >
                                                    <span className="font-medium text-ink-800 truncate flex-1 mr-4">
                                                        {item.grocery_type.name}
                                                    </span>

                                                    {isEditing ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={editQuantity}
                                                                onChange={e => setEditQuantity(Number(e.target.value))}
                                                                className="zen-input w-16 text-center h-8 text-sm"
                                                                min="0.25"
                                                                step="0.25"
                                                                autoFocus
                                                            />
                                                            <input
                                                                value={editUnit}
                                                                onChange={e => setEditUnit(e.target.value)}
                                                                className="zen-input w-20 h-8 text-sm"
                                                                placeholder="unit"
                                                            />
                                                            <button
                                                                onClick={saveEdit}
                                                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                                                title="Save"
                                                            >
                                                                <Save size={16} />
                                                            </button>
                                                            <button
                                                                onClick={cancelEditing}
                                                                className="p-1.5 rounded-lg text-ink-400 hover:bg-base-200 transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={startEditing}
                                                                className="text-sm text-accent font-semibold hover:underline decoration-accent/30 underline-offset-4 decoration-2"
                                                                title="Click to edit"
                                                            >
                                                                {item.quantity} {item.unit}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-1.5 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                                title="Remove item"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* Recipe Section */}
                            <section className="border-t border-base-200 pt-4">
                                <h3 className="section-title mb-3 flex items-center gap-2">
                                    <BookOpen size={16} className="text-accent" />
                                    Recipe
                                </h3>

                                {recipe ? (
                                    <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-ink-900">{recipe.name}</h4>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleClearRecipe}
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
                                                onClick={handleAddRecipe}
                                                disabled={!newRecipeName.trim() || savingRecipe}
                                                icon={savingRecipe ? Loader2 : Save}
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
                        </>
                    )}
                </div>

                {/* Footer with Delete */}
                <div className="p-4 border-t border-base-300 bg-base-50 safe-area-bottom">
                    {confirmDelete ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-ink-600 flex-1">
                                Delete this list and its recipe?
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDeleteList}
                                disabled={deleting}
                                className="bg-red-500 hover:bg-red-600"
                                icon={deleting ? Loader2 : Trash2}
                            >
                                Delete
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmDelete(true)}
                            className="w-full text-red-500 hover:bg-red-50"
                            icon={Trash2}
                        >
                            Delete List
                        </Button>
                    )}
                </div>
            </div>

            <AddGroceryModal
                isOpen={isAddGroceryModalOpen}
                onClose={() => setIsAddGroceryModalOpen(false)}
                onItemAdded={(grocery) => {
                    loadGroceries();
                    setSelectedGrocery(grocery.id);
                }}
            />
        </div>
    );
}
