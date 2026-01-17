import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
    console.log('🌱 Seeding test data...\n');

    // Get category IDs
    const { data: categories } = await supabase.from('grocery_categories').select('id, name');
    const catMap = new Map<string, string>();
    categories?.forEach(c => catMap.set(c.name, c.id));

    console.log('Categories:', Array.from(catMap.keys()).join(', '));

    // Define test recipes with ingredients
    const testRecipes = [
        {
            name: 'Classic Spaghetti Bolognese',
            instructions: '1. Brown the mince in a pan.\n2. Add onion and garlic, cook until soft.\n3. Add tomatoes and simmer for 20 mins.\n4. Cook pasta and serve.',
            servings: 4,
            cook_time_minutes: 35,
            ingredients: [
                { name: 'Spaghetti', quantity: 400, unit: 'g', category: 'Pantry' },
                { name: 'Beef Mince', quantity: 500, unit: 'g', category: 'Fridge' },
                { name: 'Tinned Tomatoes', quantity: 400, unit: 'g', category: 'Pantry' },
                { name: 'Onion', quantity: 1, unit: '#', category: 'Fresh Produce' }
            ]
        },
        {
            name: 'Avocado Toast with Eggs',
            instructions: '1. Toast the bread.\n2. Mash avocado with salt and lime.\n3. Fry eggs sunny side up.\n4. Spread avo on toast, top with eggs.',
            servings: 2,
            cook_time_minutes: 10,
            ingredients: [
                { name: 'Sourdough Bread', quantity: 2, unit: 'slices', category: 'Bread & Bakery' },
                { name: 'Avocado', quantity: 1, unit: '#', category: 'Fresh Produce' },
                { name: 'Eggs', quantity: 2, unit: '#', category: 'Fridge' },
                { name: 'Lime', quantity: 0.5, unit: '#', category: 'Fresh Produce' }
            ]
        },
        {
            name: 'Thai Green Curry',
            instructions: '1. Fry curry paste in coconut oil.\n2. Add coconut milk and bring to simmer.\n3. Add chicken and vegetables.\n4. Serve with rice.',
            servings: 4,
            cook_time_minutes: 25,
            ingredients: [
                { name: 'Green Curry Paste', quantity: 50, unit: 'g', category: 'Pantry' },
                { name: 'Coconut Milk', quantity: 400, unit: 'ml', category: 'Pantry' },
                { name: 'Chicken Breast', quantity: 500, unit: 'g', category: 'Fridge' },
                { name: 'Jasmine Rice', quantity: 300, unit: 'g', category: 'Pantry' }
            ]
        }
    ];

    // Create grocery types first
    const groceryTypeMap = new Map<string, string>();

    for (const recipe of testRecipes) {
        for (const ing of recipe.ingredients) {
            if (!groceryTypeMap.has(ing.name)) {
                const categoryId = catMap.get(ing.category) || catMap.get('Other');
                const { data, error } = await supabase
                    .from('grocery_types')
                    .insert({ name: ing.name, category_id: categoryId })
                    .select('id')
                    .single();

                if (error) {
                    console.warn(`Could not create grocery type "${ing.name}":`, error.message);
                } else {
                    groceryTypeMap.set(ing.name, data.id);
                    console.log(`✅ Created ingredient: ${ing.name}`);
                }
            }
        }
    }

    // Create recipes with their ingredient lists
    for (const recipe of testRecipes) {
        // Create grocery list for this recipe
        const { data: list, error: listError } = await supabase
            .from('grocery_lists')
            .insert({ name: recipe.name })
            .select('id')
            .single();

        if (listError) {
            console.error(`Could not create list for "${recipe.name}":`, listError.message);
            continue;
        }

        // Create the recipe
        const { data: recipeData, error: recipeError } = await supabase
            .from('recipes')
            .insert({
                name: recipe.name,
                instructions: recipe.instructions,
                servings: recipe.servings,
                prep_time_minutes: 0,
                cook_time_minutes: recipe.cook_time_minutes,
                ingredients_list_id: list.id
            })
            .select('id')
            .single();

        if (recipeError) {
            console.error(`Could not create recipe "${recipe.name}":`, recipeError.message);
            continue;
        }

        console.log(`\n📖 Created recipe: ${recipe.name}`);

        // Link ingredients to the list
        for (const ing of recipe.ingredients) {
            const typeId = groceryTypeMap.get(ing.name);
            if (!typeId) continue;

            const { error: itemError } = await supabase
                .from('grocery_list_items')
                .insert({
                    list_id: list.id,
                    grocery_type_id: typeId,
                    quantity: ing.quantity,
                    unit: ing.unit
                });

            if (itemError) {
                console.warn(`  Could not add ${ing.name}:`, itemError.message);
            } else {
                console.log(`  ✅ Added ${ing.quantity} ${ing.unit} ${ing.name}`);
            }
        }
    }

    console.log('\n🎉 Seeding complete!');
}

seedData().catch(console.error);
