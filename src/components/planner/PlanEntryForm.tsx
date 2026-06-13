import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Button } from '../ui/Button';
import type { PlanEntryDraft } from '../../services/plannerService';

const UNITS = ['item', 'kg', 'g', 'l', 'ml', 'cup', 'tbsp', 'tsp', 'pkg'];
const TABS = ['Recipe', 'Item', 'List', 'Note'] as const;
type Tab = typeof TABS[number];

// Quick-pick options for the Note tab. Add more here — they appear in the dropdown.
const NOTE_PRESETS = ['Leftovers', 'Eat Out', "Mark's Meal"];

interface RecipeOption { id: string; name: string; servings?: number | null }
interface NamedOption { id: string; name: string }

interface PlanEntryFormProps {
    recipes: RecipeOption[];
    items: NamedOption[];
    lists: NamedOption[];
    onSubmit: (draft: PlanEntryDraft) => void | Promise<void>;
    onCreateRecipe?: () => void;
    submitting?: boolean;
}

/**
 * The shared "plan a slot" form: pick a Recipe (with servings), a single Item
 * (with qty + unit), a reusable List, or a freeform Note.
 */
export function PlanEntryForm({ recipes, items, lists, onSubmit, onCreateRecipe, submitting }: PlanEntryFormProps) {
    const [tab, setTab] = useState<Tab>('Recipe');
    const [recipeId, setRecipeId] = useState('');
    const [servings, setServings] = useState(4);
    const [itemId, setItemId] = useState('');
    const [qty, setQty] = useState(1);
    const [unit, setUnit] = useState('item');
    const [listId, setListId] = useState('');
    const [note, setNote] = useState('');
    const [noteOther, setNoteOther] = useState(false);

    const canSubmit =
        (tab === 'Recipe' && !!recipeId) ||
        (tab === 'Item' && !!itemId) ||
        (tab === 'List' && !!listId) ||
        (tab === 'Note' && !!note.trim());

    const handleRecipeChange = (val: string) => {
        setRecipeId(val);
        const r = recipes.find(x => x.id === val);
        if (r?.servings) setServings(r.servings);
    };

    const submit = () => {
        if (!canSubmit) return;
        if (tab === 'Recipe') onSubmit({ entryType: 'Recipe', recipeId, servings });
        else if (tab === 'Item') onSubmit({ entryType: 'Item', groceryTypeId: itemId, quantity: qty, unit });
        else if (tab === 'List') onSubmit({ entryType: 'List', listId });
        else onSubmit({ entryType: 'Note', noteText: note.trim() });
    };

    return (
        <div className="space-y-4">
            {/* Type selector */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-base-200 rounded-lg">
                {TABS.map(t => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t ? 'bg-white text-accent shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'Recipe' && (
                <div className="space-y-3">
                    <SearchableSelect
                        options={recipes}
                        value={recipeId}
                        onChange={handleRecipeChange}
                        getOptionValue={(r) => r.id}
                        getOptionLabel={(r) => r.name}
                        placeholder="Search your recipes..."
                        searchPlaceholder="Search recipes..."
                        onAddNew={onCreateRecipe}
                        addNewLabel="Create new recipe..."
                        autoFocus
                    />
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                            Servings
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={servings}
                            onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                            className="zen-input w-24"
                        />
                    </div>
                </div>
            )}

            {tab === 'Item' && (
                <div className="space-y-3">
                    <SearchableSelect
                        options={items}
                        value={itemId}
                        onChange={setItemId}
                        getOptionValue={(g) => g.id}
                        getOptionLabel={(g) => g.name}
                        placeholder="Search items..."
                        searchPlaceholder="Search items..."
                        autoFocus
                    />
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">Qty</label>
                            <input
                                type="number"
                                min="0"
                                value={qty}
                                onChange={(e) => setQty(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="zen-input w-full"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">Unit</label>
                            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="zen-input w-full">
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'List' && (
                <SearchableSelect
                    options={lists}
                    value={listId}
                    onChange={setListId}
                    getOptionValue={(l) => l.id}
                    getOptionLabel={(l) => l.name}
                    placeholder="Choose a list..."
                    searchPlaceholder="Search lists..."
                    autoFocus
                />
            )}

            {tab === 'Note' && (
                <div className="space-y-3">
                    <select
                        className="zen-input w-full"
                        value={noteOther ? '__other__' : note}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === '__other__') { setNoteOther(true); setNote(''); }
                            else { setNoteOther(false); setNote(v); }
                        }}
                        autoFocus
                    >
                        <option value="" disabled>Choose…</option>
                        {NOTE_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="__other__">Other…</option>
                    </select>
                    {noteOther && (
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Type a note (e.g. Birthday dinner)"
                            className="zen-input w-full"
                        />
                    )}
                </div>
            )}

            <Button onClick={submit} disabled={!canSubmit || submitting} icon={Plus} className="w-full">
                Add to Plan
            </Button>
        </div>
    );
}
