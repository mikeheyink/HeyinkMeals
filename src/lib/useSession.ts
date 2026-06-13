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
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    return { session, loading };
}
