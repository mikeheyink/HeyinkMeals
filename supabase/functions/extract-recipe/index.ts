import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { cheerio } from "https://deno.land/x/cheerio@1.0.7/mod.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

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

        // 2. Parse interesting content using Cheerio to reduce token usage
        const $ = cheerio.load(html);

        // Remove scripts, styles, and other noise
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        $('.comments').remove();
        $('.sidebar').remove();
        $('.ad').remove();

        // Get text content, hopefully focusing on the recipe
        // We try to grab the main content if possible, or just body
        let cleanText = $('main').text();
        if (cleanText.length < 500) {
            cleanText = $('body').text();
        }

        // Collapse whitespace
        cleanText = cleanText.replace(/\s+/g, ' ').trim().slice(0, 15000); // Limit context window just in case

        // 3. Configure Gemini
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or gemini-2.0-flash-exp

        const prompt = `
    You are a culinary AI expert. Extract the recipe details from the following text content scraped from a website.
    
    Rules:
    1. Extract the Name, Servings, Prep Time (in minutes), Cook Time (in minutes), Ingredients, and Instructions.
    2. Convert all ingredient units to South African Metric standards where possible:
       - oz -> g (approx 28g per oz)
       - lb -> g or kg
       - fluid oz -> ml
       - cups -> ml (check context, if flour 1 cup ~= 120g, if liquid 1 cup ~= 250ml. If unsure keeping 'cup' is okay but prefer metric).
       - stick of butter -> grams (1 stick = 113g)
       - Fahrenheit -> Celsius
    3. Return strictly VALID JSON with no additional formatting or code blocks.
    
    JSON Schema:
    {
      "found": boolean, // true if a recipe was found
      "data": {
        "name": string,
        "description": string, // brief summary
        "servings": number,
        "prepTimeMinutes": number, // estimate if missing
        "cookTimeMinutes": number, // estimate if missing
        "ingredients": [
          {
            "originalText": string, // line as it appeared or close to it
            "quantity": number,
            "unit": string, // e.g. "g", "ml", "tbsp", "cup", "tsp", "each"
            "name": string // clean name of ingredient
          }
        ],
        "instructions": string // Markdown formatted string of steps
      },
      "error": string // optional error message if not found
    }

    Content:
    ${cleanText}
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log("AI Response:", responseText);

        // Clean up potential markdown code fences from the AI response
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
