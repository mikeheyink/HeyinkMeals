import { useState } from 'react';
import { useLists, useCreateList, useSetListKind } from '../../hooks/queries/useGroceryList';
import type { GroceryListKind, GroceryListSummary } from '../../services/groceryListService';
import { GroceryListModal } from '../../components/GroceryListModal';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { List, Plus, X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ListCard } from './ListCard';
import { LIST_KINDS } from './listKinds';

export const ListsPage = () => {
    const { data: lists = [], isLoading } = useLists();
    const { mutateAsync: createList, isPending: isCreating } = useCreateList();
    const { mutateAsync: setListKind } = useSetListKind();

    const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedKinds, setExpandedKinds] = useState<Set<GroceryListKind>>(
        new Set(LIST_KINDS.filter(k => k.openByDefault).map(k => k.key))
    );

    const openList = (l: GroceryListSummary) => {
        setSelected({ id: l.id, name: l.name });
        setModalOpen(true);
    };

    const toggleKind = (kind: GroceryListKind) => {
        setExpandedKinds(prev => {
            const next = new Set(prev);
            if (next.has(kind)) next.delete(kind);
            else next.add(kind);
            return next;
        });
    };

    const handleKindChange = async (l: GroceryListSummary, kind: GroceryListKind) => {
        try {
            await setListKind({ listIds: [l.id], kind });
            toast.success(`Moved "${l.name}" to ${LIST_KINDS.find(k => k.key === kind)?.label ?? kind}`);
        } catch (e) {
            console.error(e);
            toast.error('Failed to move list');
        }
    };

    const query = searchQuery.trim().toLowerCase();
    const filtered = lists.filter(l => !query || l.name.toLowerCase().includes(query));

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
                    <div className="flex flex-col md:flex-row gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" size={14} />
                            <input
                                type="text"
                                placeholder="Search lists..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="zen-input pl-9 w-full md:w-64"
                            />
                        </div>
                        <Button onClick={() => setCreating(true)} icon={Plus} variant="primary">
                            New List
                        </Button>
                    </div>
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
            ) : filtered.length === 0 ? (
                <Card className="p-8 text-center">
                    <Search className="mx-auto mb-4 text-ink-300" size={48} />
                    <h3 className="text-lg font-semibold text-ink-700 mb-2">No matching lists</h3>
                    <p className="text-ink-400">Try a different search.</p>
                </Card>
            ) : (
                LIST_KINDS.map(kind => {
                    const items = filtered.filter(l => l.kind === kind.key);
                    if (items.length === 0) return null;
                    // A search opens every group so matches are never hidden in a collapsed one.
                    const isExpanded = !!query || expandedKinds.has(kind.key);
                    return (
                        <section key={kind.key} className="space-y-2">
                            <button
                                className="w-full flex items-center gap-2 p-3 bg-base-100 rounded-xl font-bold text-ink-900 shadow-sm border border-base-200 active:scale-[0.98] transition-all"
                                onClick={() => toggleKind(kind.key)}
                            >
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                <kind.icon size={16} className="text-accent" />
                                {kind.label}
                                <span className="text-ink-400 font-medium ml-auto text-sm">{items.length}</span>
                            </button>
                            {isExpanded && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {items.map(l => (
                                        <ListCard key={l.id} list={l} onOpen={openList} onKindChange={handleKindChange} />
                                    ))}
                                </div>
                            )}
                        </section>
                    );
                })
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
