import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    console.log('--- Current Categories ---');
    const { data: categories, error: catError } = await supabase.from('grocery_categories').select('*').order('sort_order');
    if (catError) console.error(catError);
    else {
        categories.forEach(c => {
            console.log(`[${c.sort_order}] ${c.name} (${c.id})`);
        });
    }

    console.log('\n--- Current Grocery Types (Count per Category) ---');
    const { data: types, error: typeError } = await supabase.from('grocery_types').select('name, category_id');
    if (typeError) {
        console.error(typeError);
    } else {
        const counts: { [key: string]: number } = {};
        types.forEach(t => {
            counts[t.category_id] = (counts[t.category_id] || 0) + 1;
        });
        console.log(counts);
    }
}

inspectData();
