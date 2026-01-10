import { useEffect, useState } from 'react';
import { plannerService } from '../../services/plannerService';
import { Button } from '../../components/ui/Button';
import { RefreshCw, Archive, ShoppingCart, Home, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { AddItemModal } from '../../components/AddItemModal';
import { AddFromListModal } from '../../components/AddFromListModal';
import { List as ListIcon } from 'lucide-react';

export const ShoppingListPage = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inStockExpanded, setInStockExpanded] = useState(false);
    const [orderedExpanded, setOrderedExpanded] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddListModal, setShowAddListModal] = useState(false);

    const loadList = async () => {
        setLoading(true);
        try {
            const list = await plannerService.getShoppingList();
            setItems(list || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    // ... existing useEffect and handlers ...

    // ADD IMPORT (this will be handled by auto-import usually, but forcing it here for clarity if I was writing the whole file, but split implies replacement)
    // Actually, I need to add the import at the top. 
    // Wait, replace_file_content allows replacing a block. I will replace the state definition and the return statement part.
    // But I also need to add the import.
    // I'll do this in two steps or use multi_replace if I can't encompass it all.
    // Since imports are at the top and JSX is at the bottom, I should use multi_replace.
    // Let me switch to multi_replace.


    useEffect(() => {
        loadList();
    }, []);

    const handleToggle = async (itemId: string, field: 'is_purchased' | 'is_in_stock', current: boolean) => {
        try {
            await plannerService.toggleItemStatus(itemId, field, !current);
            setItems(prev => prev.map(item =>
                item.id === itemId ? { ...item, [field]: !current } : item
            ));
        } catch (e) {
            console.error(e);
        }
    };

    const handleArchive = async () => {
        try {
            await plannerService.archivePurchased();
            await loadList();
        } catch (e) {
            console.error(e);
        }
    };

    const activeItems = items.filter(item => !item.is_purchased && !item.is_in_stock);
    const inStockItems = items.filter(item => item.is_in_stock);
    const orderedItems = items.filter(item => item.is_purchased);

    const activeGrouped = activeItems.reduce((acc: any, item) => {
        const cat = item.grocery_types?.category?.name || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const inStockGrouped = inStockItems.reduce((acc: any, item) => {
        const cat = item.grocery_types?.category?.name || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const orderedGrouped = orderedItems.reduce((acc: any, item) => {
        const cat = item.grocery_types?.category?.name || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const renderItem = (item: any, isCompleted = false) => (
        <div key={item.id} className={`grid grid-cols-[1fr_auto] items-center gap-4 p-3 hover:bg-base-100 transition-colors border-b border-base-300 last:border-0 ${isCompleted ? 'opacity-50' : 'bg-white'}`}>
            <div className="min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                    <h3 className={`text-sm font-semibold text-ink-900 truncate ${isCompleted ? 'line-through' : ''}`}>
                        {item.grocery_types?.name}
                    </h3>
                    <span className="text-sm font-bold text-accent">
                        {item.quantity} {item.unit}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-ink-500 font-medium">
                    {item.meal_plan ? (
                        <>
                            <span className="truncate max-w-[150px]">{item.recipe?.grocery_list?.name || item.recipe?.name}</span>
                            <span className="text-ink-300">•</span>
                            <span className="capitalize">{format(new Date(item.meal_plan.date), 'EEEE')}</span>
                            <span className="text-ink-300">•</span>
                            <span>{item.meal_plan.slot}</span>
                            <span className="text-ink-300">•</span>
                            <span>For {item.meal_plan.diner_type}</span>
                        </>
                    ) : (
                        <span>General Requirement</span>
                    )}
                </div>
            </div>
            <div className="flex gap-1.5 px-2 border-l border-base-300 ml-4">
                {isCompleted ? (
                    <button
                        onClick={() => handleToggle(item.id, item.is_purchased ? 'is_purchased' : 'is_in_stock', true)}
                        className="text-[10px] font-bold text-ink-300 hover:text-accent uppercase tracking-wider"
                    >
                        Restore
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => handleToggle(item.id, 'is_purchased', item.is_purchased)}
                            className="p-1.5 rounded text-ink-300 hover:text-success hover:bg-success/5 transition-all"
                            title="Mark as Purchased"
                        >
                            <ShoppingCart size={18} />
                        </button>
                        <button
                            onClick={() => handleToggle(item.id, 'is_in_stock', item.is_in_stock)}
                            className="p-1.5 rounded text-ink-300 hover:text-accent hover:bg-accent/5 transition-all"
                            title="I have this in stock"
                        >
                            <Home size={18} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="space-y-8">
                <PageHeader
                    title="Shopping Ledger"
                    subtitle={`${activeItems.length} items to secure • ${inStockItems.length + orderedItems.length} secured`}
                    actions={
                        <>
                            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} icon={Plus}>
                                Add
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowAddListModal(true)} icon={ListIcon}>
                                Add Lists
                            </Button>
                            <Button variant="outline" size="sm" onClick={loadList} icon={RefreshCw} disabled={loading}>
                                Sync
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleArchive} icon={Archive}>
                                Archive
                            </Button>
                        </>
                    }
                />

                <section className="space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center p-12 text-ink-300">
                            <RefreshCw size={24} className="animate-spin" />
                        </div>
                    ) : activeItems.length === 0 ? (
                        <div className="p-12 text-center bg-base-200 rounded-lg border border-dashed border-base-300 text-ink-500 text-sm">
                            All items are secured.
                        </div>
                    ) : (
                        Object.entries(activeGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]: [string, any]) => (
                            <div key={category} className="space-y-1">
                                <h2 className="section-title">
                                    {category}
                                </h2>
                                <div className="compact-grid overflow-hidden">
                                    {catItems.sort((a: any, b: any) => (a.grocery_types?.name || '').localeCompare(b.grocery_types?.name || '')).map((item: any) => renderItem(item))}
                                </div>
                            </div>
                        ))
                    )}
                </section>

                {inStockItems.length > 0 && (
                    <section className="space-y-4 pt-4">
                        <hr className="border-base-300" />
                        <button
                            onClick={() => setInStockExpanded(!inStockExpanded)}
                            className="flex items-center gap-2 group w-full text-left"
                        >
                            <div className="p-1 rounded bg-base-200 text-ink-500 group-hover:text-accent transition-colors">
                                {inStockExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                            <h2 className="section-title mb-0">
                                In Stock ({inStockItems.length})
                            </h2>
                        </button>

                        {inStockExpanded && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                {Object.entries(inStockGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]: [string, any]) => (
                                    <div key={category} className="space-y-1">
                                        <h3 className="text-[9px] font-bold uppercase tracking-tight text-ink-300 px-2 opacity-60">
                                            {category}
                                        </h3>
                                        <div className="bg-base-200/30 rounded-lg border border-base-300 overflow-hidden">
                                            {catItems.sort((a: any, b: any) => (a.grocery_types?.name || '').localeCompare(b.grocery_types?.name || '')).map((item: any) => renderItem(item, true))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {orderedItems.length > 0 && (
                    <section className="space-y-4 pt-4">
                        <hr className="border-base-300" />
                        <button
                            onClick={() => setOrderedExpanded(!orderedExpanded)}
                            className="flex items-center gap-2 group w-full text-left"
                        >
                            <div className="p-1 rounded bg-base-200 text-ink-500 group-hover:text-accent transition-colors">
                                {orderedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                            <h2 className="section-title mb-0">
                                Ordered ({orderedItems.length})
                            </h2>
                        </button>

                        {orderedExpanded && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                {Object.entries(orderedGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]: [string, any]) => (
                                    <div key={category} className="space-y-1">
                                        <h3 className="text-[9px] font-bold uppercase tracking-tight text-ink-300 px-2 opacity-60">
                                            {category}
                                        </h3>
                                        <div className="bg-base-200/30 rounded-lg border border-base-300 overflow-hidden">
                                            {catItems.sort((a: any, b: any) => (a.grocery_types?.name || '').localeCompare(b.grocery_types?.name || '')).map((item: any) => renderItem(item, true))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>

            <AddItemModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onItemAdded={() => { setShowAddModal(false); loadList(); }}
            />
            <AddFromListModal
                isOpen={showAddListModal}
                onClose={() => setShowAddListModal(false)}
                onItemsAdded={() => { loadList(); }}
            />
        </>
    );
};
