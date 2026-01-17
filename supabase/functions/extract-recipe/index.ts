import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { url } = await req.json()

        if (!url) {
            throw new Error("URL is required");
        }

        console.log(`Processing URL: ${url}`);

        // 1. Fetch the HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();

        // 2. Pass raw HTML directly to Gemini (no DOM parsing library needed)
        // Gemini 1.5 Flash handles messy HTML well with its large context window
        // We just truncate to a reasonable size
        const truncatedHtml = html.slice(0, 30000);

        // 3. Call Gemini API directly (No SDK dependency)
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const prompt = `
    You are a culinary AI expert. Extract the recipe details from the following RAW HTML content scraped from a recipe website.
    
    Rules:
    1. Parse the HTML to find the recipe content. Ignore navigation, ads, comments, and other non-recipe content.
    2. Extract the Name, Servings, Prep Time (in minutes), Cook Time (in minutes), Ingredients, and Instructions.
    3. Convert all ingredient units to South African Metric standards where possible:
       - oz -> g (approx 28g per oz)
       - lb -> g or kg
       - fluid oz -> ml
       - cups -> ml (check context, if flour 1 cup ~= 120g, if liquid 1 cup ~= 250ml. If unsure keeping 'cup' is okay but prefer metric).
       - stick of butter -> grams (1 stick = 113g)
       - Fahrenheit -> Celsius
    4. For instructions, format as clear numbered steps. Each step on a new line, prefixed with the step number (e.g., "1. Preheat the oven..."). Clean up any HTML artifacts, special characters, or formatting issues.
    5. Return strictly VALID JSON with no additional formatting or code blocks.
    6. Do not include markdown formatting like \`\`\`json.
    
    JSON Schema:
    {
      "found": boolean, 
      "data": {
        "name": string,
        "description": string,
        "servings": number,
        "prepTimeMinutes": number,
        "cookTimeMinutes": number,
        "ingredients": [
          {
            "originalText": string,
            "quantity": number,
            "unit": string,
            "name": string
          }
        ],
        "instructions": string (formatted as numbered steps, one per line)
      },
      "error": string
    }

    Raw HTML:
    ${truncatedHtml}
    `;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const aiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`Gemini API Error: ${aiResponse.status} ${errorText}`);
        }

        const aiData = await aiResponse.json();
        // Access the response text safely
        const candidate = aiData.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        const responseText = part?.text || "{}";

        console.log("AI Response:", responseText);

        // Clean up potential markdown code fences from the AI response (just in case)
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonString);

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
