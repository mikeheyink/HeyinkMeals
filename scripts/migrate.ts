import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Sending SQL to Supabase to add category column...');
    const { error } = await supabase.rpc('execute_sql', {
        sql_query: 'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category text;'
    });

    // Fallback if execute_sql doesn't exist
    if (error) {
        console.error('RPC execute_sql failed, the user might need to run this manually in the Supabase Dashboard SQL Editor:', error);
        console.log('\n--- SQL SNIPPET TO RUN ---');
        console.log('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category text;');
        console.log('--------------------------\n');
    } else {
        console.log('Success!');
    }
}

migrate();
