import React, { useEffect, useState, useRef } from 'react';
import { pantryService } from '../../services/pantryService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { AddCategoryModal } from '../../components/AddCategoryModal';
import { Plus, Loader2, Edit2, Trash2, X, Check, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SwipeToDelete } from '../../components/ui/SwipeToDelete';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const PantryPage = () => {
    const [groceries, setGroceries] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Add Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedCat, setSelectedCat] = useState('');

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editCat, setEditCat] = useState('');

    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [categoryModalContext, setCategoryModalContext] = useState<'add' | 'edit'>('add');

    // Optimistic Delete State
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const deletionTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Collapsible Category State
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const loadData = async () => {
        try {
            const [g, c] = await Promise.all([
                pantryService.getGroceries(),
                pantryService.getCategories()
            ]);
            setGroceries(g);
            setCategories(c);
            if (c.length > 0 && !selectedCat) setSelectedCat(c[0].id);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        return () => {
            Object.values(deletionTimeouts.current).forEach(clearTimeout);
        };
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !selectedCat) return;

        setLoading(true);
        try {
            await pantryService.addGrocery(newName, selectedCat);
            await loadData();
            setNewName('');
            setIsAdding(false);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStartEdit = (item: any) => {
        setEditingId(item.id);
        setEditName(item.name);
        setEditCat(item.category_id);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditCat('');
    };

    const handleUpdate = async (id: string) => {
        if (!editName || !editCat) return;
        setLoading(true);
        try {
            await pantryService.updateGrocery(id, { name: editName, category_id: editCat });
            await loadData();
            setEditingId(null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const requestDelete = (item: { id: string, name: string }) => {
        // Optimistically hide from UI
        setDeletedIds(prev => {
            const next = new Set(prev);
            next.add(item.id);
            return next;
        });

        // Show undo toast
        toast.success(`Deleted ${item.name}`, {
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
        deletionTimeouts.current[item.id] = setTimeout(async () => {
            try {
                await pantryService.deleteGrocery(item.id);
                setGroceries(prev => prev.filter(g => g.id !== item.id));
            } catch (e: any) {
                console.error(e);
                toast.error(`Could not delete "${item.name}". It might be used in a recipe.`);
                // Put it back
                setDeletedIds(prev => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                });
            } finally {
                delete deletionTimeouts.current[item.id];
            }
        }, 5000);
    };

    const filteredGroceries = groceries.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) && !deletedIds.has(g.id)
    );

    // Grouping groceries by category ID (and fallback to 'Uncategorized')
    const groupedGroceries = filteredGroceries.reduce((acc: any, item: any) => {
        const catId = item.category_id || 'uncategorized';
        if (!acc[catId]) acc[catId] = [];
        acc[catId].push(item);
        return acc;
    }, {});

    const renderDesktopEditRow = (item: any) => (
        <tr key={item.id} className="zen-table-row group bg-base-50">
            <td className="zen-table-cell pl-8">
                <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="zen-input w-full"
                    autoFocus
                />
            </td>
            <td className="zen-table-cell">
                <SearchableSelect
                    options={categories}
                    value={editCat}
                    onChange={(val) => setEditCat(val)}
                    getOptionValue={(c) => c.id}
                    getOptionLabel={(c) => c.name}
                    placeholder="Select category..."
                    searchPlaceholder="Search categories..."
                    onAddNew={() => {
                        setCategoryModalContext('edit');
                        setIsAddCategoryModalOpen(true);
                    }}
                    addNewLabel="Create new category..."
                />
            </td>
            <td className="zen-table-cell">
                <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} icon={X}>Cancel</Button>
                    <Button size="sm" onClick={() => handleUpdate(item.id)} icon={Check}>Save</Button>
                </div>
            </td>
        </tr>
    );

    const renderDesktopRow = (item: any) => (
        <tr key={item.id} className="zen-table-row group hover:bg-base-50 transition-colors">
            <td className="zen-table-cell font-medium text-ink-900 pl-8">
                {item.name}
            </td>
            <td className="zen-table-cell">
                <span className="zen-badge">
                    {item.grocery_categories?.name || 'Uncategorized'}
                </span>
            </td>
            <td className="zen-table-cell">
                <div className="zen-table-actions">
                    <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-ink-300 hover:text-ink-700 transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={() => requestDelete(item)}
                        className="p-1.5 text-ink-300 hover:text-red-500 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="space-y-8">
            <PageHeader
                title="Pantry Library"
                subtitle={`${groceries.length} ingredients tracked across ${categories.length} categories.`}
                actions={
                    <div className="flex flex-col md:flex-row gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" size={14} />
                            <input
                                type="text"
                                placeholder="Filter ingredients..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="zen-input pl-9 w-full md:w-64"
                            />
                        </div>
                        <Button onClick={() => setIsAdding(!isAdding)} icon={isAdding ? X : Plus} variant={isAdding ? 'secondary' : 'primary'}>
                            {isAdding ? 'Cancel' : 'New Ingredient'}
                        </Button>
                    </div>
                }
            />

            {isAdding && (
                <Card className="p-4 md:p-6 mb-8 border-accent/20">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-end">
                        <div className="space-y-2">
                            <label className="section-title">Name</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. Basmati Rice"
                                className="zen-input w-full"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="section-title">Category</label>
                            <SearchableSelect
                                options={categories}
                                value={selectedCat}
                                onChange={(val) => setSelectedCat(val)}
                                getOptionValue={(c) => c.id}
                                getOptionLabel={(c) => c.name}
                                placeholder="Select category..."
                                searchPlaceholder="Search categories..."
                                onAddNew={() => {
                                    setCategoryModalContext('add');
                                    setIsAddCategoryModalOpen(true);
                                }}
                                addNewLabel="Create new category..."
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Loader2 className="animate-spin" /> : 'Add to Library'}
                        </Button>
                    </form>
                </Card>
            )}

            {loading && !groceries.length ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4 text-ink-300">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="section-title">Indexing Library</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block zen-table-container">
                        <table className="zen-table">
                            <thead className="zen-table-header">
                                <tr>
                                    <th className="zen-table-cell w-1/2">Ingredient Name</th>
                                    <th className="zen-table-cell">Category</th>
                                    <th className="zen-table-cell text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.concat([{ id: 'uncategorized', name: 'Uncategorized' }]).map((cat: any) => {
                                    const items = groupedGroceries[cat.id];
                                    if (!items || items.length === 0) return null;
                                    const isExpanded = expandedCategories.has(cat.id);

                                    return (
                                        <React.Fragment key={cat.id}>
                                            <tr
                                                className="bg-base-100 hover:bg-base-200 cursor-pointer transition-colors"
                                                onClick={() => toggleCategory(cat.id)}
                                            >
                                                <td colSpan={3} className="px-4 py-3 border-b border-base-200">
                                                    <div className="flex items-center gap-2 text-ink-900 font-semibold selection:bg-transparent">
                                                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                        {cat.name}
                                                        <span className="text-ink-400 text-sm font-normal ml-2">({items.length})</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && items.map((item: any) => (
                                                editingId === item.id ? renderDesktopEditRow(item) : renderDesktopRow(item)
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {categories.concat([{ id: 'uncategorized', name: 'Uncategorized' }]).map((cat: any) => {
                            const items = groupedGroceries[cat.id];
                            if (!items || items.length === 0) return null;
                            const isExpanded = expandedCategories.has(cat.id);

                            return (
                                <div key={cat.id} className="space-y-2">
                                    <button
                                        className="w-full flex items-center gap-2 p-3 bg-base-100 rounded-xl font-bold text-ink-900 shadow-sm border border-base-200 active:scale-[0.98] transition-all"
                                        onClick={() => toggleCategory(cat.id)}
                                    >
                                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        {cat.name}
                                        <span className="text-ink-400 font-medium ml-auto text-sm">{items.length}</span>
                                    </button>

                                    {isExpanded && (
                                        <div className="space-y-3 pl-2 border-l-2 border-base-200 ml-2">
                                            {items.map((item: any) => (
                                                <SwipeToDelete key={item.id} onDelete={() => requestDelete(item)}>
                                                    <div className="p-4 bg-white border border-base-300 rounded-xl shadow-sm space-y-3 pointer-events-none sm:pointer-events-auto">
                                                        {editingId === item.id ? (
                                                            <div className="space-y-4 pointer-events-auto">
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black uppercase tracking-tight text-ink-300">Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editName}
                                                                        onChange={(e) => setEditName(e.target.value)}
                                                                        className="zen-input w-full"
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black uppercase tracking-tight text-ink-300">Category</label>
                                                                    <SearchableSelect
                                                                        options={categories}
                                                                        value={editCat}
                                                                        onChange={(val) => setEditCat(val)}
                                                                        getOptionValue={(c) => c.id}
                                                                        getOptionLabel={(c) => c.name}
                                                                        placeholder="Select category..."
                                                                        searchPlaceholder="Search categories..."
                                                                        onAddNew={() => {
                                                                            setCategoryModalContext('edit');
                                                                            setIsAddCategoryModalOpen(true);
                                                                        }}
                                                                        addNewLabel="Create new category..."
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button size="sm" variant="secondary" className="flex-1" onClick={handleCancelEdit}>Cancel</Button>
                                                                    <Button size="sm" className="flex-1" onClick={() => handleUpdate(item.id)}>Save</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-between items-start pointer-events-auto">
                                                                <div className="space-y-1">
                                                                    <h3 className="font-bold text-ink-900 text-base leading-tight">
                                                                        {item.name}
                                                                    </h3>
                                                                    <span className="zen-badge">
                                                                        {item.grocery_categories?.name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleStartEdit(item)}
                                                                        className="p-2 text-ink-300 active:text-accent active:bg-accent/5 rounded-lg transition-colors border border-base-300"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => requestDelete(item)}
                                                                        className="p-2 text-ink-300 active:text-red-500 active:bg-red-50 rounded-lg transition-colors border border-base-300 hidden sm:block"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </SwipeToDelete>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <AddCategoryModal
                isOpen={isAddCategoryModalOpen}
                onClose={() => setIsAddCategoryModalOpen(false)}
                onCategoryAdded={(category) => {
                    const reloadOnlyCategories = async () => {
                        const c = await pantryService.getCategories();
                        setCategories(c);
                        if (categoryModalContext === 'add') {
                            setSelectedCat(category.id);
                        } else {
                            setEditCat(category.id);
                        }
                    };
                    reloadOnlyCategories();
                }}
            />
        </div>
    );
};
