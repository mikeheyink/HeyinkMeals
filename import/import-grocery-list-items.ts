
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

async function importGroceryListItems() {
    console.log('📦 Importing Grocery List Items...');

    // 1. Fetch Lookups
    // Cache all grocery lists and types to avoid N+1 queries
    // NOTE: This might be heavy if tables are huge, but fine for 100s-1000s
    console.log('  Loading reference data...');

    const { data: lists, error: lError } = await supabase.from('grocery_lists').select('id, name');
    if (lError) throw lError;
    const listMap = new Map(lists.map(l => [l.name.toLowerCase(), l.id]));

    const { data: types, error: tError } = await supabase.from('grocery_types').select('id, name');
    if (tError) throw tError;
    const typeMap = new Map(types.map(t => [t.name.toLowerCase(), t.id]));

    // 2. Read File
    const filePath = path.resolve('import/grocery_list_items.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    console.log(`Found ${data.length} entries.`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of data) {
        const listName = row['grocery_list'];
        const typeName = row['grocery_type'];
        const quantity = row['quantity'] || 1;
        const unit = row['units'] || 'item';

        if (!listName || !typeName) {
            console.warn('  Skipping invalid row:', row);
            skippedCount++;
            continue;
        }

        const listId = listMap.get(listName.trim().toLowerCase());
        const typeId = typeMap.get(typeName.trim().toLowerCase());

        if (!listId) {
            console.warn(`  Warning: List not found "${listName}"`);
            skippedCount++;
            continue;
        }

        if (!typeId) {
            console.warn(`  Warning: Grocery Type not found "${typeName}"`);
            // Optional: Create it on the fly? User said "find the correct grocery_type_id", implies lookup.
            // If strictly data provided, we skip.
            skippedCount++;
            continue;
        }

        const { error } = await supabase.from('grocery_list_items').insert({
            list_id: listId,
            grocery_type_id: typeId,
            quantity: quantity,
            unit: unit,
            is_purchased: false,
            is_in_stock: false
        });

        if (error) {
            console.error(`  Error inserting ${typeName} -> ${listName}:`, error.message);
            skippedCount++;
        } else {
            // console.log(`  Inserted: ${typeName} -> ${listName}`);
            insertedCount++;
        }
    }

    console.log(`✅ Import complete.`);
    console.log(`  Inserted: ${insertedCount}`);
    console.log(`  Skipped/Failed: ${skippedCount}`);
}

importGroceryListItems().catch(console.error);
