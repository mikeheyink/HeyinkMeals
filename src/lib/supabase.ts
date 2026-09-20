import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase Environment Variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * True when PostgREST rejected a query because a column doesn't exist yet.
 * Lets a read fall back to the pre-migration shape instead of breaking the page
 * on a database that hasn't had the latest `supabase/migrations/` SQL applied.
 */
export const isUndefinedColumn = (error: { code?: string } | null) => error?.code === '42703';
