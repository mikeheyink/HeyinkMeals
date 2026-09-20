import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectProps<T> {
    options: T[];
    value: string;
    onChange: (value: string) => void;
    getOptionValue: (option: T) => string;
    getOptionLabel: (option: T) => string;
    /** Optional per-option adornments: a small right-aligned badge + a row tint. */
    getOptionMeta?: (option: T) => { badge?: string; badgeClass?: string; rowClass?: string };
    /** When set (with getOptionFilterKey), a row of toggleable category pills sits under the search box. */
    filters?: { key: string; label: string; activeClass?: string }[];
    getOptionFilterKey?: (option: T) => string;
    /**
     * Standalone switches (e.g. "Favourites") shown next to the category pills.
     * Each narrows the list further — ANDed with the pills and with each other.
     */
    toggles?: { key: string; label: string; icon?: React.ElementType; activeClass?: string; match: (option: T) => boolean }[];
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
    autoFocus?: boolean;
    onAddNew?: () => void;
    addNewLabel?: string;
    /** When set, the footer becomes an "Add New" toggle that expands this menu. */
    addNewMenu?: { label: string; onSelect: () => void }[];
    addNewMenuLabel?: string;
    keepOpenOnSelect?: boolean;
}

export function SearchableSelect<T>({
    options,
    value,
    onChange,
    getOptionValue,
    getOptionLabel,
    getOptionMeta,
    filters,
    getOptionFilterKey,
    toggles,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    disabled = false,
    className = '',
    autoFocus = false,
    onAddNew,
    addNewLabel = 'Add New',
    addNewMenu,
    addNewMenuLabel = 'Add New',
    keepOpenOnSelect = false
}: SearchableSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(autoFocus);
    const [search, setSearch] = useState('');
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    // Empty set = no filter applied (show everything).
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
    const [activeToggles, setActiveToggles] = useState<Set<string>>(new Set());
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

    // Options matching the active category pills (before the text search narrows further)
    const categoryMatchedOptions = activeFilters.size > 0 && getOptionFilterKey
        ? options.filter(opt => activeFilters.has(getOptionFilterKey(opt)))
        : options;

    // Active toggles narrow further: every one of them must match.
    const toggleMatchedOptions = activeToggles.size > 0 && toggles
        ? categoryMatchedOptions.filter(opt => toggles.every(t => !activeToggles.has(t.key) || t.match(opt)))
        : categoryMatchedOptions;

    // Sort options alphabetically and filter by search
    const sortedAndFilteredOptions = toggleMatchedOptions
        .slice()
        .sort((a, b) => getOptionLabel(a).localeCompare(getOptionLabel(b), undefined, { sensitivity: 'base' }))
        .filter(opt =>
            getOptionLabel(opt).toLowerCase().includes(search.toLowerCase())
        );

    // Per-filter counts, computed against the text search only so the numbers
    // stay stable as pills are toggled on and off.
    const searchMatchedOptions = options.filter(opt =>
        getOptionLabel(opt).toLowerCase().includes(search.toLowerCase())
    );
    const filterCount = (key: string) =>
        getOptionFilterKey ? searchMatchedOptions.filter(o => getOptionFilterKey(o) === key).length : 0;
    const toggleCount = (match: (option: T) => boolean) => searchMatchedOptions.filter(match).length;

    const flip = (set: Set<string>, key: string) => {
        const next = new Set(set);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    };
    const toggleFilter = (key: string) => setActiveFilters(prev => flip(prev, key));
    const toggleToggle = (key: string) => setActiveToggles(prev => flip(prev, key));
    const hasNarrowing = activeFilters.size > 0 || activeToggles.size > 0;

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

    // Compute portal dropdown position based on the trigger button's viewport rect.
    // The trigger often lives inside an animated ancestor (the modal sheet springs
    // up on open, and can be dragged), so a one-shot measurement would leave the
    // dropdown stranded where the trigger *used* to be. Track the rect on every
    // frame while open and only commit state when it actually moves.
    useLayoutEffect(() => {
        if (!isOpen) {
            setDropdownRect(null);
            return;
        }

        let frame = 0;
        let lastKey = '';

        const compute = () => {
            const btn = triggerButtonRef.current;
            if (!btn) return;
            const rect = btn.getBoundingClientRect();
            const key = `${rect.top}|${rect.bottom}|${rect.left}|${rect.width}|${window.innerHeight}`;
            if (key === lastKey) return;
            lastKey = key;

            const spaceBelow = window.innerHeight - rect.bottom - 8;
            const spaceAbove = rect.top - 8;
            const preferUp = spaceBelow < 260 && spaceAbove > spaceBelow;
            const available = preferUp ? spaceAbove : spaceBelow;
            const maxHeight = Math.max(200, Math.min(420, available));
            setDropdownRect({
                top: preferUp ? rect.top - 4 : rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                openUp: preferUp,
                maxHeight,
            });
        };

        const tick = () => {
            compute();
            frame = requestAnimationFrame(tick);
        };
        tick();

        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    // Focus search input once the portal dropdown has mounted.
    // We depend on dropdownRect because the input lives inside the portal,
    // which only renders after the first pass computes the trigger's rect.
    useEffect(() => {
        if (isOpen && dropdownRect && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, dropdownRect]);

    // Reset highlighted index when search changes or dropdown opens
    useEffect(() => {
        setHighlightedIndex(0);
    }, [search, isOpen, activeFilters, activeToggles]);

    // Collapse the "Add New" submenu and clear category pills whenever the dropdown closes
    useEffect(() => {
        if (!isOpen) {
            setAddMenuOpen(false);
            setActiveFilters(new Set());
            setActiveToggles(new Set());
        }
    }, [isOpen]);

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
        <div ref={containerRef} className={`relative ${className}`}>
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

                    {/* Category filter pills + standalone toggles */}
                    {((filters && filters.length > 0 && getOptionFilterKey) || (toggles && toggles.length > 0)) && (
                        <div className="px-2 pb-2 pt-0.5 border-b border-base-200 shrink-0 flex flex-wrap gap-1.5">
                            {getOptionFilterKey && filters?.map(f => {
                                const isActive = activeFilters.has(f.key);
                                const count = filterCount(f.key);
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => {
                                            toggleFilter(f.key);
                                            // Keep typing possible straight after toggling
                                            searchInputRef.current?.focus();
                                        }}
                                        className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-colors border ${isActive
                                            ? (f.activeClass ?? 'bg-accent text-white border-accent')
                                            : 'bg-white text-ink-500 border-base-300 hover:bg-base-100'
                                            }`}
                                    >
                                        {f.label}
                                        <span className={`ml-1 font-normal ${isActive ? 'opacity-80' : 'text-ink-300'}`}>{count}</span>
                                    </button>
                                );
                            })}
                            {toggles?.map(t => {
                                const isActive = activeToggles.has(t.key);
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => {
                                            toggleToggle(t.key);
                                            searchInputRef.current?.focus();
                                        }}
                                        className={`px-2 py-1 rounded-full text-[11px] font-semibold transition-colors border inline-flex items-center gap-1 ${isActive
                                            ? (t.activeClass ?? 'bg-accent text-white border-accent')
                                            : 'bg-white text-ink-500 border-base-300 hover:bg-base-100'
                                            }`}
                                    >
                                        {Icon && <Icon size={11} className={isActive ? 'fill-current' : ''} />}
                                        {t.label}
                                        <span className={`font-normal ${isActive ? 'opacity-80' : 'text-ink-300'}`}>{toggleCount(t.match)}</span>
                                    </button>
                                );
                            })}
                            {hasNarrowing && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveFilters(new Set());
                                        setActiveToggles(new Set());
                                        searchInputRef.current?.focus();
                                    }}
                                    className="px-2 py-1 rounded-full text-[11px] font-medium text-ink-400 hover:text-ink-900 hover:bg-base-100 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Options List */}
                    <div className="flex-1 overflow-y-auto">
                        {sortedAndFilteredOptions.length > 0 ? (
                            sortedAndFilteredOptions.map((option, index) => {
                                const optValue = getOptionValue(option);
                                const optLabel = getOptionLabel(option);
                                const isSelected = optValue === value;
                                const isHighlighted = index === highlightedIndex;
                                const meta = getOptionMeta?.(option);

                                return (
                                    <button
                                        key={optValue}
                                        ref={el => { optionRefs.current[index] = el; }}
                                        type="button"
                                        onClick={() => handleSelect(option)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        className={`w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-2 ${meta?.rowClass ?? ''} ${isSelected
                                            ? 'text-accent font-semibold'
                                            : 'text-ink-900'
                                            } ${isHighlighted ? 'ring-1 ring-inset ring-accent/30' : ''} ${!meta?.rowClass && !isSelected && isHighlighted ? 'bg-base-200' : ''} ${!meta?.rowClass && !isSelected && !isHighlighted ? 'hover:bg-base-100' : ''}`}
                                    >
                                        <span className="truncate">{optLabel}</span>
                                        {meta?.badge && (
                                            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass ?? 'text-ink-400'}`}>
                                                {meta.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-ink-400">
                                No results found
                            </div>
                        )}
                    </div>

                    {/* Add New menu — expands to a category chooser */}
                    {addNewMenu && addNewMenu.length > 0 && (
                        <div className="border-t border-base-200 shrink-0">
                            {addMenuOpen ? (
                                <div className="py-1">
                                    <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-300">
                                        Add new…
                                    </div>
                                    {addNewMenu.map(entry => (
                                        <button
                                            key={entry.label}
                                            type="button"
                                            onClick={() => {
                                                setIsOpen(false);
                                                setSearch('');
                                                setAddMenuOpen(false);
                                                entry.onSelect();
                                            }}
                                            className="w-full px-3 py-2.5 text-left text-sm font-medium text-ink-900 transition-colors flex items-center gap-2 hover:bg-accent/5"
                                        >
                                            <span className="text-accent">+</span>
                                            {entry.label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setAddMenuOpen(true)}
                                    className="w-full px-3 py-2.5 text-left text-sm font-medium text-accent transition-colors flex items-center gap-2 hover:bg-accent/5"
                                >
                                    <span className="text-accent">+</span>
                                    {addNewMenuLabel}
                                </button>
                            )}
                        </div>
                    )}

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
