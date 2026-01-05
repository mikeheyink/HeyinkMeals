import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
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
    console.log('🚀 Starting Recipe Import...\n');

    // 1. Get all categories
    const { data: categories } = await supabase.from('grocery_categories').select('id, name');
    const catMap = new Map<string, string>();
    categories?.forEach((c: any) => catMap.set(c.name, c.id));

    // 2. Read Recipes CSV
    const recipesCsv = fs.readFileSync(path.join(__dirname, 'import', 'Recipes_updated.csv'), 'utf8');
    const recipesRows = recipesCsv.split('\n').filter(r => r.trim());
    const recipesData = recipesRows.slice(1).map(row => {
        const [name, servings, totalTime, webSource, instructions] = row.split(';');
        return {
            name: name?.trim(),
            servings: parseInt(servings) || 4,
            total_time_mins: parseInt(totalTime) || 0,
            web_source: webSource?.trim(),
            instructions: instructions?.trim() || ''
        };
    }).filter(r => r.name);

    // 3. Read Items CSV
    const itemsCsv = fs.readFileSync(path.join(__dirname, 'import', 'groceryListItems.csv'), 'utf8');
    const itemsRows = itemsCsv.split('\n').filter(r => r.trim());
    const itemsMap = new Map<string, any[]>();

    itemsRows.slice(1).forEach(row => {
        const [category, recipeName, itemName, qty, unit] = row.split(';');
        if (!recipeName) return;

        const key = recipeName.trim();
        if (!itemsMap.has(key)) itemsMap.set(key, []);
        itemsMap.get(key)?.push({
            category: category?.trim(),
            name: itemName?.trim(),
            quantity: parseFloat(qty) || 1,
            unit: unit?.trim() || '#'
        });
    });

    console.log(`Found ${recipesData.length} recipes in CSV.\n`);

    // 4. Process each recipe
    for (const recipe of recipesData) {
        console.log(`Processing: ${recipe.name}`);

        // a. Create Grocery List for recipe
        const { data: list, error: listError } = await supabase
            .from('grocery_lists')
            .insert({ name: `${recipe.name} Ingredients` })
            .select('id')
            .single();

        if (listError) {
            console.error(`  ❌ Error creating list for ${recipe.name}:`, listError.message);
            continue;
        }

        // b. Create Recipe
        const { data: recipeEntry, error: recipeError } = await supabase
            .from('recipes')
            .insert({
                name: recipe.name,
                instructions: recipe.instructions,
                servings: recipe.servings,
                total_time_mins: recipe.total_time_mins,
                web_source: recipe.web_source,
                ingredients_list_id: list.id,
                prep_time_minutes: 0,
                cook_time_minutes: recipe.total_time_mins // Fallback
            })
            .select('id')
            .single();

        if (recipeError) {
            console.error(`  ❌ Error creating recipe ${recipe.name}:`, recipeError.message);
            continue;
        }

        // c. Add Ingredients
        const recipeItems = itemsMap.get(recipe.name) || [];
        for (const item of recipeItems) {
            // Ensure grocery type exists
            let { data: gType } = await supabase
                .from('grocery_types')
                .select('id')
                .eq('name', item.name)
                .single();

            if (!gType) {
                const categoryId = catMap.get(item.category) || catMap.get('Other');
                const { data: newType } = await supabase
                    .from('grocery_types')
                    .insert({ name: item.name, category_id: categoryId })
                    .select('id')
                    .single();
                gType = newType;
            }

            if (gType) {
                await supabase.from('grocery_list_items').insert({
                    list_id: list.id,
                    grocery_type_id: gType.id,
                    quantity: item.quantity,
                    unit: item.unit
                });
            }
        }
        console.log(`  ✅ Imported with ${recipeItems.length} ingredients.`);
    }

    console.log('\n🎉 Import complete!');
}

importRecipes().catch(console.error);
