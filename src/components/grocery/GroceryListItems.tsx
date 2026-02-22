import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { SearchableSelect } from '../ui/SearchableSelect';
import { SwipeToDelete } from '../ui/SwipeToDelete';

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

interface GroceryListItemsProps {
    items: ListItem[];
    groceries: any[];
    isAddingItem: boolean;
    onAddItem: (groceryId: string, quantity: number, unit: string) => Promise<void>;
    onUpdateItem: (itemId: string, quantity: number, unit: string) => Promise<void>;
    onDeleteItem: (itemId: string) => Promise<void>;
    onOpenAddGrocery: () => void;
}

export function GroceryListItems({
    items,
    groceries,
    isAddingItem,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onOpenAddGrocery
}: GroceryListItemsProps) {
    const [selectedGrocery, setSelectedGrocery] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState('items');

    const [error, setError] = useState<string | null>(null);

    // State for local optimistic updates during typing
    const [localQuantities, setLocalQuantities] = useState<Record<string, string>>({});

    // State for optimistically hiding deleted items
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const deletionTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Sync local state when external items change
    useEffect(() => {
        const newLocal: Record<string, string> = {};
        for (const item of items) {
            newLocal[item.id] = String(item.quantity);
        }
        setLocalQuantities(newLocal);
    }, [items]);

    // Cleanup timeouts to avoid memory leaks
    useEffect(() => {
        return () => {
            Object.values(deletionTimeouts.current).forEach(clearTimeout);
        };
    }, []);

    const handleAdd = async () => {
        if (!selectedGrocery) return;
        setError(null);
        try {
            await onAddItem(selectedGrocery, quantity, unit);
            setQuantity(1);
            setUnit('items');
            setSelectedGrocery('');
        } catch (e) {
            setError('Failed to add item. Please try again.');
        }
    };

    const handleStepper = async (item: ListItem, delta: number) => {
        const currentLocal = parseFloat(localQuantities[item.id] || String(item.quantity));
        if (isNaN(currentLocal)) return;

        let newQuantity = currentLocal + delta;
        newQuantity = Math.max(0.25, Number(newQuantity.toFixed(2))); // Prevent weird floats and <= 0

        // Optimistic update locally
        setLocalQuantities(prev => ({ ...prev, [item.id]: String(newQuantity) }));

        try {
            await onUpdateItem(item.id, newQuantity, item.unit);
        } catch (e) {
            setError('Failed to update quantity.');
            // Revert on failure
            setLocalQuantities(prev => ({ ...prev, [item.id]: String(item.quantity) }));
        }
    };

    const handleQuantityBlur = async (item: ListItem) => {
        const currentLocal = parseFloat(localQuantities[item.id]);

        // If empty or invalid, revert to last known good
        if (isNaN(currentLocal) || localQuantities[item.id].trim() === '') {
            setLocalQuantities(prev => ({ ...prev, [item.id]: String(item.quantity) }));
            return;
        }

        const validQuantity = Math.max(0.25, Number(currentLocal.toFixed(2)));

        // Formatting back to string just in case they typed '2.'
        setLocalQuantities(prev => ({ ...prev, [item.id]: String(validQuantity) }));

        // Only update if changed
        if (validQuantity !== item.quantity) {
            try {
                await onUpdateItem(item.id, validQuantity, item.unit);
            } catch (e) {
                setError('Failed to update quantity.');
                setLocalQuantities(prev => ({ ...prev, [item.id]: String(item.quantity) }));
            }
        }
    };

    const handleLocalQuantityChange = (itemId: string, value: string) => {
        setLocalQuantities(prev => ({ ...prev, [itemId]: value }));
    };

    const requestDelete = (item: ListItem) => {
        // Optimistically hide from UI
        setDeletedIds(prev => {
            const next = new Set(prev);
            next.add(item.id);
            return next;
        });

        // Show undo toast
        toast.success(`Removed ${item.grocery_type.name}`, {
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    // Cancel physical deletion
                    if (deletionTimeouts.current[item.id]) {
                        clearTimeout(deletionTimeouts.current[item.id]);
                        delete deletionTimeouts.current[item.id];
                    }
                    // Restore to UI
                    setDeletedIds(prev => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                    });
                }
            }
        });

        // Set timeout to actually send delete request to server
        deletionTimeouts.current[item.id] = setTimeout(() => {
            onDeleteItem(item.id).catch(() => {
                // If it fails, put it back and show error
                toast.error('Failed to delete item.');
                setDeletedIds(prev => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                });
            });
            delete deletionTimeouts.current[item.id];
        }, 5000);
    };

    const visibleItems = items.filter(item => !deletedIds.has(item.id));

    return (
        <section>
            <h3 className="section-title mb-3">Items ({visibleItems.length})</h3>

            {error && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
                        <X size={14} />
                    </button>
                </div>
            )}

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
                        onAddNew={onOpenAddGrocery}
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
                        onClick={handleAdd}
                        disabled={isAddingItem || !selectedGrocery}
                        icon={isAddingItem ? Loader2 : Plus}
                    >
                        Add
                    </Button>
                </div>
            </div>

            {/* Items list */}
            {visibleItems.length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-4 italic">
                    No items in this list yet.
                </p>
            ) : (
                <div className="space-y-1">
                    {visibleItems.map(item => {
                        const localQty = localQuantities[item.id] ?? String(item.quantity);

                        return (
                            <SwipeToDelete key={item.id} onDelete={() => requestDelete(item)}>
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 rounded-xl bg-base-50 hover:bg-base-100 border border-transparent hover:border-base-200 transition-all group"
                                >
                                    <span className="font-medium text-ink-800 truncate flex-1 pointer-events-none sm:pointer-events-auto">
                                        {item.grocery_type.name} <span className="text-ink-400 font-normal ml-1">{item.unit}</span>
                                    </span>

                                    <div className="flex items-center gap-3">
                                        {/* Stepper Controls */}
                                        <div className="flex items-center bg-white border border-base-200 rounded-lg overflow-hidden shadow-sm">
                                            <button
                                                onClick={() => handleStepper(item, -0.25)}
                                                className="px-2.5 py-1.5 text-ink-500 hover:bg-base-100 hover:text-ink-900 active:bg-base-200 transition-colors"
                                                title="Decrease"
                                            >
                                                <Minus size={14} />
                                            </button>

                                            <input
                                                type="number"
                                                value={localQty}
                                                onChange={(e) => handleLocalQuantityChange(item.id, e.target.value)}
                                                onBlur={() => handleQuantityBlur(item)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                                className="w-12 text-center text-sm font-bold text-ink-900 bg-transparent border-none p-0 focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                min="0.25"
                                                step="0.25"
                                            />

                                            <button
                                                onClick={() => handleStepper(item, 0.25)}
                                                className="px-2.5 py-1.5 text-ink-500 hover:bg-base-100 hover:text-ink-900 active:bg-base-200 transition-colors"
                                                title="Increase"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        {/* Delete Button (desktop usually, mobile fallback) */}
                                        <button
                                            onClick={() => requestDelete(item)}
                                            className="p-2 rounded-lg text-ink-300 hover:text-red-500 hover:bg-red-50 sm:opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                            title="Remove item"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </SwipeToDelete>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
