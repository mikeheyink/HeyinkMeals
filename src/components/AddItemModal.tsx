import { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, Loader2 } from 'lucide-react';
import { pantryService } from '../services/pantryService';
import { plannerService } from '../services/plannerService';
import { Button } from './ui/Button';

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemAdded: () => void;
}

interface GroceryType {
    id: string;
    name: string;
    category_id: string;
    grocery_categories?: { name: string } | null;
}

export const AddItemModal = ({ isOpen, onClose, onItemAdded }: AddItemModalProps) => {
    const [search, setSearch] = useState('');
    const [groceries, setGroceries] = useState<GroceryType[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState('item');
    const [newItemCategory, setNewItemCategory] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
            setSearch('');
            setQuantity(1);
            setUnit('item');
            setNewItemCategory('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [groceryData, categoryData] = await Promise.all([
                pantryService.getGroceries(),
                pantryService.getCategories()
            ]);
            setGroceries(groceryData || []);
            setCategories(categoryData || []);
            // Default to first category if available
            if (categoryData && categoryData.length > 0) {
                setNewItemCategory(categoryData[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredGroceries = groceries.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    const exactMatch = groceries.some(g =>
        g.name.toLowerCase() === search.toLowerCase()
    );

    const handleSelectItem = async (groceryId: string) => {
        setAdding(true);
        try {
            await plannerService.addManualItem(groceryId, quantity, unit);
            onItemAdded();
        } catch (e) {
            console.error(e);
        } finally {
            setAdding(false);
        }
    };

    const handleAddNewItem = async () => {
        if (!search.trim() || !newItemCategory) return;
        setAdding(true);
        try {
            // Create the grocery type first with selected category
            const newGrocery = await pantryService.addGrocery(search.trim(), newItemCategory);

            // Then add to shopping list
            await plannerService.addManualItem(newGrocery.id, quantity, unit);
            onItemAdded();
        } catch (e) {
            console.error(e);
        } finally {
            setAdding(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full sm:w-[400px] sm:max-h-[80vh] max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                    <h2 className="text-lg font-semibold text-ink-900">Add to Shopping List</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-base-200 text-ink-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Input */}
                <div className="p-4 border-b border-base-300">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" size={18} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search or type new item..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="zen-input w-full pl-10 pr-4"
                        />
                    </div>

                    {/* Quantity & Unit */}
                    <div className="flex gap-3 mt-3">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">Qty</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="zen-input w-full"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">Unit</label>
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="zen-input w-full"
                            >
                                <option value="item">item</option>
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="l">l</option>
                                <option value="ml">ml</option>
                                <option value="cup">cup</option>
                                <option value="tbsp">tbsp</option>
                                <option value="tsp">tsp</option>
                                <option value="pkg">pkg</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {loading ? (
                        <div className="flex items-center justify-center p-8 text-ink-300">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Add New Item Section */}
                            {search.trim() && !exactMatch && (
                                <div className="bg-accent/5 border-b border-base-300 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Plus size={18} className="text-accent" />
                                        <span className="font-medium text-accent">
                                            Add "{search.trim()}" as new item
                                        </span>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                                                Category
                                            </label>
                                            <select
                                                value={newItemCategory}
                                                onChange={(e) => setNewItemCategory(e.target.value)}
                                                className="zen-input w-full"
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleAddNewItem}
                                                disabled={adding || !newItemCategory}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Filtered List */}
                            {filteredGroceries.length > 0 ? (
                                filteredGroceries.slice(0, 50).map((grocery) => (
                                    <button
                                        key={grocery.id}
                                        onClick={() => handleSelectItem(grocery.id)}
                                        disabled={adding}
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-base-200 transition-colors border-b border-base-300/50 last:border-0 disabled:opacity-50"
                                    >
                                        <span className="font-medium text-ink-900">{grocery.name}</span>
                                        <span className="text-xs text-ink-300 uppercase tracking-wider">
                                            {grocery.grocery_categories?.name}
                                        </span>
                                    </button>
                                ))
                            ) : search.trim() && exactMatch ? null : (
                                <div className="p-8 text-center text-ink-300 text-sm">
                                    {search ? 'No matching items' : 'Start typing to search...'}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-base-300 safe-area-bottom">
                    <Button variant="outline" onClick={onClose} className="w-full">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};
