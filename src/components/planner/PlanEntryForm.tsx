import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Button } from '../ui/Button';
import type { PlanEntryDraft, EntryType } from '../../services/plannerService';

const UNITS = ['item', 'kg', 'g', 'l', 'ml', 'cup', 'tbsp', 'tsp', 'pkg'];

// Quick-pick options for notes. Add more here — they appear in the dropdown.
const NOTE_PRESETS = ['Leftovers', 'Eat Out', "Mark's Meal"];

// Per-category colour + badge shown in the unified dropdown.
const CATEGORY_META: Record<EntryType, { badge: string; badgeClass: string; rowClass: string }> = {
    Recipe: { badge: 'Recipe', badgeClass: 'text-blue-600', rowClass: 'bg-blue-50 hover:bg-blue-100' },
    Item: { badge: 'Item', badgeClass: 'text-emerald-600', rowClass: 'bg-emerald-50 hover:bg-emerald-100' },
    List: { badge: 'List', badgeClass: 'text-violet-600', rowClass: 'bg-violet-50 hover:bg-violet-100' },
    Note: { badge: 'Note', badgeClass: 'text-amber-600', rowClass: 'bg-amber-50 hover:bg-amber-100' },
};

interface RecipeOption { id: string; name: string; servings?: number | null }
interface NamedOption { id: string; name: string }

/** A single row in the unified picker. `value` encodes its category + id. */
interface UnifiedOption { value: string; label: string; kind: EntryType }

interface PlanEntryFormProps {
    recipes: RecipeOption[];
    items: NamedOption[];
    lists: NamedOption[];
    onSubmit: (draft: PlanEntryDraft) => void | Promise<void>;
    onCreateRecipe?: () => void;
    /** Create a bare grocery item (name only); resolves to the new item's id. */
    onCreateItem?: (name: string) => Promise<string | undefined>;
    submitting?: boolean;
}

/**
 * The shared "plan a slot" form. A single dropdown lists every plannable thing —
 * recipes, items, lists and note presets — each colour-coded with a category
 * badge. Picking one reveals the fields that category needs (servings, qty/unit).
 * The footer's "Add New" creates a brand-new recipe, item, or freeform note.
 */
export function PlanEntryForm({ recipes, items, lists, onSubmit, onCreateRecipe, onCreateItem, submitting }: PlanEntryFormProps) {
    const [selected, setSelected] = useState('');
    const [servings, setServings] = useState(4);
    const [qty, setQty] = useState(1);
    const [unit, setUnit] = useState('item');

    // Inline "Add New" flows (mutually exclusive with a dropdown selection).
    const [addMode, setAddMode] = useState<'none' | 'item' | 'note'>('none');
    const [newItemName, setNewItemName] = useState('');
    const [creatingItem, setCreatingItem] = useState(false);
    const [customNote, setCustomNote] = useState('');

    const options: UnifiedOption[] = [
        ...recipes.map(r => ({ value: `Recipe:${r.id}`, label: r.name, kind: 'Recipe' as const })),
        ...items.map(i => ({ value: `Item:${i.id}`, label: i.name, kind: 'Item' as const })),
        ...lists.map(l => ({ value: `List:${l.id}`, label: l.name, kind: 'List' as const })),
        ...NOTE_PRESETS.map(p => ({ value: `Note:${p}`, label: p, kind: 'Note' as const })),
    ];

    const sep = selected.indexOf(':');
    const selectedKind = (sep >= 0 ? selected.slice(0, sep) : null) as EntryType | null;
    const selectedId = sep >= 0 ? selected.slice(sep + 1) : '';

    const handleChange = (val: string) => {
        setAddMode('none');
        setSelected(val);
        const kind = val.slice(0, val.indexOf(':'));
        if (kind === 'Recipe') {
            const r = recipes.find(x => `Recipe:${x.id}` === val);
            if (r?.servings) setServings(r.servings);
        }
    };

    const startAddItem = () => { setSelected(''); setAddMode('item'); setNewItemName(''); };
    const startAddNote = () => { setSelected(''); setAddMode('note'); setCustomNote(''); };

    const handleCreateItem = async () => {
        const name = newItemName.trim();
        if (!name || !onCreateItem) return;
        setCreatingItem(true);
        try {
            const id = await onCreateItem(name);
            if (id) {
                setAddMode('none');
                setQty(1);
                setUnit('item');
                setSelected(`Item:${id}`);
            }
        } finally {
            setCreatingItem(false);
        }
    };

    const addNewMenu = [
        ...(onCreateRecipe ? [{ label: 'Recipe', onSelect: onCreateRecipe }] : []),
        ...(onCreateItem ? [{ label: 'Item', onSelect: startAddItem }] : []),
        { label: 'Note', onSelect: startAddNote },
    ];

    const canSubmit =
        addMode === 'note' ? !!customNote.trim() : !!selected;

    const submit = () => {
        if (!canSubmit) return;
        if (addMode === 'note') { onSubmit({ entryType: 'Note', noteText: customNote.trim() }); return; }
        switch (selectedKind) {
            case 'Recipe': onSubmit({ entryType: 'Recipe', recipeId: selectedId, servings }); break;
            case 'Item': onSubmit({ entryType: 'Item', groceryTypeId: selectedId, quantity: qty, unit }); break;
            case 'List': onSubmit({ entryType: 'List', listId: selectedId }); break;
            case 'Note': onSubmit({ entryType: 'Note', noteText: selectedId }); break;
        }
    };

    return (
        <div className="space-y-4">
            <SearchableSelect
                options={options}
                value={selected}
                onChange={handleChange}
                getOptionValue={(o) => o.value}
                getOptionLabel={(o) => o.label}
                getOptionMeta={(o) => CATEGORY_META[o.kind]}
                placeholder="Search recipes, items, lists…"
                searchPlaceholder="Search…"
                addNewMenu={addNewMenu}
                addNewMenuLabel="Add New"
                autoFocus
            />

            {/* Recipe → servings */}
            {addMode === 'none' && selectedKind === 'Recipe' && (
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
            )}

            {/* Item → qty + unit */}
            {addMode === 'none' && selectedKind === 'Item' && (
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
            )}

            {/* Add New → Item (create a bare grocery item, then pick qty/unit) */}
            {addMode === 'item' && (
                <div className="space-y-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">New item</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateItem(); } }}
                            placeholder="e.g. Sourdough loaf"
                            className="zen-input flex-1"
                            autoFocus
                        />
                        <Button onClick={handleCreateItem} disabled={!newItemName.trim() || creatingItem} size="sm">
                            {creatingItem ? 'Adding…' : 'Create'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Add New → Note (freeform text) */}
            {addMode === 'note' && (
                <div className="space-y-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">New note</label>
                    <input
                        type="text"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Type a note (e.g. Birthday dinner)"
                        className="zen-input w-full"
                        autoFocus
                    />
                </div>
            )}

            <Button onClick={submit} disabled={!canSubmit || submitting} icon={Plus} className="w-full">
                Add to Plan
            </Button>
        </div>
    );
}
