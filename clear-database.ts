import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllData() {
    console.log('🧹 Clearing all data from tables...\n');

    // Order matters due to foreign key constraints
    // Delete in order of dependency (children first, then parents)

    // 1. Shopping list items (depends on meal_plan_entries, recipes, grocery_types)
    console.log('Deleting shopping_list_items...');
    const { error: e1 } = await supabase.from('shopping_list_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e1) console.error('  Error:', e1.message);
    else console.log('  ✅ Done');

    // 2. Meal plan entries
    console.log('Deleting meal_plan_entries...');
    const { error: e2 } = await supabase.from('meal_plan_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e2) console.error('  Error:', e2.message);
    else console.log('  ✅ Done');

    // 3. Grocery list items (depends on grocery_lists, grocery_types)
    console.log('Deleting grocery_list_items...');
    const { error: e3 } = await supabase.from('grocery_list_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e3) console.error('  Error:', e3.message);
    else console.log('  ✅ Done');

    // 4. Recipes (depends on grocery_lists)
    console.log('Deleting recipes...');
    const { error: e4 } = await supabase.from('recipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e4) console.error('  Error:', e4.message);
    else console.log('  ✅ Done');

    // 5. Grocery lists
    console.log('Deleting grocery_lists...');
    const { error: e5 } = await supabase.from('grocery_lists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e5) console.error('  Error:', e5.message);
    else console.log('  ✅ Done');

    // 6. Grocery types (depends on grocery_categories)
    console.log('Deleting grocery_types...');
    const { error: e6 } = await supabase
        .from('grocery_types')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .not('name', 'ilike', '%take-away%')
        .not('name', 'ilike', '%eating out%');
    if (e6) console.error('  Error:', e6.message);
    else console.log('  ✅ Done (preserved Take-away and Eating out)');

    // 7. Stores
    console.log('Deleting stores...');
    const { error: e7 } = await supabase.from('stores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e7) console.error('  Error:', e7.message);
    else console.log('  ✅ Done');

    // NOTE: We keep grocery_categories as those are your configured categories
    console.log('\n⚠️  Keeping grocery_categories (Fridge, Freezer, etc.)');

    console.log('\n🎉 Database cleared! Ready for fresh import.');
}

clearAllData().catch(console.error);
