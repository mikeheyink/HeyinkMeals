import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTORS = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseFocusTrapOptions {
    isOpen: boolean;
    onClose: () => void;
    containerRef: RefObject<HTMLElement | null>;
}

/**
 * Hook to trap focus within a container (e.g., a modal) and handle Escape key to close.
 * - Tab cycles forward through focusable elements
 * - Shift+Tab cycles backward
 * - Escape calls onClose
 * - Focus is restored to the previously focused element when closed
 */
export function useFocusTrap({ isOpen, onClose, containerRef }: UseFocusTrapOptions) {
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Save the currently focused element to restore later
        previousActiveElement.current = document.activeElement as HTMLElement;

        const container = containerRef.current;
        if (!container) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
                return;
            }

            if (e.key !== 'Tab') return;

            const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            // Shift+Tab on first element -> go to last
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
            // Tab on last element -> go to first
            else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
            // If focus is outside the container, bring it back to first element
            else if (!container.contains(document.activeElement)) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        // Add listener to document to catch all key events
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            // Restore focus when modal closes
            if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
                previousActiveElement.current.focus();
            }
        };
    }, [isOpen, onClose, containerRef]);
}
