import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { formatClock } from '../../hooks/useCountdown';
import type { useCountdown } from '../../hooks/useCountdown';

interface CookTimerProps {
    timer: ReturnType<typeof useCountdown>;
}

/** Floating bar that appears while a timer is running (or has just finished). */
export function CookTimer({ timer }: CookTimerProps) {
    if (!timer.running && timer.secondsLeft === 0 && !timer.finished) return null;

    return (
        <div
            role="timer"
            aria-live="polite"
            className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 pl-4 pr-2 py-2 rounded-full shadow-xl text-white ${timer.finished ? 'bg-success animate-pulse' : 'bg-ink-900'}`}
        >
            <Timer size={18} className="opacity-60" />
            <span className="text-2xl font-mono font-bold tabular-nums min-w-[4.5rem]">
                {timer.finished ? "Time's up" : formatClock(timer.secondsLeft)}
            </span>
            {!timer.finished && (
                <button
                    type="button"
                    onClick={timer.running ? timer.pause : timer.resume}
                    className="p-2 rounded-full hover:bg-white/10"
                    aria-label={timer.running ? 'Pause timer' : 'Resume timer'}
                >
                    {timer.running ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
            )}
            <button
                type="button"
                onClick={timer.reset}
                className="p-2 rounded-full hover:bg-white/10 opacity-70"
                aria-label="Clear timer"
            >
                <RotateCcw size={18} />
            </button>
        </div>
    );
}
