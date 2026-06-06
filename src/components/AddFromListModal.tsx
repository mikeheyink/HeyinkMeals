import { useEffect, useState } from 'react';
import { X, List, Plus } from 'lucide-react';
import { Button } from './ui/Button';
import { SearchableSelect } from './ui/SearchableSelect';
import { groceryListService } from '../services/groceryListService';
import { plannerService } from '../services/plannerService';
import { ResponsiveModal } from './ui/ResponsiveModal';

interface AddFromListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemsAdded: () => void;
}

export function AddFromListModal({ isOpen, onClose, onItemsAdded }: AddFromListModalProps) {
    const [lists, setLists] = useState<any[]>([]);
    const [selectedListId, setSelectedListId] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadLists();
            setSelectedListId('');
            setError(null);
        }
    }, [isOpen]);

    const loadLists = async () => {
        setLoading(true);
        try {
            const data = await groceryListService.getAllLists();
            setLists(data || []);
        } catch (e) {
            console.error('Failed to load lists', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!selectedListId) return;
        setSubmitting(true);
        setError(null);
        try {
            await plannerService.addListItemsToShoppingList(selectedListId);
            onItemsAdded();
            onClose();
        } catch (e) {
            console.error('Failed to add list items', e);
            setError('Failed to add items. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ResponsiveModal isOpen={isOpen} onClose={onClose} className="w-full sm:max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-base-200 bg-base-50/50">
                <div className="flex items-center gap-2 text-ink-900">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                        <List size={20} />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight">Add From List</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-base-200 text-ink-400 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="p-5 space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-500 uppercase tracking-wider">
                        Select List
                    </label>
                    <SearchableSelect
                        options={lists}
                        value={selectedListId}
                        onChange={setSelectedListId}
                        getOptionValue={(l) => l.id}
                        getOptionLabel={(l) => l.name}
                        placeholder={loading ? "Loading lists..." : "Choose a list..."}
                        searchPlaceholder="Search lists..."
                        disabled={loading || submitting}
                        autoFocus
                    />
                    <p className="text-xs text-ink-400">
                        All items from the selected list will be added to your shopping list.
                    </p>
                </div>

                <div className="pt-2 flex justify-end gap-2 safe-area-bottom">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAdd}
                        disabled={!selectedListId || submitting}
                        loading={submitting}
                        icon={Plus}
                    >
                        Add Items
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
