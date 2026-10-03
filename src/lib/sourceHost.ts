/** "thefirstmess.com" from a full URL; null when the value isn't a usable http(s) link. */
export function sourceHost(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}
