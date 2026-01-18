import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Loader2, Send, CheckCircle, AlertCircle, User, Bot } from 'lucide-react';
import { aiService } from '../services/aiService';

interface CommandBarProps {
    /** Callback when a command successfully executes (to trigger data refresh) */
    onCommandExecuted?: () => void;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    isAction?: boolean; // True if this was an action completion
}

type CommandState = 'idle' | 'open' | 'processing';

export const CommandBar = ({ onCommandExecuted }: CommandBarProps) => {
    const [state, setState] = useState<CommandState>('idle');
    const [command, setCommand] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [lastActionSuccess, setLastActionSuccess] = useState<boolean | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Keyboard shortcut: Ctrl/Cmd + K to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (state === 'idle') {
                    setState('open');
                    setMessages([]);
                    setLastActionSuccess(null);
                }
            }
            if (e.key === 'Escape' && state !== 'idle') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state]);

    // Focus input when opened or after processing
    useEffect(() => {
        if ((state === 'open') && inputRef.current) {
            inputRef.current.focus();
        }
    }, [state, messages]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleClose = () => {
        setState('idle');
        setCommand('');
        setMessages([]);
        setLastActionSuccess(null);
    };

    const handleSubmit = async () => {
        if (!command.trim() || state === 'processing') return;

        const userMessage = command.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setCommand('');
        setState('processing');

        try {
            const result = await aiService.executeCommand(userMessage);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: result.message,
                isAction: result.actionTaken
            }]);

            if (result.actionTaken) {
                setLastActionSuccess(result.success);
                // Trigger page refresh for successful actions
                if (result.success && onCommandExecuted) {
                    onCommandExecuted();
                }
                // Also do a hard refresh of current page data
                if (result.success) {
                    window.dispatchEvent(new CustomEvent('commandbar:action-completed'));
                }
            }

            setState('open');
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Something went wrong. Please try again.',
                isAction: false
            }]);
            setState('open');
        }
    };

    const handleOpen = () => {
        setState('open');
        setMessages([]);
        setLastActionSuccess(null);
    };

    // Floating Action Button (FAB) - always visible
    if (state === 'idle') {
        return (
            <button
                onClick={handleOpen}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-accent to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
                title="Ask anything (Ctrl+K)"
            >
                <Sparkles size={24} className="group-hover:animate-pulse" />
            </button>
        );
    }

    // Chat modal
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200 flex flex-col max-h-[70vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-base-200 bg-base-50">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-accent" />
                        <span className="font-semibold text-ink-800">Ask Me Anything</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 text-ink-400 hover:text-ink-600 hover:bg-base-200 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[100px]">
                    {messages.length === 0 && state !== 'processing' && (
                        <div className="text-center text-ink-400 py-8">
                            <p className="text-sm">Try commands like:</p>
                            <p className="text-xs mt-2 text-ink-300">"Plan pasta for Tuesday" • "Add milk to shopping list"</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.isAction
                                    ? (lastActionSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')
                                    : 'bg-accent/10 text-accent'
                                    }`}>
                                    {msg.isAction ? (
                                        lastActionSuccess ? <CheckCircle size={14} /> : <AlertCircle size={14} />
                                    ) : (
                                        <Bot size={14} />
                                    )}
                                </div>
                            )}

                            <div
                                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-accent text-white rounded-br-md'
                                    : msg.isAction
                                        ? (lastActionSuccess ? 'bg-green-50 text-green-800 rounded-bl-md' : 'bg-red-50 text-red-800 rounded-bl-md')
                                        : 'bg-base-100 text-ink-700 rounded-bl-md'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-ink-200 flex items-center justify-center shrink-0">
                                    <User size={14} className="text-ink-500" />
                                </div>
                            )}
                        </div>
                    ))}

                    {state === 'processing' && (
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                <Loader2 size={14} className="text-accent animate-spin" />
                            </div>
                            <div className="bg-base-100 px-4 py-2 rounded-2xl rounded-bl-md">
                                <p className="text-sm text-ink-400">Thinking...</p>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-base-200 bg-base-50">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={messages.length > 0 ? "Continue the conversation..." : "What would you like to do?"}
                            className="flex-1 px-4 py-2 bg-white border border-base-300 rounded-xl text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            disabled={state === 'processing'}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!command.trim() || state === 'processing'}
                            className="p-2 bg-accent text-white rounded-xl hover:bg-accent-focus disabled:opacity-40 disabled:hover:bg-accent transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-ink-400 px-1">
                        <span>Press Enter to send</span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-base-200 rounded text-ink-500">Esc</kbd>
                            to close
                        </span>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
