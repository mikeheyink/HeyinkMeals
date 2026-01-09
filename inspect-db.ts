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

    console.log('\n--- Grocery Lists (First 20) ---');
    const { data: lists, error: listError } = await supabase.from('grocery_lists').select('id, name').limit(20);
    if (listError) console.error(listError);
    else console.log(lists);

    console.log('\n--- Recipes (First 5 with Link) ---');
    const { data: recipes, error: recipeError } = await supabase
        .from('recipes')
        .select('name, ingredients_list_id')
        .not('ingredients_list_id', 'is', null)
        .limit(5);

    if (recipeError) console.error(recipeError);
    else console.log(recipes);
}

inspectData();
