import { useEffect, useState } from 'react';
import { groceryListService } from '../../services/groceryListService';
import type { GroceryListWithRecipe, GroceryListsGrouped } from '../../services/groceryListService';
import { Button } from '../../components/ui/Button';
import { Plus, List, BookOpen, Package } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { GroceryListModal } from '../../components/GroceryListModal';
import { Card } from '../../components/ui/Card';

export const RecipeListPage = () => {
    const [data, setData] = useState<GroceryListsGrouped>({ withRecipes: [], withoutRecipes: [] });
    const [loading, setLoading] = useState(true);
    const [selectedList, setSelectedList] = useState<GroceryListWithRecipe | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const renderListItem = (list: GroceryListWithRecipe) => (
        <tr
            key={list.id}
            className="zen-table-row group cursor-pointer"
            onClick={() => handleListClick(list)}
        >
            <td className="zen-table-cell">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-base-300 rounded text-ink-500 group-hover:text-accent transition-colors">
                        {list.recipe ? <BookOpen size={16} /> : <List size={16} />}
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
                {list.recipe ? (
                    <span className="zen-badge bg-accent/10 text-accent">
                        {list.recipe.name}
                    </span>
                ) : (
                    <span className="text-xs text-ink-300 italic">No recipe</span>
                )}
            </td>
        </tr>
    );

    const renderMobileCard = (list: GroceryListWithRecipe) => (
        <div
            key={list.id}
            onClick={() => handleListClick(list)}
            className="p-4 bg-white border border-base-300 rounded-xl shadow-sm active:bg-base-200 transition-colors"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-base-200 rounded text-ink-500">
                        {list.recipe ? <BookOpen size={16} /> : <List size={16} />}
                    </div>
                    <h3 className="font-bold text-ink-900 text-base leading-tight">
                        {list.name}
                    </h3>
                </div>
            </div>
            <div className="flex items-center gap-4 text-ink-500">
                <div className="flex items-center gap-1.5">
                    <Package size={14} />
                    <span className="text-xs font-medium">{list.itemCount} items</span>
                </div>
                {list.recipe && (
                    <span className="zen-badge bg-accent/10 text-accent text-xs">
                        {list.recipe.name}
                    </span>
                )}
            </div>
        </div>
    );

    const totalLists = data.withRecipes.length + data.withoutRecipes.length;

    return (
        <div className="space-y-8">
            <PageHeader
                title="Grocery Lists"
                subtitle={`${totalLists} lists organized by recipe association.`}
                actions={
                    <Button onClick={() => { /* TODO: Add new list modal */ }} icon={Plus}>
                        New List
                    </Button>
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
                    {/* With Recipes Section */}
                    {data.withRecipes.length > 0 && (
                        <section>
                            <h2 className="section-title mb-4 flex items-center gap-2">
                                <BookOpen size={18} className="text-accent" />
                                Lists with Recipes ({data.withRecipes.length})
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
                                        {data.withRecipes.map(renderListItem)}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-3">
                                {data.withRecipes.map(renderMobileCard)}
                            </div>
                        </section>
                    )}

                    {/* Without Recipes Section */}
                    {data.withoutRecipes.length > 0 && (
                        <section className={data.withRecipes.length > 0 ? 'mt-8' : ''}>
                            <h2 className="section-title mb-4 flex items-center gap-2">
                                <List size={18} className="text-ink-400" />
                                Lists without Recipes ({data.withoutRecipes.length})
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
                                        {data.withoutRecipes.map(renderListItem)}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-3">
                                {data.withoutRecipes.map(renderMobileCard)}
                            </div>
                        </section>
                    )}
                </>
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
