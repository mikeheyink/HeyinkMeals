import { useState, useEffect } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { AddGroceryModal } from './AddGroceryModal';
import { GroceryListItems } from './grocery/GroceryListItems';

import { pantryService } from '../services/pantryService';
import { ResponsiveModal } from './ui/ResponsiveModal';

import {
    useGroceryListDetails,
    useAddGroceryItem,
    useUpdateGroceryItem,
    useDeleteGroceryItem,
    useDeleteGroceryList,
} from '../hooks/queries/useGroceryList';

interface GroceryListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    list: { id: string; name: string } | null;
}

export function GroceryListModal({ isOpen, onClose, onUpdate, list }: GroceryListModalProps) {
    const listId = list?.id || null;

    const { data: details, isLoading } = useGroceryListDetails(isOpen ? listId : null);
    const { mutateAsync: addItem, isPending: isAddingItem } = useAddGroceryItem();
    const { mutateAsync: updateItem } = useUpdateGroceryItem();
    const { mutateAsync: deleteItem } = useDeleteGroceryItem();
    const { mutateAsync: deleteList, isPending: isDeleting } = useDeleteGroceryList();

    const [groceries, setGroceries] = useState<{ id: string; name: string }[]>([]);
    const [isAddGroceryModalOpen, setIsAddGroceryModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && listId) {
            loadGroceries();
            setConfirmDelete(false);
            setError(null);
        }
    }, [isOpen, listId]);

    const loadGroceries = async () => {
        try {
            const data = await pantryService.getGroceries();
            setGroceries(data || []);
        } catch (e) {
            console.error('Failed to load groceries:', e);
        }
    };

    const handleAddItem = async (groceryId: string, quantity: number, unit: string) => {
        if (!listId) return;
        await addItem({ listId, groceryTypeId: groceryId, quantity, unit });
    };

    const handleUpdateItem = async (itemId: string, quantity: number, unit: string) => {
        await updateItem({ itemId, updates: { quantity, unit } });
    };

    const handleDeleteItem = async (itemId: string) => {
        await deleteItem(itemId);
    };

    const handleDeleteList = async () => {
        if (!listId) return;
        try {
            await deleteList(listId);
            onUpdate();
            onClose();
        } catch (e) {
            console.error('Failed to delete list:', e);
            setError('Failed to delete list. Please try again.');
        }
    };

    if (!list) return null;

    return (
        <>
            <ResponsiveModal isOpen={isOpen} onClose={onClose} className="w-full sm:max-w-lg h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-50 shrink-0">
                    <h2 className="text-lg font-bold text-ink-900 truncate">{list.name}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-base-200 text-ink-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
                            <span>{error}</span>
                            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-accent" size={32} />
                        </div>
                    ) : (
                        <GroceryListItems
                            items={(details?.list?.items as any) || []}
                            groceries={groceries}
                            isAddingItem={isAddingItem}
                            onAddItem={handleAddItem}
                            onUpdateItem={handleUpdateItem}
                            onDeleteItem={handleDeleteItem}
                            onOpenAddGrocery={() => setIsAddGroceryModalOpen(true)}
                        />
                    )}
                </div>

                {/* Footer with Delete */}
                <div className="p-4 border-t border-base-300 bg-base-50 safe-area-bottom shrink-0">
                    {confirmDelete ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-ink-600 flex-1">Delete this list?</span>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDeleteList}
                                disabled={isDeleting}
                                className="bg-red-500 hover:bg-red-600"
                                icon={isDeleting ? Loader2 : Trash2}
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
            </ResponsiveModal>

            <AddGroceryModal
                isOpen={isAddGroceryModalOpen}
                onClose={() => setIsAddGroceryModalOpen(false)}
                onItemAdded={() => {
                    loadGroceries();
                }}
            />
        </>
    );
}
