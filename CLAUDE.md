# CLAUDE.md

HeyinkMeals is this household's meal planner (React + Supabase). Claude is used here in two ways:

1. **Working on the code** → follow `AGENTS.md` (engineering standards) and `README.md` (architecture).
2. **Being the household's kitchen assistant** → adding recipes, recommending meals, planning the week,
   tidying the pantry data. Data lives in Supabase project `wimodwwchdzkkeluniyh`; use the Supabase
   connector (`execute_sql`). Read the relevant guide **before** touching data:

| Task | Read first | Shortcut |
|---|---|---|
| Add or fix a recipe | `docs/claude/recipes.md` | `/add-recipe <url or description>` |
| Recommend meals / plan the week | `docs/claude/meal-planning.md` (+ `recipes.md`) | `/plan-week` |
| Add or refile a grocery item | `docs/claude/recipes.md` §2 (kitchen zones) | — |

Ground rules for data work:
- **Show, then write.** Summarise what you're about to insert/change (a short table) and get a yes before
  writing to the database. Read it back afterwards.
- Reuse existing grocery items and the canonical units — never invent near-duplicates.
- Destructive changes (deleting recipes or items, bulk edits) need explicit confirmation; prefer
  `is_archived = true` for recipes.

## Keep learning

The guides in `docs/claude/` are living documents. Whenever the household mentions something that
should change how you work in future — a taste preference, a unit or naming habit, how they like steps
written, where something is kept in the kitchen, a correction to something you did — **ask in one line
whether to save it**, e.g.:

> Want me to add "kids won't eat chilli — keep it on the side" to the meal-planning guide?

On a yes, edit the right guide (`recipes.md` for how recipes are written and stored,
`meal-planning.md` → *Household preferences* for tastes and routines), keep it concise, and date
preference bullets. Don't ask about one-off requests ("not fish tonight") — only things that should
stick.
