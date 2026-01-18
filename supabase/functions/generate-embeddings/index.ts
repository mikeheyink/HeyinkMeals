import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMBEDDING_MODEL = 'text-embedding-004';

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.embedding.values;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error("GEMINI_API_KEY not set");

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseKey) throw new Error("Supabase config missing");

        const supabase = createClient(supabaseUrl, supabaseKey);

        const results = { recipes: 0, groceryTypes: 0, errors: [] as string[] };

        // Process recipes without embeddings
        const { data: recipes } = await supabase
            .from('recipes')
            .select('id, name, instructions')
            .is('embedding', null)
            .eq('is_archived', false);

        if (recipes && recipes.length > 0) {
            console.log(`Processing ${recipes.length} recipes...`);
            for (const recipe of recipes) {
                try {
                    const text = `${recipe.name}. ${(recipe.instructions || '').slice(0, 500)}`;
                    const embedding = await getEmbedding(text, apiKey);

                    await supabase
                        .from('recipes')
                        .update({ embedding })
                        .eq('id', recipe.id);

                    results.recipes++;
                    console.log(`✓ Recipe: ${recipe.name}`);

                    // Rate limiting
                    await new Promise(r => setTimeout(r, 100));
                } catch (err) {
                    results.errors.push(`Recipe ${recipe.name}: ${err.message}`);
                }
            }
        }

        // Process grocery types without embeddings
        const { data: groceries } = await supabase
            .from('grocery_types')
            .select('id, name')
            .is('embedding', null);

        if (groceries && groceries.length > 0) {
            console.log(`Processing ${groceries.length} grocery types...`);
            for (const grocery of groceries) {
                try {
                    const embedding = await getEmbedding(grocery.name, apiKey);

                    await supabase
                        .from('grocery_types')
                        .update({ embedding })
                        .eq('id', grocery.id);

                    results.groceryTypes++;
                    console.log(`✓ Grocery: ${grocery.name}`);

                    await new Promise(r => setTimeout(r, 100));
                } catch (err) {
                    results.errors.push(`Grocery ${grocery.name}: ${err.message}`);
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Generated embeddings for ${results.recipes} recipes and ${results.groceryTypes} grocery types`,
            errors: results.errors
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
