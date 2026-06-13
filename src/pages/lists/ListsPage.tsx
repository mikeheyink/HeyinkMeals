import { useState } from 'react';
import { useLists, useCreateList } from '../../hooks/queries/useGroceryList';
import type { GroceryListSummary } from '../../services/groceryListService';
import { GroceryListModal } from '../../components/GroceryListModal';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { List, Plus, Package, X } from 'lucide-react';
import { toast } from 'sonner';

export const ListsPage = () => {
    const { data: lists = [], isLoading } = useLists();
    const { mutateAsync: createList, isPending: isCreating } = useCreateList();

    const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const openList = (l: GroceryListSummary) => {
        setSelected({ id: l.id, name: l.name });
        setModalOpen(true);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            const created = await createList(newName.trim());
            setNewName('');
            setCreating(false);
            setSelected({ id: created.id, name: created.name });
            setModalOpen(true);
        } catch (e) {
            console.error(e);
            toast.error('Failed to create list');
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Lists"
                subtitle={`${lists.length} reusable shopping lists.`}
                actions={
                    <Button onClick={() => setCreating(true)} icon={Plus} variant="primary">
                        New List
                    </Button>
                }
            />

            {creating && (
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                            placeholder="List name (e.g. Weekly Essentials)"
                            className="zen-input flex-1"
                        />
                        <Button onClick={handleCreate} disabled={!newName.trim() || isCreating} loading={isCreating}>
                            Create
                        </Button>
                        <button
                            onClick={() => { setCreating(false); setNewName(''); }}
                            className="p-2 text-ink-400 hover:text-ink-700 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </Card>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-pulse text-ink-400">Loading...</div>
                </div>
            ) : lists.length === 0 ? (
                <Card className="p-8 text-center">
                    <List className="mx-auto mb-4 text-ink-300" size={48} />
                    <h3 className="text-lg font-semibold text-ink-700 mb-2">No lists yet</h3>
                    <p className="text-ink-400 mb-4">Create a reusable list of groceries to add to your shopping in one tap.</p>
                    <Button icon={Plus} onClick={() => setCreating(true)}>Create First List</Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lists.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => openList(l)}
                            className="p-4 bg-white border border-base-300 rounded-xl shadow-sm hover:shadow-md hover:border-accent/40 active:bg-base-100 transition-all text-left flex items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 bg-base-200 rounded text-ink-500">
                                    <List size={16} />
                                </div>
                                <span className="font-bold text-ink-900 truncate">{l.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-ink-500 flex-shrink-0">
                                <Package size={14} />
                                <span className="text-xs font-medium">{l.itemCount}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <GroceryListModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onUpdate={() => { /* list-summary counts refresh via query invalidation */ }}
                list={selected}
            />
        </div>
    );
};
