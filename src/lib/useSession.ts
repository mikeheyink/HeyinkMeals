import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Tracks the current Supabase auth session. `loading` is true until the initial
 * session check resolves, so callers can avoid flashing the login screen on refresh.
 */
export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let settled = false;
        const finishLoading = () => {
            if (settled) return;
            settled = true;
            setLoading(false);
        };

        // Safety net: never let a hung or rejected getSession() leave the app
        // stuck on the loading spinner forever — fall through to the login screen.
        const timeout = setTimeout(finishLoading, 5000);

        supabase.auth
            .getSession()
            .then(({ data }) => setSession(data.session))
            .catch((err) => console.error('supabase.auth.getSession failed', err))
            .finally(finishLoading);

        const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            finishLoading();
        });

        return () => {
            clearTimeout(timeout);
            listener.subscription.unsubscribe();
        };
    }, []);

    return { session, loading };
}
