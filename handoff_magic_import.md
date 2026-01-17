# Handoff: Magic Import Edge Function Deployment

## Objective
We are building a "Magic Import" feature that takes a recipe URL, scrapes the content, and uses Google Gemini AI to extract structured recipe data (ingredients, instructions, etc.) and convert units to South African metric standards.

## Components
1.  **Frontend**: `src/components/MagicImportModal.tsx` (Completed & working locally). calls the edge function.
2.  **Backend**: Supabase Edge Function `supabase/functions/extract-recipe/index.ts`.
3.  **Deployment**: GitHub Actions workflow `.github/workflows/deploy-supabase.yaml`.

## The Problem
We are unable to deploy the Edge Function via GitHub Actions. The deployment fails during the **bundling** phase with dependency resolution errors.

### The Specific Error
```text
Error: failed to create the graph
Caused by:
    Module not found "https://esm.sh/node@25.3.0?target=denonext"
    at https://esm.sh/undici@7.18.2?target=denonext:2:8
```
*   **Interpretation**: Something in the dependency tree is trying to import `undici` (a Node.js fetch polyfill) or other Node.js built-ins. Use of `node:` modules or heavy polyfills often breaks the Supabase Edge Runtime bundler.

## What We Have Tried (Chronological Order)

1.  **Initial Implementation**:
    *   Used `npm:@google/generative-ai` (Google AI SDK).
    *   Used `cheerio` for HTML parsing.
    *   **Result**: Failed deployment (likely due to SDK pulling in node deps).

2.  **Attempt 2: Switch to ESM for SDK**:
    *   Changed import to `https://esm.sh/@google/generative-ai`.
    *   **Result**: Failed. `undici` error persisted.

3.  **Attempt 3: Remove SDK entirely**:
    *   Replaced Google AI SDK with a **raw `fetch` call** to the Gemini API (`https://generativelanguage.googleapis.com/v1beta/...`).
    *   Kept `cheerio`.
    *   **Result**: Failed. Error regarding `node` modules persisted.

4.  **Attempt 4: Remove Cheerio**:
    *   Suspected `cheerio` (or its dep `parse5`) was pulling in Node dependencies.
    *   Replaced `cheerio` with **`deno-dom-wasm`** (`https://deno.land/x/deno_dom/deno-dom-wasm.ts`).
    *   **Result**: Still failing (according to user report).

## Current Code State
The `extract-recipe/index.ts` file currently uses:
*   `https://deno.land/std@0.168.0/http/server.ts`
*   `https://deno.land/x/deno_dom/deno-dom-wasm.ts`
*   Native `fetch` for the AI call.

## Hypothesis & Next Steps for New Agent
If `deno-dom-wasm` also failed, the bundling issue might be related to WASM optimization or the specific `deno.land` import in the Supabase CI environment.

**Suggested next steps:**
1.  **Try `jsdom`**: Import from `https://esm.sh/jsdom` (though this can be heavy).
2.  **Try `Cheerio` via ESM**: `import * as cheerio from 'https://esm.sh/cheerio';`
3.  **Radical Simplification**: Remove *all* HTML parsing libraries temporarily. Just grab `await response.text()` and pass the raw HTML string (truncated) significantly to Gemini. If this deploys, then we know for a fact the parser was the issue.
4.  **Config**: Double check if `supabase/config.toml` (which we generated via `supabase init` to solve a local CLI path error) is interfering with the CI deploy command `supabase functions deploy`.

## Key Files
*   `supabase/functions/extract-recipe/index.ts`
*   `.github/workflows/deploy-supabase.yaml`
*   `README.md` (contains the deploy badge to quickly link to Actions)
