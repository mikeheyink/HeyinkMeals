import { useEffect, useMemo, useRef, useState } from 'react';
import { X, List, Plus, Search, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { groceryListService, type GroceryListSummary } from '../services/groceryListService';
import { plannerService } from '../services/plannerService';
import { ResponsiveModal } from './ui/ResponsiveModal';

interface AddFromListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemsAdded: () => void;
}

/** Only worth a search box once scanning the rows stops being instant. */
const SEARCH_THRESHOLD = 6;

export function AddFromListModal({ isOpen, onClose, onItemsAdded }: AddFromListModalProps) {
    const [lists, setLists] = useState<GroceryListSummary[]>([]);
    const [selectedListId, setSelectedListId] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    useEffect(() => {
        if (!isOpen) return;

        setSelectedListId('');
        setSearch('');
        setError(null);
        setLoading(true);

        let cancelled = false;
        groceryListService.getLists()
            .then(data => { if (!cancelled) setLists(data ?? []); })
            .catch(e => {
                console.error('Failed to load lists', e);
                if (!cancelled) setError('Could not load your lists. Please try again.');
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [isOpen]);

    const query = search.trim().toLowerCase();
    const filtered = useMemo(
        () => (query ? lists.filter(l => l.name.toLowerCase().includes(query)) : lists),
        [lists, query]
    );
    const selectable = filtered.filter(l => l.itemCount > 0);
    const selected = lists.find(l => l.id === selectedListId) ?? null;
    const showSearch = lists.length >= SEARCH_THRESHOLD;

    const handleAdd = async (listId = selectedListId) => {
        if (!listId || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            await plannerService.addListItemsToShoppingList(listId);
            onItemsAdded();
            onClose();
        } catch (e) {
            console.error('Failed to add list items', e);
            setError('Failed to add items. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Up/Down moves the selection, Enter commits it — so the whole flow works
    // from the search box without reaching for the mouse.
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedListId) handleAdd();
            else if (selectable.length === 1) setSelectedListId(selectable[0].id);
            return;
        }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        if (selectable.length === 0) return;

        const current = selectable.findIndex(l => l.id === selectedListId);
        const next = current === -1
            ? 0
            : e.key === 'ArrowDown'
                ? Math.min(current + 1, selectable.length - 1)
                : Math.max(current - 1, 0);
        const target = selectable[next];
        setSelectedListId(target.id);
        rowRefs.current[target.id]?.scrollIntoView({ block: 'nearest' });
    };

    return (
        <ResponsiveModal isOpen={isOpen} onClose={onClose} className="w-full sm:max-w-md sm:max-h-[640px]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-base-300 bg-base-50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent shrink-0">
                        <List size={18} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold tracking-tight text-ink-900">Add From List</h2>
                        <p className="text-xs text-ink-400">Copy a saved list into your shopping list</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="p-2 -m-1 rounded-lg hover:bg-base-200 text-ink-400 hover:text-ink-700 transition-colors shrink-0"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Search */}
            {showSearch && (
                <div className="px-4 pt-3 pb-1 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none" size={15} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search lists..."
                            disabled={submitting}
                            className="zen-input w-full pl-9 pr-9 py-2"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink-400 hover:text-ink-700 hover:bg-base-200 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* List of lists */}
            <div
                role="radiogroup"
                aria-label="Saved lists"
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-1.5"
            >
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-[58px] rounded-xl bg-base-200 animate-pulse" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="py-10 px-4 text-center">
                        <div className="mx-auto mb-3 w-11 h-11 rounded-full bg-base-200 flex items-center justify-center text-ink-300">
                            <List size={20} />
                        </div>
                        {lists.length === 0 ? (
                            <>
                                <p className="text-sm font-semibold text-ink-700">No saved lists yet</p>
                                <p className="mt-1 text-xs text-ink-400">
                                    Build a reusable list on the Lists page, then pull it in here in one tap.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-semibold text-ink-700">No lists match “{search.trim()}”</p>
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="mt-2 text-xs font-semibold text-accent hover:underline"
                                >
                                    Clear search
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    filtered.map(list => {
                        const isEmpty = list.itemCount === 0;
                        const isSelected = list.id === selectedListId;

                        return (
                            <button
                                key={list.id}
                                ref={el => { rowRefs.current[list.id] = el; }}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${list.name}, ${isEmpty ? 'empty list' : `${list.itemCount} ${list.itemCount === 1 ? 'item' : 'items'}`}`}
                                disabled={isEmpty || submitting}
                                onClick={() => setSelectedListId(list.id)}
                                onDoubleClick={() => handleAdd(list.id)}
                                className={`w-full min-h-[56px] px-3.5 py-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${isEmpty
                                    ? 'border-base-300 bg-base-200/40 cursor-not-allowed'
                                    : isSelected
                                        ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                        : 'border-base-300 bg-white hover:bg-base-200/60 hover:border-ink-300'
                                    }`}
                            >
                                <span className="flex-1 min-w-0">
                                    <span className={`block truncate text-sm font-semibold ${isEmpty ? 'text-ink-400' : 'text-ink-900'}`}>
                                        {list.name}
                                    </span>
                                    <span className="block text-xs text-ink-400">
                                        {isEmpty ? 'Empty list' : `${list.itemCount} ${list.itemCount === 1 ? 'item' : 'items'}`}
                                    </span>
                                </span>
                                <span
                                    aria-hidden="true"
                                    className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                                        ? 'bg-accent border-accent text-white'
                                        : 'border-base-300 bg-white'
                                        }`}
                                >
                                    {isSelected && <Check size={13} strokeWidth={3} />}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-base-300 bg-base-50 px-4 py-3 safe-area-bottom">
                {error && (
                    <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {error}
                    </div>
                )}
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => handleAdd()}
                        disabled={!selected || submitting}
                        loading={submitting}
                        icon={Plus}
                    >
                        {selected
                            ? `Add ${selected.itemCount} ${selected.itemCount === 1 ? 'item' : 'items'}`
                            : 'Add Items'}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
