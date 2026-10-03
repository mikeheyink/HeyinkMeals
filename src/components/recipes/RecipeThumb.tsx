import { useState } from 'react';

interface RecipeThumbProps {
    imageUrl?: string | null;
    name: string;
    /** Tailwind size + radius classes, e.g. "w-10 h-10 rounded-lg". */
    className?: string;
}

/**
 * A recipe's photo, or a quiet initial tile when there is none (or the hot-linked image fails).
 * Images come from the recipe's source site, so a broken link must never break the layout.
 */
export function RecipeThumb({ imageUrl, name, className = 'w-10 h-10 rounded-lg' }: RecipeThumbProps) {
    const [failed, setFailed] = useState(false);

    if (!imageUrl || failed) {
        return (
            <div
                className={`flex-shrink-0 bg-base-300 text-ink-400 flex items-center justify-center font-bold select-none ${className}`}
                aria-hidden="true"
            >
                {name.trim().charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={`flex-shrink-0 object-cover bg-base-300 ${className}`}
        />
    );
}
