import 'dotenv/config';
import { pantryService } from '../src/services/pantryService';

async function testPantry() {
    console.log('--- Testing Pantry Service ---');

    // 1. Get Categories
    console.log('\nFetching Categories...');
    const categories = await pantryService.getCategories();
    console.log(`✅ Found ${categories.length} categories.`);

    if (categories.length === 0) {
        console.error('❌ No categories found! Did we run the SQL?');
        return;
    }
    const mainCategory = categories.find(c => c.name === 'Produce') || categories[0];

    // 2. Add Grocery Item
    const itemName = `Test Banana ${Date.now()}`;
    console.log(`\nAdding Grocery: ${itemName}...`);
    const newGrocery = await pantryService.addGrocery(itemName, mainCategory.id);

    if (newGrocery) {
        console.log('✅ Grocery added:', newGrocery.name, `(ID: ${newGrocery.id})`);
    } else {
        console.error('❌ Failed to add grocery.');
        return;
    }

    // 3. Verify it exists in list
    console.log('\nVerifying list contains new item...');
    const groceries = await pantryService.getGroceries();
    const exists = groceries.find(g => g.id === newGrocery.id);

    if (exists) {
        console.log('✅ Verification successful: Item found in database.');
        // Cleanup? Maybe keep it to show user.
    } else {
        console.error('❌ Item not found in retrieval list.');
    }

    // 4. Cleanup (Optional, but good for tests)
    console.log('\nDeleting test item...');
    await pantryService.deleteGrocery(newGrocery.id);
    console.log('✅ Test item deleted.');
}

testPantry().catch(console.error);
