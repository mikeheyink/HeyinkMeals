import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importRecipes() {
    console.log('🚀 Starting Recipe Import from Excel...\n');

    const filePath = path.resolve('import/recipes.xlsx');
    console.log(`Reading file from: ${filePath}`);

    // 1. Read Excel File
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const recipesData: any[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${recipesData.length} recipes in Excel.\n`);

    // 2. Fetch all existing grocery lists to create a map
    // We need to match Recipe Name -> Grocery List ID
    const { data: lists, error: listError } = await supabase
        .from('grocery_lists')
        .select('id, name');

    if (listError) {
        console.error('❌ Error fetching grocery lists:', listError.message);
        return;
    }

    const listMap = new Map<string, string>();
    lists?.forEach(l => listMap.set(l.name.toLowerCase().trim(), l.id));
    console.log(`Loaded ${listMap.size} grocery lists for linking.\n`);

    // 3. Process each recipe
    let successCount = 0;
    let skipCount = 0;

    for (const recipe of recipesData) {
        const recipeName = recipe.name?.trim();
        if (!recipeName) continue;

        console.log(`Processing: ${recipeName}`);

        // Try to find matching grocery list
        // Strategy: Exact match or "Name Ingredients" or check if list name contains recipe name?
        // User confirmed: "The excel file contains the name of the grocery_list"
        // Based on previous check, they seem to match exactly.

        let listId = listMap.get(recipeName.toLowerCase());

        // Optional: Check for "XY Ingredients" if exact match fails
        if (!listId) {
            listId = listMap.get(`${recipeName.toLowerCase()} ingredients`);
        }

        if (!listId) {
            console.warn(`  ⚠️  WARNING: Could not find Grocery List for "${recipeName}". Recipe will be imported WITHOUT ingredients link.`);
        } else {
            console.log(`  🔗 Linked to Grocery List ID: ${listId}`);
        }

        // Prepare object
        const insertPayload = {
            name: recipeName,
            instructions: recipe.instructions || '',
            servings: parseInt(recipe.servings) || 4,
            prep_time_minutes: parseInt(recipe.prep_time_minutes) || 0,
            cook_time_minutes: parseInt(recipe.cook_time_minutes) || 0,
            total_time_mins: parseInt(recipe.total_time_mins) || 0,
            web_source: recipe.web_source,
            ingredients_list_id: listId || null
        };

        // Check if recipe exists
        const { data: existing } = await supabase
            .from('recipes')
            .select('id')
            .eq('name', recipeName)
            .single();

        let error;
        if (existing) {
            // Update
            const { error: updateError } = await supabase
                .from('recipes')
                .update(insertPayload)
                .eq('id', existing.id);
            error = updateError;
            console.log(`  🔄 Updated existing recipe.`);
        } else {
            // Insert
            const { error: insertError } = await supabase
                .from('recipes')
                .insert(insertPayload);
            error = insertError;
            console.log(`  ✨ Inserted new recipe.`);
        }

        if (error) {
            console.error(`  ❌ Error inserting/updating recipe:`, error.message);
            skipCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\n🎉 Import complete!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Skipped/Failed: ${skipCount}`);
}

importRecipes().catch(console.error);
