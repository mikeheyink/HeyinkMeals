import { useRef, useState } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
    children: React.ReactNode;
    onDelete: () => void;
    deleteThreshold?: number; // How far to swipe before triggering delete (negative number)
}

export function SwipeToDelete({
    children,
    onDelete,
    deleteThreshold = -75,
}: SwipeToDeleteProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const controls = useAnimation();
    const x = useMotionValue(0);

    const handleDragEnd = async (_event: any, info: any) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset < deleteThreshold || velocity < -500) {
            // Trigger delete animation
            setIsDeleting(true);
            await controls.start({
                x: -window.innerWidth,
                transition: { duration: 0.2 },
            });
            // Let the animation finish before callback
            onDelete();
        } else {
            // Snap back
            controls.start({
                x: 0,
                transition: { type: 'spring', stiffness: 300, damping: 30 },
            });
        }
    };

    return (
        <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl">
            {/* Background "Delete" Layer */}
            <div className="absolute inset-0 flex items-center justify-end bg-red-500 rounded-xl px-4 z-0">
                <Trash2 className="text-white" size={20} />
            </div>

            {/* Foreground Swipeable Content */}
            <motion.div
                className="relative z-10 w-full h-full bg-base-50 rounded-xl"
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }} // We manage the unconstrained drag elasticity manually, but constraint is 0 to let it bounce back if not deleted
                dragElastic={{ left: 1, right: 0 }} // Allow pulling left freely, resist right pull
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                whileTap={{ cursor: 'grabbing' }}
            >
                {/* Pointer events none to children when dragging to avoid accidental clicks */}
                <div style={isDeleting ? { pointerEvents: 'none' } : {}}>
                    {children}
                </div>
            </motion.div>
        </div>
    );
}
