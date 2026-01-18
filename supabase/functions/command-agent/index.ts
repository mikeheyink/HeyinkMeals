import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tool definitions for Gemini Function Calling
const TOOLS = [
    {
        name: "plan_meal",
        description: "Add a recipe to the meal planner for a specific date, meal slot, and diner group",
        parameters: {
            type: "object",
            properties: {
                recipe_query: { type: "string", description: "The recipe name or description to search for" },
                date: { type: "string", description: "Date in YYYY-MM-DD format. Use 'today', 'tomorrow', or day names like 'Tuesday'" },
                slot: { type: "string", enum: ["Breakfast", "Lunch", "Dinner"], description: "The meal slot" },
                diners: { type: "string", enum: ["Everyone", "Parents", "Children"], description: "Who the meal is for. Default to Parents if user says 'us' or similar." }
            },
            required: ["recipe_query", "date", "slot"]
        }
    },
    {
        name: "remove_meal",
        description: "Remove a planned meal from the meal planner",
        parameters: {
            type: "object",
            properties: {
                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                slot: { type: "string", enum: ["Breakfast", "Lunch", "Dinner"] },
                diners: { type: "string", enum: ["Everyone", "Parents", "Children"] }
            },
            required: ["date", "slot"]
        }
    },
    {
        name: "mark_item_purchased",
        description: "Mark an item on the shopping list as purchased or not purchased",
        parameters: {
            type: "object",
            properties: {
                item_query: { type: "string", description: "The grocery item name to search for" },
                purchased: { type: "boolean", description: "Whether to mark as purchased (true) or unpurchased (false)" }
            },
            required: ["item_query", "purchased"]
        }
    },
    {
        name: "add_to_shopping_list",
        description: "Add an item to the master shopping list",
        parameters: {
            type: "object",
            properties: {
                item_query: { type: "string", description: "The grocery item name" },
                quantity: { type: "number", description: "Amount to add" },
                unit: { type: "string", description: "Unit of measurement (g, kg, ml, L, pieces, etc.)" }
            },
            required: ["item_query"]
        }
    },
    {
        name: "search_recipes",
        description: "Search for recipes by name or description",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search query" }
            },
            required: ["query"]
        }
    }
];

// Helper: Get embedding from Gemini
async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] }
        })
    });

    if (!response.ok) {
        throw new Error(`Embedding error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding.values;
}

// Helper: Parse relative dates
function parseDate(input: string): string {
    const today = new Date();
    const lower = input.toLowerCase();

    if (lower === 'today') {
        return today.toISOString().split('T')[0];
    }
    if (lower === 'tomorrow') {
        today.setDate(today.getDate() + 1);
        return today.toISOString().split('T')[0];
    }

    // Day names (find next occurrence)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = days.indexOf(lower);
    if (dayIndex !== -1) {
        const currentDay = today.getDay();
        let daysUntil = dayIndex - currentDay;
        if (daysUntil <= 0) daysUntil += 7; // Next week if today or past
        today.setDate(today.getDate() + daysUntil);
        return today.toISOString().split('T')[0];
    }

    // Assume it's already YYYY-MM-DD
    return input;
}

// Tool Executors
async function executePlanMeal(args: any, supabase: any, apiKey: string) {
    const { recipe_query, date, slot, diners = 'Parents' } = args;

    // 1. Find the best matching recipe using vector search
    const embedding = await getEmbedding(recipe_query, apiKey);

    const { data: matches, error: matchError } = await supabase
        .rpc('match_recipes', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 1
        });

    if (matchError || !matches || matches.length === 0) {
        return { success: false, message: `Could not find a recipe matching "${recipe_query}"` };
    }

    const recipe = matches[0];
    const parsedDate = parseDate(date);

    // 2. Add the meal plan entry
    const { data: entry, error: planError } = await supabase
        .from('meal_plan_entries')
        .insert({
            date: parsedDate,
            slot,
            diner_type: diners,
            plan_type: 'Recipe',
            reference_id: recipe.id
        })
        .select()
        .single();

    if (planError) {
        return { success: false, message: `Failed to plan meal: ${planError.message}` };
    }

    return {
        success: true,
        message: `Planned "${recipe.name}" for ${diners} on ${parsedDate} (${slot})`
    };
}

async function executeMarkItemPurchased(args: any, supabase: any, apiKey: string) {
    const { item_query, purchased } = args;

    // Find the grocery type
    const embedding = await getEmbedding(item_query, apiKey);

    const { data: matches } = await supabase
        .rpc('match_grocery_types', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 1
        });

    if (!matches || matches.length === 0) {
        return { success: false, message: `Could not find "${item_query}" in grocery types` };
    }

    const groceryTypeId = matches[0].id;

    // Find and update shopping list items with this grocery type
    const { data: items, error: fetchError } = await supabase
        .from('shopping_list_items')
        .select('id')
        .eq('grocery_type_id', groceryTypeId)
        .eq('is_archived', false)
        .eq('is_purchased', !purchased);

    if (fetchError || !items || items.length === 0) {
        return { success: false, message: `No ${purchased ? 'unpurchased' : 'purchased'} "${matches[0].name}" found on shopping list` };
    }

    const { error: updateError } = await supabase
        .from('shopping_list_items')
        .update({ is_purchased: purchased })
        .in('id', items.map((i: any) => i.id));

    if (updateError) {
        return { success: false, message: `Failed to update: ${updateError.message}` };
    }

    return {
        success: true,
        message: `Marked ${items.length} "${matches[0].name}" item(s) as ${purchased ? 'purchased' : 'not purchased'}`
    };
}

async function executeAddToShoppingList(args: any, supabase: any, apiKey: string) {
    const { item_query, quantity = 1, unit = '' } = args;

    // Find or create the grocery type
    const embedding = await getEmbedding(item_query, apiKey);

    const { data: matches } = await supabase
        .rpc('match_grocery_types', {
            query_embedding: embedding,
            match_threshold: 0.6,
            match_count: 1
        });

    let groceryTypeId: string;
    let groceryName: string;

    if (matches && matches.length > 0) {
        groceryTypeId = matches[0].id;
        groceryName = matches[0].name;
    } else {
        // Create new grocery type
        const { data: newType, error: createError } = await supabase
            .from('grocery_types')
            .insert({ name: item_query, embedding })
            .select('id')
            .single();

        if (createError) {
            return { success: false, message: `Failed to create grocery type: ${createError.message}` };
        }
        groceryTypeId = newType.id;
        groceryName = item_query;
    }

    // Add to shopping list
    const { error: insertError } = await supabase
        .from('shopping_list_items')
        .insert({
            grocery_type_id: groceryTypeId,
            quantity,
            unit,
            is_purchased: false,
            is_in_stock: false
        });

    if (insertError) {
        return { success: false, message: `Failed to add to shopping list: ${insertError.message}` };
    }

    return {
        success: true,
        message: `Added ${quantity}${unit ? ' ' + unit : ''} ${groceryName} to shopping list`
    };
}

async function executeSearchRecipes(args: any, supabase: any, apiKey: string) {
    const { query } = args;

    const embedding = await getEmbedding(query, apiKey);

    const { data: matches, error } = await supabase
        .rpc('match_recipes', {
            query_embedding: embedding,
            match_threshold: 0.4,
            match_count: 5
        });

    if (error || !matches || matches.length === 0) {
        return { success: false, message: `No recipes found matching "${query}"` };
    }

    const recipeList = matches.map((r: any, i: number) => `${i + 1}. ${r.name}`).join('\n');

    return {
        success: true,
        message: `Found ${matches.length} recipes:\n${recipeList}`
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { command, context } = await req.json();

        if (!command) {
            throw new Error("Command is required");
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error("GEMINI_API_KEY not set");

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseKey) throw new Error("Supabase config missing");

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log(`Command: ${command}`);
        console.log(`Context:`, context);

        // Build the system prompt
        const systemPrompt = `You are a helpful meal planning assistant for a family meal app. 
Today's date is ${new Date().toISOString().split('T')[0]}.
When the user says "us" or "we", they mean "Parents".
When planning meals, default to "Parents" unless specifically mentioned.
Only call ONE function per request. Choose the most appropriate action.`;

        // Call Gemini with function calling
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: command }] }
                ],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                tools: [{ functionDeclarations: TOOLS }]
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API error: ${geminiResponse.status} ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const candidate = geminiData.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        // Check if Gemini wants to call a function
        if (part?.functionCall) {
            const { name, args } = part.functionCall;
            console.log(`Function call: ${name}`, args);

            let result;
            switch (name) {
                case 'plan_meal':
                    result = await executePlanMeal(args, supabase, apiKey);
                    break;
                case 'mark_item_purchased':
                    result = await executeMarkItemPurchased(args, supabase, apiKey);
                    break;
                case 'add_to_shopping_list':
                    result = await executeAddToShoppingList(args, supabase, apiKey);
                    break;
                case 'search_recipes':
                    result = await executeSearchRecipes(args, supabase, apiKey);
                    break;
                default:
                    result = { success: false, message: `Unknown function: ${name}` };
            }

            // Add actionTaken flag to the result
            return new Response(JSON.stringify({ ...result, actionTaken: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // If no function call, return the text response (no action taken - could be clarifying question)
        const textResponse = part?.text || "I'm not sure how to help with that.";
        return new Response(JSON.stringify({
            success: true,
            message: textResponse,
            actionTaken: false
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
