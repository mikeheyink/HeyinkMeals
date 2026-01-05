import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('Applying migration to create shopping_list_items table...');

    // Using rpc or direct query is hard with anon key if RLS/Permissions are tight.
    // However, usually for these tasks we assume we can run SQL if we have the service key or it's a dev env.
    // Since I don't have the service key, I'll try to run the SQL via a "quick start" bypass or assume the user will apply it.
    // Wait, I can't run arbitrary SQL via the JS client easily without a stored procedure.

    // I will check if I can use the Supabase CLI if they have it.
    // They have "supabase" in devDependencies.

    console.log('Checking for shopping_list_items table...');
    const { error: checkError } = await supabase.from('shopping_list_items').select('id').limit(1);

    if (checkError && checkError.code === 'PGRST116') {
        console.log('Table not found. Please apply the SQL in schema.sql to your Supabase SQL Editor.');
    } else if (checkError) {
        // Code 42P01 is "relation does not exist"
        if (checkError.message.includes('does not exist')) {
            console.log('Table "shopping_list_items" does not exist.');
            console.log('Action Required: Copy the SQL from schema.sql (lines 74-88) into your Supabase Dashboard SQL Editor.');
        } else {
            console.log('Table check error:', checkError.message);
        }
    } else {
        console.log('Table "shopping_list_items" already exists.');
    }
}

applyMigration();
