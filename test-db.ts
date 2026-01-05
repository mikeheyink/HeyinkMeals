import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
    console.log('Testing connection to:', supabaseUrl);

    const { data, error } = await supabase.from('grocery_categories').select('*');

    if (error) {
        console.error('❌ Connection Failed!');
        console.error('Error details:', error.message);
    } else {
        console.log('✅ Connection Successful!');
        console.log(`Found ${data.length} categories:`);
        console.log(data.map(c => c.name).join(', '));
    }
}

verifyConnection();
