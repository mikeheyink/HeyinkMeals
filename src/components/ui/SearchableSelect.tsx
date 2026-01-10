import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectProps<T> {
    options: T[];
    value: string;
    onChange: (value: string) => void;
    getOptionValue: (option: T) => string;
    getOptionLabel: (option: T) => string;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
    autoFocus?: boolean;
    onAddNew?: () => void;
    addNewLabel?: string;
}

export function SearchableSelect<T>({
    options,
    value,
    onChange,
    getOptionValue,
    getOptionLabel,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    disabled = false,
    className = '',
    autoFocus = false,
    onAddNew,
    addNewLabel = 'Add New'
}: SearchableSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(autoFocus);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get selected option label
    const selectedOption = options.find(opt => getOptionValue(opt) === value);
    const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : '';

    // Sort options alphabetically and filter by search
    const sortedAndFilteredOptions = options
        .slice()
        .sort((a, b) => getOptionLabel(a).localeCompare(getOptionLabel(b), undefined, { sensitivity: 'base' }))
        .filter(opt =>
            getOptionLabel(opt).toLowerCase().includes(search.toLowerCase())
        );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (option: T) => {
        onChange(getOptionValue(option));
        setIsOpen(false);
        setSearch('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearch('');
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`zen-input w-full text-left flex items-center justify-between gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
            >
                <span className={selectedLabel ? 'text-ink-900' : 'text-ink-400'}>
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-base-300 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Search Input */}
                    <div className="p-2 border-b border-base-200">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" size={14} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="zen-input w-full pl-8 pr-8 py-2 text-sm"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-base-200 text-ink-400"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-48 overflow-y-auto">
                        {sortedAndFilteredOptions.length > 0 ? (
                            sortedAndFilteredOptions.map((option) => {
                                const optValue = getOptionValue(option);
                                const optLabel = getOptionLabel(option);
                                const isSelected = optValue === value;

                                return (
                                    <button
                                        key={optValue}
                                        type="button"
                                        onClick={() => handleSelect(option)}
                                        className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${isSelected
                                            ? 'bg-accent/10 text-accent font-medium'
                                            : 'text-ink-900 hover:bg-base-100'
                                            }`}
                                    >
                                        {optLabel}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-ink-400">
                                No results found
                            </div>
                        )}
                    </div>

                    {/* Add New Button */}
                    {onAddNew && (
                        <div className="border-t border-base-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setSearch('');
                                    onAddNew();
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm font-medium text-accent hover:bg-accent/5 transition-colors flex items-center gap-2"
                            >
                                <span className="text-accent">+</span>
                                {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
