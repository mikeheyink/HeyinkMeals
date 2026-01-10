import { useEffect, useState } from 'react';
import { pantryService } from '../../services/pantryService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { AddCategoryModal } from '../../components/AddCategoryModal';
import { Plus, Loader2, Edit2, Trash2, X, Check, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';

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

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
        setLoading(true);
        try {
            await pantryService.deleteGrocery(id);
            await loadData();
        } catch (e: any) {
            console.error(e);
            alert(`Could not delete "${name}". This item might be used in a recipe or shopping list.\n\nError: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredGroceries = groceries.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                                {filteredGroceries.map((item) => (
                                    <tr key={item.id} className="zen-table-row group">
                                        {editingId === item.id ? (
                                            <>
                                                <td className="zen-table-cell">
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
                                            </>
                                        ) : (
                                            <>
                                                <td className="zen-table-cell font-medium text-ink-900">
                                                    {item.name}
                                                </td>
                                                <td className="zen-table-cell">
                                                    <span className="zen-badge">
                                                        {item.grocery_categories?.name}
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
                                                            onClick={() => handleDelete(item.id, item.name)}
                                                            className="p-1.5 text-ink-300 hover:text-red-500 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {filteredGroceries.map((item) => (
                            <div
                                key={item.id}
                                className="p-4 bg-white border border-base-300 rounded-xl shadow-sm space-y-3"
                            >
                                {editingId === item.id ? (
                                    <div className="space-y-4">
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
                                    <div className="flex justify-between items-start">
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
                                                onClick={() => handleDelete(item.id, item.name)}
                                                className="p-2 text-ink-300 active:text-red-500 active:bg-red-50 rounded-lg transition-colors border border-base-300"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
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
