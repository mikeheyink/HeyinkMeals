import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPreferences() {
    console.log('--- Testing User Preferences Service ---\n');

    const testKey = 'test_preference';
    const testValue = { foo: 'bar', items: [1, 2, 3] };

    // 1. Test: Create/Update preference
    console.log('1. Creating preference...');
    const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert(
            { key: testKey, value: testValue, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );

    if (upsertError) {
        console.error('❌ Failed to create preference:', upsertError.message);
        return;
    }
    console.log('✅ Preference created/updated successfully');

    // 2. Test: Read preference
    console.log('\n2. Reading preference...');
    const { data, error: readError } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('key', testKey)
        .single();

    if (readError) {
        console.error('❌ Failed to read preference:', readError.message);
        return;
    }
    console.log('✅ Preference read successfully:', JSON.stringify(data.value, null, 2));

    // 3. Test: Update preference
    console.log('\n3. Updating preference...');
    const updatedValue = { ...testValue, updated: true };
    const { error: updateError } = await supabase
        .from('user_preferences')
        .upsert(
            { key: testKey, value: updatedValue, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );

    if (updateError) {
        console.error('❌ Failed to update preference:', updateError.message);
        return;
    }
    console.log('✅ Preference updated successfully');

    // 4. Verify update
    const { data: verifyData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('key', testKey)
        .single();

    console.log('\n4. Final state:', JSON.stringify(verifyData, null, 2));

    // 5. Cleanup
    console.log('\n5. Cleaning up test data...');
    const { error: deleteError } = await supabase
        .from('user_preferences')
        .delete()
        .eq('key', testKey);

    if (deleteError) {
        console.error('❌ Failed to cleanup:', deleteError.message);
    } else {
        console.log('✅ Test data cleaned up');
    }

    console.log('\n--- All tests passed! ---');
}

testPreferences().catch(console.error);
