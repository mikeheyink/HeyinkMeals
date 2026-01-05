import 'dotenv/config';
import { plannerService } from '../src/services/plannerService';
import { recipeService } from '../src/services/recipeService';

async function testPlanning() {
    console.log('--- Testing Planning & Shopping Service ---');

    // 1. Setup: Create a Recipe to Plan
    const recipeName = `Planned Curried Chicken ${Date.now()}`;
    console.log(`Creating test recipe: ${recipeName}...`);
    const recipe = await recipeService.createRecipe(recipeName, 'Cook it.', 4);

    // We need an ingredient to verify aggregation
    // For this test, assume we have a grocery type ID. We should fetch one properly.
    // Note: In a real integration test, we'd use the Pantry Service to find an ID.
    // Let's just grab the recipe we made in the previous test if possible, or create a new ingredient here.
    // Pragrammatically finding a grocery type:
    // (Simplified for this script: We rely on the services being stateless/connected to same DB)

    // Let's verify aggregation works even if empty? No, we want to see items.
    // Re-importing pantry service to be safe
    const { pantryService } = await import('../src/services/pantryService');
    const groceries = await pantryService.getGroceries();
    const someGrocery = groceries[0];

    await recipeService.addIngredientToRecipe(recipe.id, someGrocery.id, 2, 'items');
    console.log(`Added 2 items of ${someGrocery.name} to recipe.`);

    // 2. Schedule the Meal (Today)
    const today = new Date().toISOString().split('T')[0];
    console.log(`\nScheduling for Date: ${today}`);

    const entry = await plannerService.addPlanEntry(
        today,
        'Dinner',
        'Everyone',
        'Recipe',
        recipe.id
    );

    if (entry) {
        console.log('✅ Meal Scheduled:', entry.date, entry.slot);
    } else {
        console.error('❌ Failed to schedule meal.');
        return;
    }

    // 3. Generate Shopping List
    console.log('\nGenerating Shopping List...');
    const shoppingList = await plannerService.generateShoppingList(today, today);

    console.log('Shopping List Result:', shoppingList);

    const foundItem = shoppingList.find((i: any) => i.grocery_name === someGrocery.name);

    if (foundItem && foundItem.quantity === 2) {
        console.log(`✅ Verification Successful: Found ${foundItem.quantity} ${foundItem.unit} of ${foundItem.grocery_name} in shopping list.`);
    } else {
        console.error('❌ Verification Failed: Item missing or quantity mismatch.');
    }
}

testPlanning().catch(console.error);
