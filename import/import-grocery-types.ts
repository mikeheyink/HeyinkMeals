
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

// Prioritized Categories for Matching
// Order Matters! First match wins.
const MATCH_ORDER = [
    'Baby / Kids',
    'Toiletries',
    'Cleaning & Home',
    'Freezer',
    'Drinks', // Drinks before Fridge (Milk) or Pantry? 
    'Pantry', // Specific overrides (e.g. Peanut Butter)
    'Fridge',
    'Fresh Produce',
    'Bread & Bakery',
    'Herbs & Spices'
    // Default fallback is Pantry
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Fresh Produce': ['apple', 'banana', 'orange', 'fruit', 'vegetable', 'spinach', 'corn', 'pea', 'avocado', 'tomato', 'potato', 'onion', 'garlic', 'carrot', 'broccoli', 'lettuce', 'cucumber', 'pepper', 'ginger', 'lime', 'lemon', 'berry', 'cherry', 'grape', 'melon', 'mushroom', 'squash', 'zucchini', 'brinjal', 'aubergine', 'cauliflower', 'cabbage', 'kale', 'celery', 'chili', 'salad', 'rocket', 'baby marrow', 'butternut', 'pumpkin', 'sweet potato', 'gem', 'bean', 'sprout', 'slaw', 'mango', 'watermelon', 'naartjie', 'clemengold', 'granadilla', 'pineapple', 'kiwi', 'pear', 'peach', 'plum', 'nectarine', 'apricot', 'fig', 'guava', 'litchi', 'papaya', 'pomegranate', 'quince', 'raspberry', 'strawberry', 'blueberry', 'lemon', 'asparagus', 'artichoke', 'herb', 'basil', 'parsley', 'coriander', 'mint', 'thyme', 'rosemary', 'oregano'],
    'Fridge': [
        // Meat & Seafood
        'chicken', 'beef', 'pork', 'lamb', 'steak', 'mince', 'sausage', 'bacon', 'ham', 'salami', 'chorizo', 'fish', 'salmon', 'tuna', 'prawn', 'shrimp', 'calamari', 'mussel', 'crab', 'oyster', 'meat', 'rib', 'burger', 'patty', 'fillet', 'chop', 'drumstick', 'wing', 'thigh', 'breast', 'schnitzel', 'hake', 'haddock', 'sardine', 'anchovy', 'poloney', 'vienna', 'russain', 'boerewors', 'braai',
        // Dairy & Eggs
        'milk', 'cheese', 'yoghurt', 'butter', 'cream', 'egg', 'cheddar', 'mozzarella', 'feta', 'parmesan', 'gouda', 'brie', 'camembert', 'ricotta', 'mascarpone', 'paneer', 'halloumi', 'custard', 'margarine',
        'hummus', 'dip', 'olive', 'pesto'
    ],
    'Bread & Bakery': ['bread', 'bagel', 'roll', 'tortilla', 'wrap', 'bun', 'muffin', 'croissant', 'pita', 'panini', 'toast', 'loaf', 'bake', 'dough', 'pastry', 'pancake', 'sourdough'],
    'Herbs & Spices': ['salt', 'pepper', 'cumin', 'paprika', 'spice', 'cinnamon', 'nutmeg', 'turmeric', 'curry', 'garlic powder', 'onion powder', 'stock', 'broth', 'bullion'],
    'Drinks': ['juice', 'water', 'soda', 'coke', 'tea', 'coffee', 'wine', 'beer', 'alcohol', 'drink', 'beverage', 'squash', 'cordial'],
    'Freezer': ['frozen', 'ice', 'ice cream', 'pizza', 'pie', 'chips', 'fry', 'waffle', 'mixed veg', 'fish finger', 'fish cake', 'chicken strip', 'nugget', "quick meal"],
    'Toiletries': ['shampoo', 'conditioner', 'toothpaste', 'brush', 'floss', 'razor', 'shave', 'deodorant', 'lotion', 'cream', 'sun', 'repellent', 'vitamin', 'medicine', 'plaster', 'bandage', 'tissue', 'toilet paper', 'cotton', 'perfume', 'serum', 'wash', 'soap'],
    'Cleaning & Home': ['clean', 'detergent', 'bag', 'foil', 'wrap', 'bin', 'batteries', 'bulb', 'match', 'lighter', 'charcoal', 'fire', 'wood', 'pool', 'garden', 'pet', 'dog', 'cat', 'food', 'litter', 'liner', 'sponge', 'cloth', 'mop', 'broom', 'bucket', 'bleach', 'softener', 'polish', 'dish', 'laundry', 'paper towel', 'vanish', 'dishwasher'],
    'Baby / Kids': ['nappy', 'nappies', 'wipes', 'formula', 'baby', 'kid'],
    'Pantry': ['peanut butter', 'rice', 'pasta', 'flour', 'sugar', 'oil', 'sauce', 'can', 'tin', 'jar', 'cereal', 'oats', 'nut', 'biscuit', 'cracker', 'chip', 'chocolate', 'sweet', 'candy', 'bar', 'jam', 'honey', 'syrup', 'vinegar', 'mayo', 'lentil', 'bean', 'chickpea', 'couscous', 'quinoa', 'noodle', 'soup', 'cake', 'cookie', 'rusk', 'mix', 'jelly', 'custard', 'yeast', 'baking'] // Specific overrides
};

async function importGroceryTypes() {
    console.log('📦 Importing Grocery Types (Optimized)...');

    // 1. Fetch Categories
    const { data: categories, error: catError } = await supabase
        .from('grocery_categories')
        .select('id, name');

    if (catError || !categories) {
        console.error('Error fetching categories:', catError?.message);
        process.exit(1);
    }

    const categoryMap = new Map(categories.map(c => [c.name, c.id]));
    const pantryId = categoryMap.get('Pantry');

    if (!pantryId) { console.error('Pantry category not found'); process.exit(1); }

    // 2. Read File
    const filePath = path.resolve('import/grocery_types.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    console.log(`Found ${data.length} entries.`);

    for (const row of data) {
        const name = row.name;
        if (!name) continue;

        // Determine Category
        let categoryId = pantryId; // Default fallback
        const lowerName = name.toLowerCase();
        let matchedCategory = 'Pantry (Default)';

        // Iterate in Priority Order
        for (const catName of MATCH_ORDER) {

            // Skip if category doesn't exist in DB (Safety)
            const mappedId = categoryMap.get(catName);
            if (!mappedId) continue;

            const keywords = CATEGORY_KEYWORDS[catName];
            if (!keywords) continue;

            // Word Boundary Match with Auto-Plural (s/es)
            const match = keywords.some(k => {
                try {
                    // Match full word, optionally followed by s or es
                    const regex = new RegExp(`\\b${k}(s|es)?\\b`, 'i');
                    return regex.test(name);
                } catch (e) {
                    return false;
                }
            });

            if (match) {
                categoryId = mappedId;
                matchedCategory = catName;
                break; // STOP at first match (Priority wins)
            }
        }

        // Insert or Update
        const { data: existing } = await supabase.from('grocery_types').select('id, category_id').eq('name', name).single();

        if (existing) {
            // Only update if category changed (Save DB calls? No, just update)
            if (existing.category_id !== categoryId) {
                const { error } = await supabase.from('grocery_types').update({ category_id: categoryId }).eq('id', existing.id);
                if (error) console.error(`Error updating ${name}:`, error.message);
                else console.log(`  Updated: ${name} -> ${matchedCategory}`);
            } else {
                // console.log(`  Skipped: ${name} (Already correct)`);
            }
        } else {
            const { error } = await supabase.from('grocery_types').insert({
                name,
                category_id: categoryId,
                default_store_id: null
            });
            if (error) console.error(`Error inserting ${name}:`, error.message);
            else console.log(`  Inserted: ${name} -> ${matchedCategory}`);
        }
    }
    console.log('✅ Import complete.');
}

importGroceryTypes().catch(console.error);
