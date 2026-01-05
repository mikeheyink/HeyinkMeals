import 'dotenv/config';
import { listService, recipeService } from '../src/services/recipeService';
import { pantryService } from '../src/services/pantryService';

async function testRecipes() {
    console.log('--- Testing Lists & Recipes Service ---');

    // 1. Setup: Get a grocery type to use as an ingredient
    const groceries = await pantryService.getGroceries();
    // Don't return early, let the seeding logic below handle it

    let rice = groceries.find(g => g.name.includes('Rice')) || groceries[0];

    if (!rice) {
        console.log('⚠️ No groceries found. Seeding a test grocery item...');
        // Need a category first
        const categories = await pantryService.getCategories();
        const catId = categories[0].id;
        const newGrocery = await pantryService.addGrocery('Test Rice', catId);
        if (!newGrocery) throw new Error('Failed to seed grocery');
        rice = newGrocery;
    }

    console.log(`Using ingredient: ${rice.name} (${rice.id})`);

    // 2. Test: Create a Recipe
    const recipeName = `Jollof Rice ${Date.now()}`;
    console.log(`\nCreating Recipe: ${recipeName}...`);

    const recipe = await recipeService.createRecipe(
        recipeName,
        '1. Wash rice. 2. Cook tomato stew. 3. Mix.',
        4
    );

    if (recipe) {
        console.log('✅ Recipe created:', recipe.name);
        console.log('   -> Linked Ingredients List ID:', recipe.ingredients_list_id);
    } else {
        console.error('❌ Failed to create recipe.');
        return;
    }

    // 3. Test: Add Ingredient to Recipe
    console.log('\nAdding ingredient to recipe...');
    const item = await recipeService.addIngredientToRecipe(
        recipe.id,
        rice.id,
        500,
        'grams'
    );

    if (item) {
        console.log('✅ Ingredient added to recipe list:', item.quantity, item.unit);
    } else {
        console.error('❌ Failed to add ingredient.');
    }

    // 4. Verify: Fetch Full Recipe
    console.log('\nFetching full recipe details...');
    const fullRecipe = await recipeService.getRecipe(recipe.id);

    const hasIngredient = fullRecipe.ingredients_list.items.some(
        (i: any) => i.grocery_type.name === rice.name
    );

    if (hasIngredient) {
        console.log('✅ Verification successful: Recipe contains expected ingredient.');
        console.log('   Ingredients List:', fullRecipe.ingredients_list.name);
        fullRecipe.ingredients_list.items.forEach((i: any) => {
            console.log(`   - ${i.quantity}${i.unit} ${i.grocery_type.name}`);
        });
    } else {
        console.error('❌ Verification failed: Ingredient missing from fetched recipe.');
    }
}

testRecipes().catch(console.error);
