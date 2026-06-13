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

interface Store { id: string; name: string }

interface ShoppingRow {
    id: string;
    quantity: number;
    unit: string;
    is_purchased: boolean;
    is_in_stock: boolean;
    recipe: { name: string } | null;
    grocery_types: {
        id: string;
        name: string;
        category?: { name: string } | null;
        store?: Store | null;
    } | null;
    meal_plan: { date: string; slot: string; diner_type: string } | null;
}

// One active shopping line, after merging duplicate grocery type + unit across meals.
interface AggRow {
    key: string;
    ids: string[];
    grocery_types: ShoppingRow['grocery_types'];
    unit: string;
    quantity: number;
    sources: number;
    sampleMealPlan: ShoppingRow['meal_plan'];
    sampleRecipe: ShoppingRow['recipe'];
}

export const ShoppingListPage = () => {
    const [items, setItems] = useState<ShoppingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [inStockExpanded, setInStockExpanded] = useState(false);
    const [orderedExpanded, setOrderedExpanded] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddListModal, setShowAddListModal] = useState(false);
    const [groupByShop, setGroupByShop] = useState(false);

    const [stores, setStores] = useState<Store[]>([]);
    const [savingStoreForType, setSavingStoreForType] = useState<string | null>(null);

    const loadList = async () => {
        setLoading(true);
        try {
            const list = await plannerService.getShoppingList();
            setItems((list as unknown as ShoppingRow[]) || []);
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

    // Single completed-item toggle (Restore from in-stock / ordered sections).
    const handleToggle = async (itemId: string, field: 'is_purchased' | 'is_in_stock', current: boolean) => {
        try {
            await plannerService.toggleItemStatus(itemId, field, !current);
            setItems(prev => prev.map(item => (item.id === itemId ? { ...item, [field]: !current } : item)));
        } catch (e) {
            console.error(e);
        }
    };

    // Mark every underlying row of an aggregated active line.
    const handleMarkAll = async (ids: string[], field: 'is_purchased' | 'is_in_stock') => {
        try {
            await plannerService.setItemsStatus(ids, field, true);
            setItems(prev => prev.map(item => (ids.includes(item.id) ? { ...item, [field]: true } : item)));
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

    const handleSetStore = async (groceryTypeId: string | undefined, storeId: string | null) => {
        if (!groceryTypeId) return;
        setSavingStoreForType(groceryTypeId);
        const nextStore = storeId ? stores.find(s => s.id === storeId) || null : null;

        setItems(prev => prev.map(item => {
            if (item.grocery_types?.id === groceryTypeId) {
                return { ...item, grocery_types: { ...item.grocery_types, store: nextStore } };
            }
            return item;
        }));

        try {
            await supabase.from('grocery_types').update({ default_store_id: storeId }).eq('id', groceryTypeId);
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

    // Merge duplicate grocery type + unit across meals into single active lines.
    const activeAgg: AggRow[] = (() => {
        const map = new Map<string, AggRow>();
        for (const it of activeItems) {
            const gtId = it.grocery_types?.id ?? 'unknown';
            const key = `${gtId}__${it.unit}`;
            const existing = map.get(key);
            if (existing) {
                existing.ids.push(it.id);
                existing.quantity += Number(it.quantity) || 0;
                existing.sources += 1;
            } else {
                map.set(key, {
                    key,
                    ids: [it.id],
                    grocery_types: it.grocery_types,
                    unit: it.unit,
                    quantity: Number(it.quantity) || 0,
                    sources: 1,
                    sampleMealPlan: it.meal_plan,
                    sampleRecipe: it.recipe,
                });
            }
        }
        return Array.from(map.values());
    })();

    const aggGroupKey = (agg: AggRow) =>
        groupByShop
            ? agg.grocery_types?.store?.name || 'No Preferred Shop'
            : agg.grocery_types?.category?.name || 'Other';

    const itemGroupKey = (item: ShoppingRow) =>
        groupByShop
            ? item.grocery_types?.store?.name || 'No Preferred Shop'
            : item.grocery_types?.category?.name || 'Other';

    const groupBy = <T,>(rows: T[], keyFn: (row: T) => string): Record<string, T[]> =>
        rows.reduce((acc: Record<string, T[]>, row) => {
            const key = keyFn(row);
            (acc[key] ||= []).push(row);
            return acc;
        }, {});

    const activeGrouped = groupBy(activeAgg, aggGroupKey);
    const inStockGrouped = groupBy(inStockItems, itemGroupKey);
    const orderedGrouped = groupBy(orderedItems, itemGroupKey);

    const renderActiveRow = (agg: AggRow) => {
        const groceryTypeId = agg.grocery_types?.id;
        const currentStoreId = agg.grocery_types?.store?.id || null;
        const isSavingStore = savingStoreForType === groceryTypeId;

        return (
            <div key={agg.key} className="grid grid-cols-[1fr_auto] items-center gap-4 p-3 hover:bg-base-100 transition-colors border-b border-base-300 last:border-0 bg-white">
                <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-0.5">
                        <h3 className="text-sm font-semibold text-ink-900 truncate">{agg.grocery_types?.name}</h3>
                        <span className="text-sm font-bold text-accent">{agg.quantity} {agg.unit}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-ink-500 font-medium">
                        {agg.sources > 1 ? (
                            <span>{agg.sources} sources</span>
                        ) : agg.sampleMealPlan ? (
                            <>
                                <span className="truncate max-w-[150px]">{agg.sampleRecipe?.name || 'Planned'}</span>
                                <span className="text-ink-300">•</span>
                                <span className="capitalize">{format(new Date(agg.sampleMealPlan.date), 'EEEE')}</span>
                                <span className="text-ink-300">•</span>
                                <span>{agg.sampleMealPlan.slot}</span>
                                <span className="text-ink-300">•</span>
                                <span>For {agg.sampleMealPlan.diner_type}</span>
                            </>
                        ) : (
                            <span>General Requirement</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 px-2 border-l border-base-300 ml-4">
                    {stores.length > 0 && (
                        <div className="hidden md:flex gap-1" role="group" aria-label="Preferred store">
                            {stores.map(store => {
                                const isActive = currentStoreId === store.id;
                                return (
                                    <button
                                        key={store.id}
                                        onClick={() => handleSetStore(groceryTypeId, isActive ? null : store.id)}
                                        disabled={isSavingStore}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${isActive
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
                    <button
                        onClick={() => handleMarkAll(agg.ids, 'is_purchased')}
                        className="p-1.5 rounded text-ink-300 hover:text-success hover:bg-success/5 transition-all"
                        title="Mark as done"
                    >
                        <Check size={18} />
                    </button>
                </div>
            </div>
        );
    };

    const renderCompletedRow = (item: ShoppingRow) => (
        <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 p-3 border-b border-base-300 last:border-0 opacity-50">
            <div className="min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                    <h3 className="text-sm font-semibold text-ink-900 truncate line-through">{item.grocery_types?.name}</h3>
                    <span className="text-sm font-bold text-accent">{item.quantity} {item.unit}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-ink-500 font-medium">
                    {item.meal_plan ? (
                        <>
                            <span className="truncate max-w-[150px]">{item.recipe?.name || 'Planned'}</span>
                            <span className="text-ink-300">•</span>
                            <span className="capitalize">{format(new Date(item.meal_plan.date), 'EEEE')}</span>
                            <span className="text-ink-300">•</span>
                            <span>{item.meal_plan.slot}</span>
                        </>
                    ) : (
                        <span>General Requirement</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3 px-2 border-l border-base-300 ml-4">
                <button
                    onClick={() => handleToggle(item.id, item.is_purchased ? 'is_purchased' : 'is_in_stock', true)}
                    className="text-[10px] font-bold text-ink-300 hover:text-accent uppercase tracking-wider"
                >
                    Restore
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div className="space-y-8">
                <PageHeader
                    title="Shopping Ledger"
                    subtitle={`${activeAgg.length} items on your list`}
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
                    ) : activeAgg.length === 0 ? (
                        <div className="p-12 text-center bg-base-200 rounded-lg border border-dashed border-base-300 text-ink-500 text-sm">
                            All items are secured.
                        </div>
                    ) : (
                        Object.entries(activeGrouped)
                            .sort(([a], [b]) => {
                                if (a === 'No Preferred Shop') return -1;
                                if (b === 'No Preferred Shop') return 1;
                                return a.localeCompare(b);
                            })
                            .map(([groupKey, rows]) => (
                                <div key={groupKey} className="space-y-1">
                                    <h2 className="section-title">{groupKey}</h2>
                                    <div className="compact-grid overflow-hidden">
                                        {rows
                                            .sort((a, b) => (a.grocery_types?.name || '').localeCompare(b.grocery_types?.name || ''))
                                            .map(renderActiveRow)}
                                    </div>
                                </div>
                            ))
                    )}
                </section>

                {inStockItems.length > 0 && (
                    <section className="space-y-4 pt-4">
                        <hr className="border-base-300" />
                        <button onClick={() => setInStockExpanded(!inStockExpanded)} className="flex items-center gap-2 group w-full text-left">
                            <div className="p-1 rounded bg-base-200 text-ink-500 group-hover:text-accent transition-colors">
                                {inStockExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                            <h2 className="section-title mb-0">In Stock ({inStockItems.length})</h2>
                        </button>

                        {inStockExpanded && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                {Object.entries(inStockGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, rows]) => (
                                    <div key={category} className="space-y-1">
                                        <h3 className="text-[9px] font-bold uppercase tracking-tight text-ink-300 px-2 opacity-60">{category}</h3>
                                        <div className="bg-base-200/30 rounded-lg border border-base-300 overflow-hidden">
                                            {rows.sort((a, b) => (a.grocery_types?.name || '').localeCompare(b.grocery_types?.name || '')).map(renderCompletedRow)}
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
                        <button onClick={() => setOrderedExpanded(!orderedExpanded)} className="flex items-center gap-2 group w-full text-left">
                            <div className="p-1 rounded bg-base-200 text-ink-500 group-hover:text-accent transition-colors">
                                {orderedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                            <h2 className="section-title mb-0">Ordered ({orderedItems.length})</h2>
                        </button>

                        {orderedExpanded && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                {Object.entries(orderedGrouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, rows]) => (
                                    <div key={category} className="space-y-1">
                                        <h3 className="text-[9px] font-bold uppercase tracking-tight text-ink-300 px-2 opacity-60">{category}</h3>
                                        <div className="bg-base-200/30 rounded-lg border border-base-300 overflow-hidden">
                                            {rows.sort((a, b) => (a.grocery_types?.name || '').localeCompare(b.grocery_types?.name || '')).map(renderCompletedRow)}
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
