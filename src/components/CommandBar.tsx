import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { aiService } from '../services/aiService';

interface CommandBarProps {
    /** Callback when a command successfully executes (to trigger data refresh) */
    onCommandExecuted?: () => void;
}

type CommandState = 'idle' | 'input' | 'processing' | 'success' | 'error';

export const CommandBar = ({ onCommandExecuted }: CommandBarProps) => {
    const [state, setState] = useState<CommandState>('idle');
    const [command, setCommand] = useState('');
    const [resultMessage, setResultMessage] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut: Ctrl/Cmd + K to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setState('input');
            }
            if (e.key === 'Escape' && state !== 'idle') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state]);

    // Focus input when opened
    useEffect(() => {
        if (state === 'input' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [state]);

    // Auto-close success/error after delay
    useEffect(() => {
        if (state === 'success' || state === 'error') {
            const timeout = setTimeout(() => {
                handleClose();
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [state]);

    const handleClose = () => {
        setState('idle');
        setCommand('');
        setResultMessage('');
    };

    const handleSubmit = async () => {
        if (!command.trim()) return;

        setState('processing');

        try {
            const result = await aiService.executeCommand(command);

            setResultMessage(result.message);
            setState(result.success ? 'success' : 'error');

            if (result.success && onCommandExecuted) {
                onCommandExecuted();
            }
        } catch (err) {
            setResultMessage('Something went wrong. Please try again.');
            setState('error');
        }
    };

    // Floating Action Button (FAB) - always visible
    if (state === 'idle') {
        return (
            <button
                onClick={() => setState('input')}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-accent to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
                title="Ask anything (Ctrl+K)"
            >
                <Sparkles size={24} className="group-hover:animate-pulse" />
            </button>
        );
    }

    // Modal overlay for input/processing/result
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200">

                {/* Input State */}
                {state === 'input' && (
                    <div className="flex items-center gap-3 p-4">
                        <Sparkles size={20} className="text-accent shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Ask anything... (e.g., 'Plan pasta for Tuesday')"
                            className="flex-1 text-lg outline-none bg-transparent placeholder:text-ink-300"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!command.trim()}
                            className="p-2 bg-accent text-white rounded-lg hover:bg-accent-focus disabled:opacity-40 disabled:hover:bg-accent transition-colors"
                        >
                            <Send size={18} />
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2 text-ink-400 hover:text-ink-600 hover:bg-base-100 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Processing State */}
                {state === 'processing' && (
                    <div className="flex items-center gap-4 p-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent/20 rounded-full blur-lg animate-pulse" />
                            <Loader2 size={24} className="text-accent animate-spin relative z-10" />
                        </div>
                        <div>
                            <p className="font-medium text-ink-800">Thinking...</p>
                            <p className="text-sm text-ink-400">{command}</p>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {state === 'success' && (
                    <div className="flex items-start gap-4 p-6 bg-green-50">
                        <CheckCircle size={24} className="text-green-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-green-800">Done!</p>
                            <p className="text-sm text-green-700 whitespace-pre-wrap">{resultMessage}</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Error State */}
                {state === 'error' && (
                    <div className="flex items-start gap-4 p-6 bg-red-50">
                        <AlertCircle size={24} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-red-800">Couldn't do that</p>
                            <p className="text-sm text-red-700">{resultMessage}</p>
                        </div>
                        <button
                            onClick={() => setState('input')}
                            className="text-sm text-red-600 hover:text-red-800 underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Footer hint */}
                {state === 'input' && (
                    <div className="px-4 py-2 bg-base-50 border-t border-base-200 flex items-center justify-between text-xs text-ink-400">
                        <span>Try: "Plan bolognese for Friday" or "Mark eggs as purchased"</span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-base-200 rounded text-ink-500">Esc</kbd>
                            to close
                        </span>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
