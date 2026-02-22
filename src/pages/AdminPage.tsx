import { useState, useRef } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mic, Square, Loader2 } from 'lucide-react';

export const AdminPage = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Explicitly define recognition type for TypeScript
    const recognitionRef = useRef<any>(null);

    const startRecording = () => {
        setError(null);
        setTranscript('');
        setStatus('Initializing microphone...');

        // Use standard or webkit prefixed SpeechRecognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setError('Speech Recognition API is not supported in this browser. Please try Chrome or Safari.');
            setStatus('');
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsRecording(true);
                setStatus('Recording...');
            };

            recognition.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setTranscript(currentTranscript);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setError(`Microphone error: ${event.error}`);
                setIsRecording(false);
                setStatus('');
            };

            recognition.onend = () => {
                setIsRecording(false);
                setStatus(transcript ? 'Recording finished.' : '');
            };

            recognitionRef.current = recognition;
            recognition.start();

        } catch (e: any) {
            console.error('Failed to start recording', e);
            setError(`Failed to access microphone: ${e.message}`);
            setStatus('');
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSaveNote = async () => {
        if (!transcript.trim()) return;

        setStatus('Saving note...');
        try {
            // In a real implementation this would save to user_preferences or a dedicated table.
            // For now, we simulate a successful save.
            await new Promise(resolve => setTimeout(resolve, 800));
            setTranscript('');
            setStatus('Note saved successfully!');
            setTimeout(() => setStatus(''), 3000);
        } catch (e) {
            setError('Failed to save note.');
            setStatus('');
        }
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <PageHeader
                title="Admin Settings"
                subtitle="Developer tools and app configuration"
            />

            <Card className="p-6">
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-ink-900 mb-2">Voice Feedback</h2>
                        <p className="text-sm text-ink-500 mb-4">
                            Record a voice note about bugs, UX friction, or feature requests.
                            These notes will be reviewed by the developer.
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col items-center justify-center p-8 bg-base-50 rounded-2xl border-2 border-dashed border-base-200">
                            {!isRecording ? (
                                <button
                                    onClick={startRecording}
                                    className="w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 focus:outline-none focus:ring-4 focus:ring-accent/20 transition-all active:scale-95 shadow-lg"
                                    title="Start Recording"
                                >
                                    <Mic size={32} />
                                </button>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all active:scale-95 shadow-lg animate-pulse"
                                    title="Stop Recording"
                                >
                                    <Square size={24} fill="currentColor" />
                                </button>
                            )}

                            <p className="mt-4 text-sm font-medium text-ink-600 min-h-[20px]">
                                {status}
                            </p>
                        </div>
                    </div>

                    {transcript && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-4 bg-white rounded-xl border border-base-200 min-h-[100px] text-ink-900 leading-relaxed shadow-sm">
                                {transcript}
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setTranscript('')} disabled={isRecording}>
                                    Clear
                                </Button>
                                <Button variant="primary" onClick={handleSaveNote} disabled={isRecording || status === 'Saving note...'} icon={status === 'Saving note...' ? Loader2 : undefined}>
                                    {status === 'Saving note...' ? 'Saving...' : 'Save Feedback'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
