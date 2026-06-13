import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recipeService } from '../../services/recipeService';
import type { RecipeSummary } from '../../services/recipeService';
import { Button } from '../../components/ui/Button';
import { Plus, BookOpen, Package, Search, ChevronDown, ChevronRight, CheckSquare, Square, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { toast } from 'sonner';

const RECIPE_CATEGORIES = [
    { key: 'parent_meals', label: 'Parent Meals' },
    { key: 'kids_meals', label: 'Kids Meals' },
    { key: 'breakfasts', label: 'Breakfasts' },
    { key: 'other', label: 'Other' },
];

export const RecipeListPage = () => {
    const navigate = useNavigate();
    const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(RECIPE_CATEGORIES.map(c => c.key)));
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkCategory, setBulkCategory] = useState(RECIPE_CATEGORIES[0].key);

    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchRecipes = async () => {
        setLoading(true);
        try {
            setRecipes(await recipeService.getRecipes());
        } catch (e) {
            console.error('Failed to fetch recipes:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (key: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleCategoryChange = async (recipe: RecipeSummary, newCategory: string) => {
        try {
            await recipeService.updateRecipeCategory(recipe.id, newCategory);
            setRecipes(prev => prev.map(r => (r.id === recipe.id ? { ...r, category: newCategory } : r)));
            toast.success(`Moved "${recipe.name}" to ${RECIPE_CATEGORIES.find(c => c.key === newCategory)?.label || newCategory}`);
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

    const handleBulkCategorize = async () => {
        const toUpdate = recipes.filter(r => selectedIds.has(r.id));
        if (toUpdate.length === 0) return;
        try {
            await Promise.all(toUpdate.map(r => recipeService.updateRecipeCategory(r.id, bulkCategory)));
            setRecipes(prev => prev.map(r => (selectedIds.has(r.id) ? { ...r, category: bulkCategory } : r)));
            const catLabel = RECIPE_CATEGORIES.find(c => c.key === bulkCategory)?.label || bulkCategory;
            toast.success(`Moved ${toUpdate.length} recipe${toUpdate.length > 1 ? 's' : ''} to ${catLabel}`);
            setSelectedIds(new Set());
        } catch (e) {
            console.error(e);
            toast.error('Failed to update some recipes');
        }
    };

    const filtered = recipes.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const grouped: Record<string, RecipeSummary[]> = {};
    RECIPE_CATEGORIES.forEach(cat => { grouped[cat.key] = []; });
    filtered.forEach(recipe => {
        const cat = recipe.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(recipe);
    });

    const renderRow = (recipe: RecipeSummary) => {
        const isSelected = selectedIds.has(recipe.id);
        return (
            <tr
                key={recipe.id}
                className={`zen-table-row group cursor-pointer ${isSelected ? 'bg-accent/5' : ''}`}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
                <td className="zen-table-cell pl-4 w-10" onClick={(e) => { e.stopPropagation(); toggleSelect(recipe.id); }}>
                    <div className="flex items-center justify-center cursor-pointer">
                        {isSelected
                            ? <CheckSquare size={18} className="text-accent" />
                            : <Square size={18} className="text-ink-300 hover:text-ink-500 transition-colors" />}
                    </div>
                </td>
                <td className="zen-table-cell">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-base-300 rounded text-ink-500 group-hover:text-accent transition-colors">
                            <BookOpen size={16} />
                        </div>
                        <span className="font-bold text-ink-900 group-hover:text-accent transition-colors">{recipe.name}</span>
                    </div>
                </td>
                <td className="zen-table-cell">
                    <div className="flex items-center gap-1.5 text-ink-500">
                        <Package size={14} />
                        <span className="text-xs font-medium">{recipe.itemCount}</span>
                    </div>
                </td>
                <td className="zen-table-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                        value={recipe.category || 'other'}
                        onChange={(e) => handleCategoryChange(recipe, e.target.value)}
                        className="text-xs border border-base-300 rounded-lg px-2 py-1 bg-white text-ink-700 cursor-pointer hover:border-accent transition-colors focus:ring-1 focus:ring-accent focus:outline-none"
                    >
                        {RECIPE_CATEGORIES.map(cat => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
                    </select>
                </td>
            </tr>
        );
    };

    const renderMobileCard = (recipe: RecipeSummary) => {
        const isSelected = selectedIds.has(recipe.id);
        return (
            <div
                key={recipe.id}
                className={`p-4 bg-white border rounded-xl shadow-sm transition-colors ${isSelected ? 'border-accent bg-accent/5' : 'border-base-300'}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(recipe.id); }} className="flex-shrink-0">
                            {isSelected
                                ? <CheckSquare size={20} className="text-accent" />
                                : <Square size={20} className="text-ink-300" />}
                        </button>
                        <div className="flex items-center gap-2" onClick={() => navigate(`/recipes/${recipe.id}`)}>
                            <div className="p-1.5 bg-base-200 rounded text-ink-500">
                                <BookOpen size={16} />
                            </div>
                            <h3 className="font-bold text-ink-900 text-base leading-tight">{recipe.name}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-500">
                        <Package size={14} />
                        <span className="text-xs font-medium">{recipe.itemCount}</span>
                    </div>
                </div>
                <div className="mt-2 pt-2 border-t border-base-200">
                    <select
                        value={recipe.category || 'other'}
                        onChange={(e) => handleCategoryChange(recipe, e.target.value)}
                        className="w-full text-xs border border-base-300 rounded-lg px-2 py-1.5 bg-white text-ink-700 cursor-pointer"
                    >
                        {RECIPE_CATEGORIES.map(cat => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
                    </select>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Recipes"
                subtitle={`${recipes.length} recipes in your library.`}
                actions={
                    <div className="flex flex-col md:flex-row gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" size={14} />
                            <input
                                type="text"
                                placeholder="Search recipes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="zen-input pl-9 w-full md:w-64"
                            />
                        </div>
                        <Button onClick={() => navigate('/recipes/new')} icon={Plus} variant="primary">
                            New Recipe
                        </Button>
                    </div>
                }
            />

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-pulse text-ink-400">Loading...</div>
                </div>
            ) : recipes.length === 0 ? (
                <Card className="p-8 text-center">
                    <BookOpen className="mx-auto mb-4 text-ink-300" size={48} />
                    <h3 className="text-lg font-semibold text-ink-700 mb-2">No recipes yet</h3>
                    <p className="text-ink-400 mb-4">Create a recipe to start planning meals.</p>
                    <Button icon={Plus} onClick={() => navigate('/recipes/new')}>Create First Recipe</Button>
                </Card>
            ) : (
                RECIPE_CATEGORIES.map(cat => {
                    const items = grouped[cat.key];
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
                                    <div className="hidden md:block zen-table-container">
                                        <table className="zen-table">
                                            <thead className="zen-table-header">
                                                <tr>
                                                    <th className="zen-table-cell w-10 pl-4"></th>
                                                    <th className="zen-table-cell w-1/2">Recipe</th>
                                                    <th className="zen-table-cell">Ingredients</th>
                                                    <th className="zen-table-cell">Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>{items.map(renderRow)}</tbody>
                                        </table>
                                    </div>
                                    <div className="md:hidden space-y-3">{items.map(renderMobileCard)}</div>
                                </>
                            )}
                        </section>
                    );
                })
            )}

            {/* Floating action bar for bulk categorization */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-base-300 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in">
                    <span className="text-sm font-semibold text-ink-700 whitespace-nowrap">{selectedIds.size} selected</span>
                    <select
                        value={bulkCategory}
                        onChange={(e) => setBulkCategory(e.target.value)}
                        className="text-sm border border-base-300 rounded-lg px-3 py-1.5 bg-white text-ink-700 cursor-pointer focus:ring-1 focus:ring-accent focus:outline-none"
                    >
                        {RECIPE_CATEGORIES.map(cat => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
                    </select>
                    <Button size="sm" onClick={handleBulkCategorize}>Move</Button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="p-1.5 text-ink-400 hover:text-ink-700 transition-colors"
                        title="Clear selection"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};
