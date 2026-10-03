import { useEffect, useState } from 'react';

/**
 * A simple kitchen countdown. `start(minutes)` (re)starts it; it stops itself at zero and flags
 * `finished` so the UI can nudge the cook. Vibrates on phones that support it.
 */
export function useCountdown() {
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        if (!running) return;
        const interval = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    setRunning(false);
                    setFinished(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [running]);

    useEffect(() => {
        if (finished) navigator.vibrate?.([300, 150, 300]);
    }, [finished]);

    return {
        secondsLeft,
        running,
        finished,
        start: (minutes: number) => {
            setSecondsLeft(Math.round(minutes * 60));
            setFinished(false);
            setRunning(true);
        },
        pause: () => setRunning(false),
        resume: () => { if (secondsLeft > 0) setRunning(true); },
        reset: () => { setRunning(false); setSecondsLeft(0); setFinished(false); },
    };
}

export const formatClock = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
