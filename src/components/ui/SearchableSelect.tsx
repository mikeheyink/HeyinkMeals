import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
    keepOpenOnSelect?: boolean;
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
    addNewLabel = 'Add New',
    keepOpenOnSelect = false
}: SearchableSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(autoFocus);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number; openUp: boolean; maxHeight: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const triggerButtonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

    // Total navigable items (options + "Add New" if present)
    const totalItems = sortedAndFilteredOptions.length + (onAddNew ? 1 : 0);

    // Close dropdown when clicking outside (account for portal-rendered dropdown)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideTrigger = containerRef.current?.contains(target);
            const insideDropdown = dropdownRef.current?.contains(target);
            if (!insideTrigger && !insideDropdown) {
                setIsOpen(false);
                setSearch('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Compute portal dropdown position based on trigger button's viewport rect.
    // Recomputes on open, scroll, and resize so the dropdown stays anchored.
    useLayoutEffect(() => {
        if (!isOpen) {
            setDropdownRect(null);
            return;
        }

        const compute = () => {
            const btn = triggerButtonRef.current;
            if (!btn) return;
            const rect = btn.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom - 8;
            const spaceAbove = rect.top - 8;
            const preferUp = spaceBelow < 240 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(180, Math.min(420, preferUp ? spaceAbove : spaceBelow));
            setDropdownRect({
                top: preferUp ? rect.top - 4 : rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                openUp: preferUp,
                maxHeight,
            });
        };

        compute();
        window.addEventListener('scroll', compute, true);
        window.addEventListener('resize', compute);
        return () => {
            window.removeEventListener('scroll', compute, true);
            window.removeEventListener('resize', compute);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Reset highlighted index when search changes or dropdown opens
    useEffect(() => {
        setHighlightedIndex(0);
    }, [search, isOpen]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (isOpen && optionRefs.current[highlightedIndex]) {
            optionRefs.current[highlightedIndex]?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }, [highlightedIndex, isOpen]);

    const handleSelect = (option: T) => {
        onChange(getOptionValue(option));
        setSearch('');
        setIsOpen(false);
        if (keepOpenOnSelect) {
            // Focus trigger button so user can press Enter to reopen
            setTimeout(() => triggerButtonRef.current?.focus(), 0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => Math.min(prev + 1, totalItems - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < sortedAndFilteredOptions.length) {
                    handleSelect(sortedAndFilteredOptions[highlightedIndex]);
                } else if (onAddNew && highlightedIndex === sortedAndFilteredOptions.length) {
                    setIsOpen(false);
                    setSearch('');
                    onAddNew();
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearch('');
                break;
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
            {/* Trigger Button */}
            <button
                ref={triggerButtonRef}
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

            {/* Dropdown — portaled to body so it escapes overflow:hidden modal ancestors */}
            {isOpen && dropdownRect && createPortal(
                <div
                    ref={dropdownRef}
                    onKeyDown={handleKeyDown}
                    style={{
                        position: 'fixed',
                        top: dropdownRect.openUp ? undefined : dropdownRect.top,
                        bottom: dropdownRect.openUp ? window.innerHeight - dropdownRect.top : undefined,
                        left: dropdownRect.left,
                        width: dropdownRect.width,
                        maxHeight: dropdownRect.maxHeight,
                        zIndex: 100,
                    }}
                    className="bg-white border border-base-300 rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    {/* Search Input */}
                    <div className="p-2 border-b border-base-200 shrink-0">
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
                    <div className="flex-1 overflow-y-auto">
                        {sortedAndFilteredOptions.length > 0 ? (
                            sortedAndFilteredOptions.map((option, index) => {
                                const optValue = getOptionValue(option);
                                const optLabel = getOptionLabel(option);
                                const isSelected = optValue === value;
                                const isHighlighted = index === highlightedIndex;

                                return (
                                    <button
                                        key={optValue}
                                        ref={el => { optionRefs.current[index] = el; }}
                                        type="button"
                                        onClick={() => handleSelect(option)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${isSelected
                                            ? 'bg-accent/10 text-accent font-medium'
                                            : isHighlighted
                                                ? 'bg-base-200 text-ink-900'
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
                        <div className="border-t border-base-200 shrink-0">
                            <button
                                ref={el => { optionRefs.current[sortedAndFilteredOptions.length] = el; }}
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    setSearch('');
                                    onAddNew();
                                }}
                                onMouseEnter={() => setHighlightedIndex(sortedAndFilteredOptions.length)}
                                className={`w-full px-3 py-2.5 text-left text-sm font-medium text-accent transition-colors flex items-center gap-2 ${highlightedIndex === sortedAndFilteredOptions.length
                                    ? 'bg-accent/10'
                                    : 'hover:bg-accent/5'
                                    }`}
                            >
                                <span className="text-accent">+</span>
                                {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
