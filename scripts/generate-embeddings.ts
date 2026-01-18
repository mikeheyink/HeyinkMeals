/**
 * Embedding Generation Script
 * 
 * Generates vector embeddings for existing recipes and grocery_types
 * using Gemini's text-embedding model.
 * 
 * Usage: npx ts-node scripts/generate-embeddings.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const EMBEDDING_MODEL = 'text-embedding-004';
const BATCH_SIZE = 20;

interface EmbeddingRequest {
    model: string;
    content: {
        parts: { text: string }[];
    };
}

async function getEmbedding(text: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${geminiApiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: `models/${EMBEDDING_MODEL}`,
            content: {
                parts: [{ text }]
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.embedding.values;
}

async function generateRecipeEmbeddings() {
    console.log('📚 Fetching recipes without embeddings...');

    const { data: recipes, error } = await supabase
        .from('recipes')
        .select('id, name, instructions')
        .is('embedding', null)
        .eq('is_archived', false);

    if (error) throw error;
    if (!recipes || recipes.length === 0) {
        console.log('✅ All recipes already have embeddings');
        return;
    }

    console.log(`🔄 Processing ${recipes.length} recipes...`);

    for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
        const batch = recipes.slice(i, i + BATCH_SIZE);

        for (const recipe of batch) {
            try {
                // Create rich text for embedding (name + first 500 chars of instructions)
                const textForEmbedding = `${recipe.name}. ${(recipe.instructions || '').slice(0, 500)}`;
                const embedding = await getEmbedding(textForEmbedding);

                await supabase
                    .from('recipes')
                    .update({ embedding })
                    .eq('id', recipe.id);

                console.log(`  ✓ ${recipe.name}`);
            } catch (err) {
                console.error(`  ✗ Failed: ${recipe.name}`, err);
            }

            // Rate limiting: ~100ms between requests
            await new Promise(r => setTimeout(r, 100));
        }

        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} complete`);
    }
}

async function generateGroceryTypeEmbeddings() {
    console.log('\n🥕 Fetching grocery types without embeddings...');

    const { data: groceries, error } = await supabase
        .from('grocery_types')
        .select('id, name')
        .is('embedding', null);

    if (error) throw error;
    if (!groceries || groceries.length === 0) {
        console.log('✅ All grocery types already have embeddings');
        return;
    }

    console.log(`🔄 Processing ${groceries.length} grocery types...`);

    for (let i = 0; i < groceries.length; i += BATCH_SIZE) {
        const batch = groceries.slice(i, i + BATCH_SIZE);

        for (const grocery of batch) {
            try {
                const embedding = await getEmbedding(grocery.name);

                await supabase
                    .from('grocery_types')
                    .update({ embedding })
                    .eq('id', grocery.id);

                console.log(`  ✓ ${grocery.name}`);
            } catch (err) {
                console.error(`  ✗ Failed: ${grocery.name}`, err);
            }

            await new Promise(r => setTimeout(r, 100));
        }

        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} complete`);
    }
}

async function main() {
    console.log('🚀 Starting embedding generation...\n');

    if (!geminiApiKey) {
        console.error('❌ GEMINI_API_KEY not found in environment');
        process.exit(1);
    }

    await generateRecipeEmbeddings();
    await generateGroceryTypeEmbeddings();

    console.log('\n✨ Embedding generation complete!');
}

main().catch(console.error);
