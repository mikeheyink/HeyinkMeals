import type { GroceryListKind, GroceryListSummary } from '../../services/groceryListService';
import { LIST_KINDS } from './listKinds';

interface ListCardProps {
    list: GroceryListSummary;
    onOpen: (list: GroceryListSummary) => void;
    onKindChange: (list: GroceryListSummary, kind: GroceryListKind) => void;
}

/** One list in the Lists library: its name and a preview of what's on it, plus a picker to move it to another group. */
export const ListCard = ({ list, onOpen, onKindChange }: ListCardProps) => (
    <div className="p-4 bg-white border border-base-300 rounded-xl shadow-sm hover:shadow-md hover:border-accent/40 transition-all flex items-start justify-between gap-3">
        <button onClick={() => onOpen(list)} className="min-w-0 flex-1 text-left active:opacity-70">
            <span className="block font-bold text-ink-900 truncate">{list.name}</span>
            <span className="mt-1 text-xs text-ink-500 line-clamp-2">
                <span className="font-semibold text-ink-700">
                    {list.itemCount === 0 ? 'Empty' : `${list.itemCount} ${list.itemCount === 1 ? 'item' : 'items'}`}
                </span>
                {list.itemNames.length > 0 && ` · ${list.itemNames.join(', ')}`}
            </span>
        </button>
        <select
            value={list.kind}
            onChange={(e) => {
                const kind = LIST_KINDS.find(k => k.key === e.target.value);
                if (kind) onKindChange(list, kind.key);
            }}
            aria-label={`Type of ${list.name}`}
            title="Move to another group"
            className="flex-shrink-0 text-xs rounded-lg px-1.5 py-1 bg-transparent text-ink-400 border border-transparent cursor-pointer hover:border-base-300 hover:text-ink-700 transition-colors focus:ring-1 focus:ring-accent focus:outline-none"
        >
            {LIST_KINDS.map(k => <option key={k.key} value={k.key}>{k.short}</option>)}
        </select>
    </div>
);
