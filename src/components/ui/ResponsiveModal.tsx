import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ResponsiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string; // Optional class for sizing, e.g. "w-full sm:w-[400px]"
}

export function ResponsiveModal({ isOpen, onClose, children, className = "w-full sm:w-[400px]" }: ResponsiveModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useFocusTrap({ isOpen, onClose, containerRef: modalRef });

    const handleDragEnd = (_event: any, info: any) => {
        const offset = info.offset.y;
        const velocity = info.velocity.y;
        // If dragged down enough or fast enough, close. Otherwise framer
        // springs back automatically because animate target is still { y: 0 }.
        if (offset > 100 || velocity > 500) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        ref={modalRef as any}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%", transition: { duration: 0.2 } }}
                        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={handleDragEnd}
                        className={`relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh] ${className}`}
                    >
                        {/* Drag Handle for Mobile */}
                        <div className="w-full flex justify-center pt-3 pb-2 sm:hidden touch-none" aria-hidden="true">
                            <div className="w-12 h-1.5 bg-base-300 rounded-full" />
                        </div>

                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
