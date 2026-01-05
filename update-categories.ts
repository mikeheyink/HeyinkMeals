import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const newCategories = [
    { name: 'Baby / Kids', sort_order: 1 },
    { name: 'Bread & Bakery', sort_order: 2 },
    { name: 'Cleaning & Home', sort_order: 3 },
    { name: 'Drinks', sort_order: 4 },
    { name: 'Freezer', sort_order: 5 },
    { name: 'Fresh Produce', sort_order: 6 },
    { name: 'Fridge', sort_order: 7 },
    { name: 'Herbs & Spices', sort_order: 8 },
    { name: 'Other', sort_order: 9 },
    { name: 'Pantry', sort_order: 10 },
    { name: 'Toiletries', sort_order: 11 }
];

async function updateCategories() {
    console.log('Fetching current categories...');
    const { data: currentCats, error: fetchError } = await supabase.from('grocery_categories').select('*');
    if (fetchError) {
        console.error('Error fetching categories:', fetchError);
        return;
    }

    // Map 'Produce' to 'Fresh Produce' if it exists
    const produceCat = currentCats.find(c => c.name === 'Produce');
    if (produceCat) {
        console.log(`Renaming 'Produce' (ID: ${produceCat.id}) to 'Fresh Produce'`);
        const { error: updateError } = await supabase
            .from('grocery_categories')
            .update({ name: 'Fresh Produce', sort_order: 3 })
            .eq('id', produceCat.id);
        if (updateError) console.error('Error updating Produce:', updateError);
    }

    // Insert or update others
    for (const cat of newCategories) {
        // Skip Fresh Produce if we already updated it
        if (cat.name === 'Fresh Produce' && produceCat) continue;

        const existing = currentCats.find(c => c.name === cat.name);
        if (existing) {
            console.log(`Updating existing category: ${cat.name}`);
            await supabase.from('grocery_categories').update({ sort_order: cat.sort_order }).eq('id', existing.id);
        } else {
            console.log(`Inserting new category: ${cat.name}`);
            await supabase.from('grocery_categories').insert(cat);
        }
    }

    // Delete categories not in the new list
    const newNames = newCategories.map(c => c.name);
    const toDelete = currentCats.filter(c => !newNames.includes(c.name) && c.name !== 'Produce');

    for (const cat of toDelete) {
        console.log(`Deleting unused category: ${cat.name}`);
        // Note: This might fail if items are linked. 
        // In a real scenario we should reassign items to 'Other'.
        const { error: deleteError } = await supabase.from('grocery_categories').delete().eq('id', cat.id);
        if (deleteError) {
            console.warn(`Could not delete ${cat.name}, likely due to existing dependencies. Reassigning to 'Other'...`);
            // Find 'Other' ID
            const { data: otherCat } = await supabase.from('grocery_categories').select('id').eq('name', 'Other').single();
            if (otherCat) {
                await supabase.from('grocery_types').update({ category_id: otherCat.id }).eq('category_id', cat.id);
                await supabase.from('grocery_categories').delete().eq('id', cat.id);
            }
        }
    }

    console.log('Category update complete.');
}

updateCategories();
