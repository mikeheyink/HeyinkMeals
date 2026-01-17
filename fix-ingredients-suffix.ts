import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeIngredientsSuffix() {
    console.log('🔍 Finding grocery lists with " Ingredients" suffix...\n');

    // First, find all affected records
    const { data: affected, error: fetchError } = await supabase
        .from('grocery_lists')
        .select('id, name')
        .like('name', '% Ingredients');

    if (fetchError) {
        console.error('Error fetching records:', fetchError.message);
        process.exit(1);
    }

    if (!affected || affected.length === 0) {
        console.log('✅ No records found with " Ingredients" suffix.');
        return;
    }

    console.log(`Found ${affected.length} records to update:\n`);
    affected.forEach(r => console.log(`  - "${r.name}"`));
    console.log('');

    // Update each record to remove the suffix
    let updated = 0;
    for (const record of affected) {
        const newName = record.name.replace(/ Ingredients$/, '');
        const { error: updateError } = await supabase
            .from('grocery_lists')
            .update({ name: newName })
            .eq('id', record.id);

        if (updateError) {
            console.error(`❌ Failed to update "${record.name}":`, updateError.message);
        } else {
            console.log(`✅ "${record.name}" → "${newName}"`);
            updated++;
        }
    }

    console.log(`\n🎉 Updated ${updated} of ${affected.length} records.`);
}

removeIngredientsSuffix().catch(console.error);
