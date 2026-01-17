import { useState, useRef, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { pantryService } from '../services/pantryService';
import { Button } from './ui/Button';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface AddGroceryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onItemAdded: (grocery: any) => void;
}

export const AddGroceryModal = ({ isOpen, onClose, onItemAdded }: AddGroceryModalProps) => {
    const [name, setName] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useFocusTrap({ isOpen, onClose, containerRef: modalRef });

    useEffect(() => {
        if (isOpen) {
            setName('');
            setError('');
            loadCategories();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const loadCategories = async () => {
        try {
            const data = await pantryService.getCategories();
            setCategories(data || []);
            if (data && data.length > 0 && !selectedCategory) {
                setSelectedCategory(data[0].id);
            }
        } catch (e) {
            console.error('Failed to load categories:', e);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Item name is required');
            return;
        }
        if (!selectedCategory) {
            setError('Category is required');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const grocery = await pantryService.addGrocery(name.trim(), selectedCategory);
            onItemAdded(grocery);
            onClose();
        } catch (e) {
            console.error('Failed to add grocery:', e);
            setError('Failed to add item. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div ref={modalRef} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                    <h2 className="text-lg font-semibold text-ink-900">Add New Ingredient</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-base-200 text-ink-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                            Ingredient Name *
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Quinoa"
                            className="zen-input w-full"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                            Category *
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="zen-input w-full"
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-base-300 safe-area-bottom flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="flex-1" icon={saving ? Loader2 : Save}>
                        {saving ? 'Adding...' : 'Add Ingredient'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
