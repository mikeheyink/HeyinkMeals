import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedExampleRecipes() {
    console.log('🌱 Seeding example recipes...\n');

    // Get category IDs
    const { data: categories } = await supabase.from('grocery_categories').select('id, name');
    const catMap = new Map<string, string>();
    categories?.forEach(c => catMap.set(c.name.toLowerCase(), c.id));

    const getCatId = (name: string) => catMap.get(name.toLowerCase()) || catMap.get('other')!;

    const exampleRecipes = [
        {
            name: 'Mini Turkey & Veggie Meatballs',
            instructions: '1. Shred carrots and zucchini, squeeze out excess moisture.\n2. Mix turkey mince, veggies, egg, and breadcrumbs.\n3. Roll into bite-sized balls.\n4. Bake at 180°C for 15-20 mins until cooked through.',
            servings: 4,
            cook_time_minutes: 20,
            web_source: 'https://www.healthylittlefoodies.com',
            ingredients: [
                { name: 'Turkey Mince', quantity: 500, unit: 'g', category: 'Fridge' },
                { name: 'Carrots', quantity: 2, unit: '#', category: 'Fresh Produce' },
                { name: 'Zucchini', quantity: 1, unit: '#', category: 'Fresh Produce' },
                { name: 'Breadcrumbs', quantity: 50, unit: 'g', category: 'Pantry' },
                { name: 'Egg', quantity: 1, unit: '#', category: 'Fridge' }
            ]
        },
        {
            name: 'Cheesy Cauliflower Pasta',
            instructions: '1. Steam cauliflower until very soft.\n2. Blend cauliflower with milk, cheese, and a pinch of nutritional yeast until smooth.\n3. Cook pasta shells according to package.\n4. Mix pasta with sauce and serve warm.',
            servings: 4,
            cook_time_minutes: 15,
            web_source: 'https://www.mjandhungryman.com',
            ingredients: [
                { name: 'Cauliflower', quantity: 0.5, unit: 'head', category: 'Fresh Produce' },
                { name: 'Pasta Shells', quantity: 250, unit: 'g', category: 'Pantry' },
                { name: 'Cheddar Cheese', quantity: 100, unit: 'g', category: 'Fridge' },
                { name: 'Milk', quantity: 100, unit: 'ml', category: 'Fridge' }
            ]
        },
        {
            name: 'Banana Oat Pancakes',
            instructions: '1. Mash banana until smooth.\n2. Whisk in egg and oats until combined.\n3. Heat a non-stick pan over medium heat.\n4. Cook small spoonfuls for 2 mins each side.',
            servings: 2,
            cook_time_minutes: 10,
            web_source: 'https://www.weelicious.com',
            ingredients: [
                { name: 'Banana', quantity: 1, unit: '#', category: 'Fresh Produce' },
                { name: 'Oats', quantity: 50, unit: 'g', category: 'Pantry' },
                { name: 'Egg', quantity: 1, unit: '#', category: 'Fridge' }
            ]
        },
        {
            name: 'Garlic Butter Shrimp Scampi',
            instructions: '1. Boil pasta in salted water.\n2. Sauté garlic in butter and olive oil until fragrant.\n3. Add shrimp and cook until pink.\n4. Toss with cooked pasta, lemon juice, and parsley.',
            servings: 2,
            cook_time_minutes: 12,
            web_source: 'https://www.bonappetit.com',
            ingredients: [
                { name: 'Shrimp', quantity: 300, unit: 'g', category: 'Fridge' },
                { name: 'Linguine', quantity: 200, unit: 'g', category: 'Pantry' },
                { name: 'Garlic', quantity: 4, unit: 'cloves', category: 'Fresh Produce' },
                { name: 'Butter', quantity: 50, unit: 'g', category: 'Fridge' },
                { name: 'Lemon', quantity: 1, unit: '#', category: 'Fresh Produce' }
            ]
        },
        {
            name: 'Spicy Peanut Noodle Stir-fry',
            instructions: '1. Whisk peanut butter, soy sauce, lime, and sriracha.\n2. Boil noodles.\n3. Stir-fry broccoli and peppers.\n4. Toss everything together with the sauce.',
            servings: 2,
            cook_time_minutes: 15,
            web_source: 'https://www.halfbakedharvest.com',
            ingredients: [
                { name: 'Peanut Butter', quantity: 3, unit: 'tbsp', category: 'Pantry' },
                { name: 'Rice Noodles', quantity: 150, unit: 'g', category: 'Pantry' },
                { name: 'Broccoli', quantity: 1, unit: 'head', category: 'Fresh Produce' },
                { name: 'Bell Pepper', quantity: 1, unit: '#', category: 'Fresh Produce' },
                { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', category: 'Pantry' }
            ]
        }
    ];

    const groceryTypeMap = new Map<string, string>();

    // Step 1: Create missing grocery types
    for (const recipe of exampleRecipes) {
        for (const ing of recipe.ingredients) {
            if (!groceryTypeMap.has(ing.name)) {
                // Check if it already exists
                const { data: existing } = await supabase
                    .from('grocery_types')
                    .select('id')
                    .eq('name', ing.name)
                    .maybeSingle();

                if (existing) {
                    groceryTypeMap.set(ing.name, existing.id);
                } else {
                    const { data, error } = await supabase
                        .from('grocery_types')
                        .insert({ name: ing.name, category_id: getCatId(ing.category) })
                        .select('id')
                        .single();

                    if (!error && data) {
                        groceryTypeMap.set(ing.name, data.id);
                        console.log(`✅ Created ingredient: ${ing.name}`);
                    }
                }
            }
        }
    }

    // Step 2: Create recipes and their lists
    for (const recipe of exampleRecipes) {
        const { data: list, error: listError } = await supabase
            .from('grocery_lists')
            .insert({ name: recipe.name })
            .select('id')
            .single();

        if (listError) continue;

        const { data: recipeData, error: recipeError } = await supabase
            .from('recipes')
            .insert({
                name: recipe.name,
                instructions: recipe.instructions,
                servings: recipe.servings,
                total_time_mins: recipe.cook_time_minutes,
                web_source: recipe.web_source,
                ingredients_list_id: list.id
            })
            .select('id')
            .single();

        if (recipeError) {
            console.error(`Error creating recipe ${recipe.name}:`, recipeError.message);
            continue;
        }

        console.log(`📖 Created recipe: ${recipe.name}`);

        for (const ing of recipe.ingredients) {
            const typeId = groceryTypeMap.get(ing.name);
            if (!typeId) continue;

            await supabase.from('grocery_list_items').insert({
                list_id: list.id,
                grocery_type_id: typeId,
                quantity: ing.quantity,
                unit: ing.unit
            });
        }
    }

    console.log('\n🎉 Example recipes seeded successfully!');
}

seedExampleRecipes().catch(console.error);
