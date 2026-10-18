import type { GroceryListKind, GroceryListSummary } from '../../services/groceryListService';
import { List, Package } from 'lucide-react';
import { LIST_KINDS } from './listKinds';

interface ListCardProps {
    list: GroceryListSummary;
    onOpen: (list: GroceryListSummary) => void;
    onKindChange: (list: GroceryListSummary, kind: GroceryListKind) => void;
}

/** One list in the Lists library: tap to open, with a picker to move it to another group. */
export const ListCard = ({ list, onOpen, onKindChange }: ListCardProps) => (
    <div className="p-4 bg-white border border-base-300 rounded-xl shadow-sm hover:shadow-md hover:border-accent/40 transition-all flex items-center justify-between gap-3">
        <button
            onClick={() => onOpen(list)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left active:opacity-70"
        >
            <div className="p-1.5 bg-base-200 rounded text-ink-500">
                <List size={16} />
            </div>
            <span className="font-bold text-ink-900 truncate">{list.name}</span>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-ink-500">
                <Package size={14} />
                <span className="text-xs font-medium">{list.itemCount}</span>
            </div>
            <select
                value={list.kind}
                onChange={(e) => {
                    const kind = LIST_KINDS.find(k => k.key === e.target.value);
                    if (kind) onKindChange(list, kind.key);
                }}
                aria-label={`Type of ${list.name}`}
                className="text-xs border border-base-300 rounded-lg px-1.5 py-1 bg-white text-ink-700 cursor-pointer hover:border-accent transition-colors focus:ring-1 focus:ring-accent focus:outline-none"
            >
                {LIST_KINDS.map(k => <option key={k.key} value={k.key}>{k.short}</option>)}
            </select>
        </div>
    </div>
);
