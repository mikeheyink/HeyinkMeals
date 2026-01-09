
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importGroceryLists() {
    console.log('📦 Importing Grocery Lists...');

    const filePath = path.resolve('import/grocery_lists.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${data.length} entries in ${filePath}`);

    for (const row of data as any[]) {
        const name = row.name;
        if (!name) {
            console.warn('Skipping row with missing name:', row);
            continue;
        }

        const { data: existing, error: findError } = await supabase
            .from('grocery_lists')
            .select('id')
            .eq('name', name)
            .single();

        if (existing) {
            console.log(`  Existing: ${name} (Skipping or updating if needed)`);
            // Optional: update logic. For now, we assume we just want to ensure it exists.
        } else {
            const { error: insertError } = await supabase
                .from('grocery_lists')
                .insert({ name });

            if (insertError) {
                console.error(`  Error inserting "${name}":`, insertError.message);
            } else {
                console.log(`  Inserted: ${name}`);
            }
        }
    }
    console.log('✅ Import complete.');
}

importGroceryLists().catch(console.error);
