import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecipes() {
    console.log('Fetching recipes...');
    const { data, error } = await supabase.from('recipes').select('id, name');

    if (error) {
        console.error('Error fetching recipes:', error);
    } else {
        console.log(`Successfully fetched ${data.length} recipes.`);
        data.forEach(r => console.log(`- ${r.name} (${r.id})`));
    }
}

checkRecipes();
