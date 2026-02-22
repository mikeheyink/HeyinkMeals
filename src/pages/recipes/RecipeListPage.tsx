import { useEffect, useState } from 'react';
import { groceryListService } from '../../services/groceryListService';
import { recipeService } from '../../services/recipeService';
import type { GroceryListWithRecipe, GroceryListsGrouped } from '../../services/groceryListService';
import { Button } from '../../components/ui/Button';
import { Plus, List, BookOpen, Package, Search, ChevronDown, ChevronRight, CheckSquare, Square, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { GroceryListModal } from '../../components/GroceryListModal';
import { Card } from '../../components/ui/Card';
import { toast } from 'sonner';

const RECIPE_CATEGORIES = [
    { key: 'parent_meals', label: 'Parent Meals' },
    { key: 'kids_meals', label: 'Kids Meals' },
    { key: 'breakfasts', label: 'Breakfasts' },
    { key: 'other', label: 'Other' },
];

export const RecipeListPage = () => {
    const [data, setData] = useState<GroceryListsGrouped>({ withRecipes: [], withoutRecipes: [] });
    const [loading, setLoading] = useState(true);
    const [selectedList, setSelectedList] = useState<GroceryListWithRecipe | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(RECIPE_CATEGORIES.map(c => c.key)));
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkCategory, setBulkCategory] = useState(RECIPE_CATEGORIES[0].key);

    useEffect(() => {
        fetchLists();
    }, []);

    const fetchLists = async () => {
        setLoading(true);
        try {
            const grouped = await groceryListService.getGroceryListsGrouped();
            setData(grouped);
        } catch (e) {
            console.error('Failed to fetch grocery lists:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleListClick = (list: GroceryListWithRecipe) => {
        setSelectedList(list);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedList(null);
    };

    const handleUpdate = () => {
        fetchLists();
    };

    const toggleCategory = (key: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleCategoryChange = async (list: GroceryListWithRecipe, newCategory: string) => {
        if (!list.recipe) return;
        try {
            await recipeService.updateRecipeCategory(list.recipe.id, newCategory);
            // Optimistic update
            setData(prev => ({
                ...prev,
                withRecipes: prev.withRecipes.map(r =>
                    r.id === list.id && r.recipe
                        ? { ...r, recipe: { ...r.recipe, category: newCategory } }
                        : r
                ),
            }));
            toast.success(`Moved "${list.name}" to ${RECIPE_CATEGORIES.find(c => c.key === newCategory)?.label || newCategory}`);
        } catch (e) {
            console.error(e);
            toast.error('Failed to update category');
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = (items: GroceryListWithRecipe[]) => {
        const ids = items.filter(i => i.recipe).map(i => i.id);
        const allSelected = ids.every(id => selectedIds.has(id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                ids.forEach(id => next.delete(id));
            } else {
                ids.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const handleBulkCategorize = async () => {
        const toUpdate = data.withRecipes.filter(r => selectedIds.has(r.id) && r.recipe);
        if (toUpdate.length === 0) return;
        try {
            await Promise.all(
                toUpdate.map(r => recipeService.updateRecipeCategory(r.recipe!.id, bulkCategory))
            );
            // Optimistic update
            setData(prev => ({
                ...prev,
                withRecipes: prev.withRecipes.map(r =>
                    selectedIds.has(r.id) && r.recipe
                        ? { ...r, recipe: { ...r.recipe, category: bulkCategory } }
                        : r
                ),
            }));
            const catLabel = RECIPE_CATEGORIES.find(c => c.key === bulkCategory)?.label || bulkCategory;
            toast.success(`Moved ${toUpdate.length} recipe${toUpdate.length > 1 ? 's' : ''} to ${catLabel}`);
            setSelectedIds(new Set());
        } catch (e) {
            console.error(e);
            toast.error('Failed to update some recipes');
        }
    };

    const filterList = (list: GroceryListWithRecipe) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return list.name.toLowerCase().includes(query) ||
            (list.recipe && list.recipe.name.toLowerCase().includes(query));
    };

    const filteredWithRecipes = data.withRecipes.filter(filterList);
    const filteredWithoutRecipes = data.withoutRecipes.filter(filterList);
    const totalLists = data.withRecipes.length + data.withoutRecipes.length;

    // Group recipes by category
    const groupedRecipes: Record<string, GroceryListWithRecipe[]> = {};
    RECIPE_CATEGORIES.forEach(cat => { groupedRecipes[cat.key] = []; });
    filteredWithRecipes.forEach(list => {
        const cat = list.recipe?.category || 'other';
        if (!groupedRecipes[cat]) groupedRecipes[cat] = [];
        groupedRecipes[cat].push(list);
    });

    const renderListItem = (list: GroceryListWithRecipe) => {
        const isSelected = selectedIds.has(list.id);
        return (
            <tr
                key={list.id}
                className={`zen-table-row group cursor-pointer ${isSelected ? 'bg-accent/5' : ''}`}
                onClick={() => handleListClick(list)}
            >
                <td className="zen-table-cell pl-4 w-10" onClick={(e) => { e.stopPropagation(); toggleSelect(list.id); }}>
                    <div className="flex items-center justify-center cursor-pointer">
                        {isSelected
                            ? <CheckSquare size={18} className="text-accent" />
                            : <Square size={18} className="text-ink-300 hover:text-ink-500 transition-colors" />
                        }
                    </div>
                </td>
                <td className="zen-table-cell">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-base-300 rounded text-ink-500 group-hover:text-accent transition-colors">
                            <BookOpen size={16} />
                        </div>
                        <span className="font-bold text-ink-900 group-hover:text-accent transition-colors">
                            {list.name}
                        </span>
                    </div>
                </td>
                <td className="zen-table-cell">
                    <div className="flex items-center gap-1.5 text-ink-500">
                        <Package size={14} />
                        <span className="text-xs font-medium">{list.itemCount}</span>
                    </div>
                </td>
                <td className="zen-table-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                        value={list.recipe?.category || 'other'}
                        onChange={(e) => handleCategoryChange(list, e.target.value)}
                        className="text-xs border border-base-300 rounded-lg px-2 py-1 bg-white text-ink-700 cursor-pointer hover:border-accent transition-colors focus:ring-1 focus:ring-accent focus:outline-none"
                    >
                        {RECIPE_CATEGORIES.map(cat => (
                            <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                    </select>
                </td>
            </tr>
        );
    };

    const renderMobileCard = (list: GroceryListWithRecipe) => {
        const isSelected = selectedIds.has(list.id);
        return (
            <div
                key={list.id}
                className={`p-4 bg-white border rounded-xl shadow-sm transition-colors ${isSelected ? 'border-accent bg-accent/5' : 'border-base-300'}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(list.id); }}
                            className="flex-shrink-0"
                        >
                            {isSelected
                                ? <CheckSquare size={20} className="text-accent" />
                                : <Square size={20} className="text-ink-300" />
                            }
                        </button>
                        <div className="flex items-center gap-2" onClick={() => handleListClick(list)}>
                            <div className="p-1.5 bg-base-200 rounded text-ink-500">
                                <BookOpen size={16} />
                            </div>
                            <h3 className="font-bold text-ink-900 text-base leading-tight">
                                {list.name}
                            </h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-500">
                        <Package size={14} />
                        <span className="text-xs font-medium">{list.itemCount}</span>
                    </div>
                </div>
                <div className="mt-2 pt-2 border-t border-base-200">
                    <select
                        value={list.recipe?.category || 'other'}
                        onChange={(e) => handleCategoryChange(list, e.target.value)}
                        className="w-full text-xs border border-base-300 rounded-lg px-2 py-1.5 bg-white text-ink-700 cursor-pointer"
                    >
                        {RECIPE_CATEGORIES.map(cat => (
                            <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    };

    const renderStandaloneListItem = (list: GroceryListWithRecipe) => (
        <tr
            key={list.id}
            className="zen-table-row group cursor-pointer"
            onClick={() => handleListClick(list)}
        >
            <td className="zen-table-cell pl-8">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-base-300 rounded text-ink-500 group-hover:text-accent transition-colors">
                        <List size={16} />
                    </div>
                    <span className="font-bold text-ink-900 group-hover:text-accent transition-colors">
                        {list.name}
                    </span>
                </div>
            </td>
            <td className="zen-table-cell">
                <div className="flex items-center gap-1.5 text-ink-500">
                    <Package size={14} />
                    <span className="text-xs font-medium">{list.itemCount}</span>
                </div>
            </td>
            <td className="zen-table-cell">
                <span className="text-xs text-ink-300 italic">No recipe</span>
            </td>
        </tr>
    );

    const renderStandaloneMobileCard = (list: GroceryListWithRecipe) => (
        <div
            key={list.id}
            onClick={() => handleListClick(list)}
            className="p-4 bg-white border border-base-300 rounded-xl shadow-sm active:bg-base-200 transition-colors"
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-base-200 rounded text-ink-500">
                        <List size={16} />
                    </div>
                    <h3 className="font-bold text-ink-900 text-base leading-tight">
                        {list.name}
                    </h3>
                </div>
                <div className="flex items-center gap-1.5 text-ink-500">
                    <Package size={14} />
                    <span className="text-xs font-medium">{list.itemCount} items</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <PageHeader
                title="Grocery Lists"
                subtitle={`${totalLists} lists organized by recipe association.`}
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
                        <Button onClick={() => { /* TODO: Add new list modal */ }} icon={Plus} variant="primary">
                            New List
                        </Button>
                    </div>
                }
            />

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-pulse text-ink-400">Loading...</div>
                </div>
            ) : totalLists === 0 ? (
                <Card className="p-8 text-center">
                    <List className="mx-auto mb-4 text-ink-300" size={48} />
                    <h3 className="text-lg font-semibold text-ink-700 mb-2">No grocery lists yet</h3>
                    <p className="text-ink-400 mb-4">Create a list to start organizing your ingredients.</p>
                    <Button icon={Plus}>Create First List</Button>
                </Card>
            ) : (
                <>
                    {/* Recipes grouped by category */}
                    {RECIPE_CATEGORIES.map(cat => {
                        const items = groupedRecipes[cat.key];
                        if (!items || items.length === 0) return null;
                        const isExpanded = expandedCategories.has(cat.key);

                        return (
                            <section key={cat.key} className="space-y-2">
                                <button
                                    className="w-full flex items-center gap-2 p-3 bg-base-100 rounded-xl font-bold text-ink-900 shadow-sm border border-base-200 active:scale-[0.98] transition-all"
                                    onClick={() => toggleCategory(cat.key)}
                                >
                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    <BookOpen size={16} className="text-accent" />
                                    {cat.label}
                                    <span className="text-ink-400 font-medium ml-auto text-sm">{items.length}</span>
                                </button>

                                {isExpanded && (
                                    <>
                                        {/* Desktop Table */}
                                        <div className="hidden md:block zen-table-container">
                                            <table className="zen-table">
                                                <thead className="zen-table-header">
                                                    <tr>
                                                        <th className="zen-table-cell w-10 pl-4" onClick={(e) => { e.stopPropagation(); toggleSelectAll(items); }}>
                                                            <div className="cursor-pointer flex items-center justify-center">
                                                                {items.filter(i => i.recipe).every(i => selectedIds.has(i.id))
                                                                    ? <CheckSquare size={16} className="text-accent" />
                                                                    : <Square size={16} className="text-ink-300 hover:text-ink-500" />
                                                                }
                                                            </div>
                                                        </th>
                                                        <th className="zen-table-cell w-1/2">List Name</th>
                                                        <th className="zen-table-cell">Items</th>
                                                        <th className="zen-table-cell">Category</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map(renderListItem)}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Cards */}
                                        <div className="md:hidden space-y-3">
                                            {items.map(renderMobileCard)}
                                        </div>
                                    </>
                                )}
                            </section>
                        );
                    })}

                    {/* Without Recipes Section */}
                    {filteredWithoutRecipes.length > 0 && (
                        <section className="mt-4 space-y-2">
                            <h2 className="section-title mb-4 flex items-center gap-2">
                                <List size={18} className="text-ink-400" />
                                Lists without Recipes ({filteredWithoutRecipes.length})
                            </h2>

                            {/* Desktop Table */}
                            <div className="hidden md:block zen-table-container">
                                <table className="zen-table">
                                    <thead className="zen-table-header">
                                        <tr>
                                            <th className="zen-table-cell w-1/2">List Name</th>
                                            <th className="zen-table-cell">Items</th>
                                            <th className="zen-table-cell">Recipe</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredWithoutRecipes.map(renderStandaloneListItem)}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-3">
                                {filteredWithoutRecipes.map(renderStandaloneMobileCard)}
                            </div>
                        </section>
                    )}

                    {!loading && filteredWithRecipes.length === 0 && filteredWithoutRecipes.length === 0 && (
                        <div className="p-12 text-center bg-base-200 rounded-lg border border-dashed border-base-300 text-ink-500 text-sm">
                            No lists found matching "{searchQuery}"
                        </div>
                    )}
                </>
            )}

            {/* Floating action bar for bulk categorization */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-base-300 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in">
                    <span className="text-sm font-semibold text-ink-700 whitespace-nowrap">
                        {selectedIds.size} selected
                    </span>
                    <select
                        value={bulkCategory}
                        onChange={(e) => setBulkCategory(e.target.value)}
                        className="text-sm border border-base-300 rounded-lg px-3 py-1.5 bg-white text-ink-700 cursor-pointer focus:ring-1 focus:ring-accent focus:outline-none"
                    >
                        {RECIPE_CATEGORIES.map(cat => (
                            <option key={cat.key} value={cat.key}>{cat.label}</option>
                        ))}
                    </select>
                    <Button size="sm" onClick={handleBulkCategorize}>
                        Move
                    </Button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="p-1.5 text-ink-400 hover:text-ink-700 transition-colors"
                        title="Clear selection"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <GroceryListModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onUpdate={handleUpdate}
                groceryList={selectedList}
            />
        </div>
    );
};
