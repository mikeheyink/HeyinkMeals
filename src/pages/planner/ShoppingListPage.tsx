import { useEffect, useState } from 'react';
import { plannerService } from '../../services/plannerService';
import { Button } from '../../components/ui/Button';
import { RefreshCw, Archive, Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/ui/PageHeader';
import { AddItemModal } from '../../components/AddItemModal';
import { AddFromListModal } from '../../components/AddFromListModal';
import { List as ListIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const ShoppingListPage = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inStockExpanded, setInStockExpanded] = useState(false);
    const [orderedExpanded, setOrderedExpanded] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddListModal, setShowAddListModal] = useState(false);
    const [groupByShop, setGroupByShop] = useState(false);

    // Store assignment state
    const [stores, setStores] = useState<any[]>([]);
    const [savingStoreForType, setSavingStoreForType] = useState<string | null>(null);

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

    const loadStores = async () => {
        try {
            const { data } = await supabase.from('stores').select('*').order('name');
            setStores(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadList();
        loadStores();
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

    const handleSetStore = async (groceryTypeId: string, storeId: string | null) => {
        if (!groceryTypeId) return;
        setSavingStoreForType(groceryTypeId);
        const nextStore = storeId ? stores.find(s => s.id === storeId) || null : null;

        setItems(prev => prev.map(item => {
            if (item.grocery_types?.id === groceryTypeId) {
                return {
                    ...item,
                    grocery_types: {
                        ...item.grocery_types,
                        store: nextStore,
                    },
                };
            }
            return item;
        }));

        try {
            await supabase
                .from('grocery_types')
                .update({ default_store_id: storeId })
                .eq('id', groceryTypeId);
        } catch (e) {
            console.error(e);
            await loadList();
        } finally {
            setSavingStoreForType(null);
        }
    };

    const activeItems = items.filter(item => !item.is_purchased && !item.is_in_stock);
    const inStockItems = items.filter(item => item.is_in_stock);
    const orderedItems = items.filter(item => item.is_purchased);

    const getGroupKey = (item: any) => {
        if (groupByShop) {
            return item.grocery_types?.store?.name || 'No Preferred Shop';
        }
        return item.grocery_types?.category?.name || 'Other';
    };

    const activeGrouped = activeItems.reduce((acc: any, item) => {
        const key = getGroupKey(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const inStockGrouped = inStockItems.reduce((acc: any, item) => {
        const key = getGroupKey(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const orderedGrouped = orderedItems.reduce((acc: any, item) => {
        const key = getGroupKey(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const renderItem = (item: any, isCompleted = false) => {
        const groceryTypeId = item.grocery_types?.id;
        const currentStoreId = item.grocery_types?.store?.id || null;
        const isSavingStore = savingStoreForType === groceryTypeId;

        return (
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
                <div className="flex items-center gap-3 px-2 border-l border-base-300 ml-4">
                    {!isCompleted && stores.length > 0 && (
                        <div className="hidden md:flex gap-1" role="group" aria-label="Preferred store">
                            {stores.map(store => {
                                const isActive = currentStoreId === store.id;
                                return (
                                    <button
                                        key={store.id}
                                        onClick={() => handleSetStore(groceryTypeId, isActive ? null : store.id)}
                                        disabled={isSavingStore}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                            isActive
                                                ? 'bg-accent text-white border-accent'
                                                : 'bg-white text-ink-500 border-base-300 hover:border-accent hover:text-accent'
                                        } ${isSavingStore ? 'opacity-60 cursor-wait' : ''}`}
                                        title={isActive ? `Clear preferred store (${store.name})` : `Set preferred store to ${store.name}`}
                                    >
                                        {store.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex gap-1.5">
                        {isCompleted ? (
                            <button
                                onClick={() => handleToggle(item.id, item.is_purchased ? 'is_purchased' : 'is_in_stock', true)}
                                className="text-[10px] font-bold text-ink-300 hover:text-accent uppercase tracking-wider"
                            >
                                Restore
                            </button>
                        ) : (
                            <button
                                onClick={() => handleToggle(item.id, 'is_purchased', item.is_purchased)}
                                className="p-1.5 rounded text-ink-300 hover:text-success hover:bg-success/5 transition-all"
                                title="Mark as done"
                            >
                                <Check size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="space-y-8">
                <PageHeader
                    title="Shopping Ledger"
                    subtitle={`${activeItems.length} items on your list`}
                    actions={
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-ink-700 bg-white border border-base-300 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-base-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={groupByShop}
                                    onChange={(e) => setGroupByShop(e.target.checked)}
                                    className="accent-accent w-4 h-4 cursor-pointer"
                                />
                                Group by Shop
                            </label>
                            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} icon={Plus} className="flex-1 md:flex-none">
                                Add
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowAddListModal(true)} icon={ListIcon} className="flex-1 md:flex-none">
                                Add Lists
                            </Button>
                            <Button variant="outline" size="sm" onClick={loadList} icon={RefreshCw} disabled={loading} className="md:w-auto" title="Sync">
                                <span className="hidden md:inline">Sync</span>
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleArchive} icon={Archive} className="md:w-auto" title="Archive">
                                <span className="hidden md:inline">Archive</span>
                            </Button>
                        </div>
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
                        Object.entries(activeGrouped)
                            .sort(([a], [b]) => {
                                // "No Preferred Shop" should always be first
                                if (a === 'No Preferred Shop') return -1;
                                if (b === 'No Preferred Shop') return 1;
                                return a.localeCompare(b);
                            })
                            .map(([groupKey, catItems]: [string, any]) => (
                                <div key={groupKey} className="space-y-1">
                                    <h2 className="section-title">
                                        {groupKey}
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
