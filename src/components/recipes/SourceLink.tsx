import { ExternalLink } from 'lucide-react';
import { sourceHost } from '../../lib/sourceHost';

interface SourceLinkProps {
    url: string | null | undefined;
    className?: string;
}

/** Opens the original recipe page in a new tab. Renders nothing without a valid link. */
export function SourceLink({ url, className = '' }: SourceLinkProps) {
    const host = sourceHost(url);
    if (!url || !host) return null;
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-accent transition-colors min-w-0 ${className}`}
            title="Open the original recipe"
        >
            <ExternalLink size={12} className="flex-shrink-0" />
            <span className="truncate">{host}</span>
        </a>
    );
}
