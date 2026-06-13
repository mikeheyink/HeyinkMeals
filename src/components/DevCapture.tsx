import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Check, ClipboardCopy, Mic, Square, Trash2, X, Zap } from 'lucide-react';
import { ResponsiveModal } from './ui/ResponsiveModal';
import {
    useAddDevNote,
    useClearDoneDevNotes,
    useDeleteDevNote,
    useDevNotes,
    useSetDevNoteStatus,
} from '../hooks/queries/useDevNotes';
import type { DevNote } from '../services/devNotesService';

type Tab = 'open' | 'done';

/**
 * In-app developer feature-capture. Hit ⌘/Ctrl + I anywhere to jot down a change
 * you want to make, review the backlog, copy it as a markdown brief for AI, and
 * tick items off. Intentionally lightweight and only mounted for logged-in users.
 */
export function DevCapture() {
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState<Tab>('open');
    const [draft, setDraft] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const location = useLocation();

    // Voice dictation (browser-native Web Speech API — plain transcription, no AI/network key).
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);
    const baseTextRef = useRef('');
    const speechSupported =
        typeof window !== 'undefined' &&
        !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    const { data: notes = [] } = useDevNotes();
    const addNote = useAddDevNote();
    const setStatus = useSetDevNoteStatus();
    const deleteNote = useDeleteDevNote();
    const clearDone = useClearDoneDevNotes();

    const openNotes = notes.filter((n) => n.status === 'open');
    const doneNotes = notes.filter((n) => n.status === 'done');
    const visible = tab === 'open' ? openNotes : doneNotes;

    // Global hotkey: ⌘/Ctrl + I toggles the panel.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Let other parts of the app (e.g. the Admin page) open the panel.
    useEffect(() => {
        const open = () => setIsOpen(true);
        window.addEventListener('open-dev-notes', open);
        return () => window.removeEventListener('open-dev-notes', open);
    }, []);

    // Autofocus the textarea once the open animation has settled.
    useEffect(() => {
        if (!isOpen) return;
        const id = setTimeout(() => textareaRef.current?.focus(), 120);
        return () => clearTimeout(id);
    }, [isOpen]);

    // Stop dictation if the panel closes, and on unmount.
    useEffect(() => {
        if (!isOpen) recognitionRef.current?.stop();
    }, [isOpen]);
    useEffect(() => () => recognitionRef.current?.stop(), []);

    const handleSave = useCallback(() => {
        const note = draft.trim();
        if (!note) return;
        addNote.mutate(
            { note, context: location.pathname },
            {
                onSuccess: () => {
                    setDraft('');
                    setTab('open');
                    textareaRef.current?.focus();
                    toast.success('Note captured');
                },
                onError: () => toast.error('Could not save note'),
            }
        );
    }, [draft, location.pathname, addNote]);

    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter saves, Shift+Enter inserts a newline.
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    const startDictation = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Speech recognition not supported in this browser');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        // Append dictation to whatever is already typed.
        baseTextRef.current = draft.trim() ? `${draft.trim()} ` : '';

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setDraft(baseTextRef.current + transcript);
        };
        recognition.onerror = (event: any) => {
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                toast.error(`Mic error: ${event.error}`);
            }
            setIsRecording(false);
        };
        recognition.onend = () => {
            setIsRecording(false);
            textareaRef.current?.focus();
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const toggleDictation = () => {
        if (isRecording) recognitionRef.current?.stop();
        else startDictation();
    };

    const copyForAI = async () => {
        if (openNotes.length === 0) {
            toast.message('No open notes to copy');
            return;
        }
        const lines = openNotes.map((n) => {
            const where = n.context ? ` _(on ${n.context})_` : '';
            return `- [ ] ${n.note}${where}`;
        });
        const md = `# HeyinkMeals — dev notes (${openNotes.length} open)\n\n${lines.join('\n')}\n`;
        try {
            await navigator.clipboard.writeText(md);
            toast.success(`Copied ${openNotes.length} note${openNotes.length === 1 ? '' : 's'} for AI`);
        } catch {
            toast.error('Clipboard blocked — copy manually');
        }
    };

    return (
        <>
            {/* Subtle floating trigger — bottom-left so it clears toasts (bottom-right)
                and sits above the mobile nav. */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                title="Dev notes (⌘/Ctrl + I)"
                aria-label="Open dev notes"
                className="fixed bottom-20 lg:bottom-4 left-4 z-40 flex items-center justify-center h-9 w-9 rounded-full bg-white/80 backdrop-blur border border-base-300 text-ink-300 shadow-sm opacity-40 hover:opacity-100 hover:text-accent transition-all"
            >
                <Zap size={16} />
            </button>

            <ResponsiveModal isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-full sm:w-[480px]">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-base-300">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-accent" />
                        <h2 className="text-sm font-bold text-ink-900">Dev Notes</h2>
                        <span className="text-[11px] text-ink-300 font-medium hidden sm:inline">⌘/Ctrl + I</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-ink-300 hover:text-ink-700 transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Capture */}
                <div className="px-5 py-3 border-b border-base-300">
                    <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleTextareaKeyDown}
                        rows={2}
                        placeholder="What needs changing?"
                        className="zen-input w-full resize-none"
                    />
                    <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2 min-w-0">
                            {speechSupported && (
                                <button
                                    type="button"
                                    onClick={toggleDictation}
                                    aria-label={isRecording ? 'Stop dictation' : 'Dictate note'}
                                    title={isRecording ? 'Stop dictation' : 'Dictate note'}
                                    className={`shrink-0 flex items-center justify-center h-7 w-7 rounded-full transition-colors ${
                                        isRecording
                                            ? 'bg-red-500 text-white animate-pulse'
                                            : 'bg-base-200 text-ink-500 hover:text-accent'
                                    }`}
                                >
                                    {isRecording ? <Square size={12} fill="currentColor" /> : <Mic size={14} />}
                                </button>
                            )}
                            <span className="text-[11px] text-ink-300 font-medium truncate">
                                {isRecording ? 'Listening…' : `${location.pathname} · Enter to save`}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!draft.trim() || addNote.isPending}
                            className="shrink-0 px-3 py-1.5 rounded-md bg-accent text-white text-sm font-semibold disabled:opacity-40 hover:bg-accent/90 transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-5 pt-3">
                    <TabButton active={tab === 'open'} onClick={() => setTab('open')} label={`Open ${openNotes.length}`} />
                    <TabButton active={tab === 'done'} onClick={() => setTab('done')} label={`Done ${doneNotes.length}`} />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-5 py-3 min-h-[80px] max-h-[40vh]">
                    {visible.length === 0 ? (
                        <p className="text-sm text-ink-300 text-center py-6">
                            {tab === 'open' ? 'Nothing captured yet.' : 'No completed notes.'}
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {visible.map((note) => (
                                <NoteRow
                                    key={note.id}
                                    note={note}
                                    onToggle={() =>
                                        setStatus.mutate({
                                            id: note.id,
                                            status: note.status === 'done' ? 'open' : 'done',
                                        })
                                    }
                                    onDelete={() => deleteNote.mutate(note.id)}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-base-300">
                    <button
                        type="button"
                        onClick={copyForAI}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-base-200 text-ink-700 text-sm font-semibold hover:bg-base-300 transition-colors"
                    >
                        <ClipboardCopy size={14} />
                        Copy for AI
                    </button>
                    {doneNotes.length > 0 && (
                        <button
                            type="button"
                            onClick={() => clearDone.mutate()}
                            className="text-[12px] text-ink-300 hover:text-ink-700 font-medium transition-colors"
                        >
                            Clear done ({doneNotes.length})
                        </button>
                    )}
                </div>
            </ResponsiveModal>
        </>
    );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-2.5 py-1 rounded-md text-[12px] font-bold uppercase tracking-wider transition-colors ${
                active ? 'bg-accent/10 text-accent' : 'text-ink-300 hover:text-ink-700'
            }`}
        >
            {label}
        </button>
    );
}

function NoteRow({ note, onToggle, onDelete }: { note: DevNote; onToggle: () => void; onDelete: () => void }) {
    const done = note.status === 'done';
    const when = note.created_at ? formatDistanceToNow(new Date(note.created_at), { addSuffix: true }) : '';

    return (
        <li className="group flex items-start gap-2.5 py-1.5">
            <button
                type="button"
                onClick={onToggle}
                aria-label={done ? 'Mark as open' : 'Mark as done'}
                className={`mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded border transition-colors ${
                    done
                        ? 'bg-success border-success text-white'
                        : 'border-ink-300 text-transparent hover:border-accent'
                }`}
            >
                {done && <Check size={13} />}
            </button>
            <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${done ? 'text-ink-300 line-through' : 'text-ink-900'}`}>
                    {note.note}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-300">
                    {note.context && <span className="font-medium">{note.context}</span>}
                    <span>{when}</span>
                </div>
            </div>
            <button
                type="button"
                onClick={onDelete}
                aria-label="Delete note"
                className="shrink-0 text-ink-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
            >
                <Trash2 size={15} />
            </button>
        </li>
    );
}
