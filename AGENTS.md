# AGENTS.md — Coding Standards for AI Agents

> **This file must be read by every AI agent before performing any work on this project.**
> It contains universal engineering principles — not project-specific details.

---

## 1. First Principles

### 1.1 You Are a Surgeon, Not a Sledgehammer
- Make the **smallest possible change** that solves the problem.
- Do not refactor, rename, reorganise, or "improve" code that is unrelated to your current task.
- If you touch a file, leave every line you didn't deliberately change **exactly as it was** — including whitespace, comments, and import order.

### 1.2 Understand Before You Write
- **Read** the surrounding code before generating new code. Understand the patterns, naming conventions, and architectural style already in use.
- Match the existing project's conventions even if you personally prefer a different style.
- If the codebase uses `camelCase`, do not introduce `snake_case`. If it uses named exports, do not switch to default exports.

### 1.3 Never Assume — Verify
- Do not assume a function exists. Search for it.
- Do not assume an import path is correct. Check the file tree.
- Do not assume a dependency is installed. Check `package.json` (or equivalent).
- Do not hallucinate package names. If you are unsure a package exists, say so.

---

## 2. Code Quality Rules

### 2.1 Type Safety
- Never use `any` as a type in TypeScript. If you don't know the shape, define an interface or use `unknown` and narrow.
- Never cast with `as` to silence errors. Fix the root cause instead.
- If the project has auto-generated types (e.g., Supabase, Prisma, GraphQL), use them.

### 2.2 Error Handling
- Never write an empty `catch` block. At minimum, log the error.
- Never `console.log` errors in production code — use the project's established error reporting mechanism.
- Always consider: what happens if this network call fails? What does the user see?

### 2.3 No Dead Code
- Do not leave commented-out code behind.
- Do not create functions or variables that are never called.
- Do not add imports that are unused.
- If you remove a feature, remove **all** of its code — including types, tests, CSS, and service functions.

### 2.4 Single Responsibility
- A function should do one thing. If you find yourself writing a function longer than ~40 lines, break it up.
- A component should render one concept. If a component file exceeds ~200 lines, it likely needs decomposition.
- A service file should serve one domain. Do not put grocery list logic in a recipe service file.

### 2.5 No Duplication
- Before creating a new utility, constant, type, or helper, **search the codebase** for an existing one.
- If two files define the same constant or config, consolidate to a single source of truth and import it.

---

## 3. Common AI Mistakes You Must Avoid

### 3.1 Accidentally Removing Code
- When editing a section of a file, **do not** accidentally delete adjacent imports, functions, or exports.
- After every edit, mentally verify: did I remove anything I didn't intend to?
- Pay special attention to import blocks — these are the most commonly corrupted area.

### 3.2 Phantom Dependencies
- Never import from a package that is not in the project's dependency file.
- Never reference a file that does not exist on disk.
- Never call an API endpoint or service method without confirming it exists in the codebase.

### 3.3 Context Window Blindness
- If you cannot see the full file, do not make assumptions about what is outside your view.
- If your edit depends on code you haven't read, read it first.
- Large files are dangerous — read the function signatures and imports before editing.

### 3.4 Over-Eagerness
- Do not add features that were not requested.
- Do not install new dependencies without explicit discussion.
- Do not migrate to a different framework, library, or pattern unless asked.
- Do not "clean up" or "modernise" code while completing an unrelated task.

### 3.5 Breaking Working Code
- If the code currently works, your change must also work.
- After any change, verify: does the build pass? Do the tests pass? Does the app load?
- Never submit a change that introduces TypeScript errors, even if the logic is correct.

---

## 4. Process & Workflow

### 4.1 Plan Before You Code
- For any task involving more than 2 files, write a brief plan of what you will change and why.
- Identify dependencies between changes (e.g., "I need to add the method to the service before calling it in the component").

### 4.2 Verify After Every Change
- Run the TypeScript compiler (`tsc --noEmit` or equivalent) after editing.
- Run the test suite if one exists.
- If you changed UI code, visually verify it in the browser.

### 4.3 Commit Discipline
- Each commit should represent one logical change.
- Write commit messages that explain *why*, not just *what*.
- Never commit generated files, build artifacts, or environment files.

### 4.4 Leave the Codebase Better Than You Found It
- If you find a genuine bug while working on something else, fix it — but in a separate commit.
- If naming is inconsistent in the area you're editing, standardise it — but only in the files you're already touching.

---

## 5. Security Non-Negotiables

- Never hardcode API keys, secrets, tokens, or passwords in source files.
- Never log sensitive user data (passwords, tokens, PII).
- Always validate and sanitise user input before using it in database queries.
- Never use string concatenation to build SQL or shell commands.
- When handling authentication, never trust client-side state as the sole authority.

---

## 6. Testing Expectations

- If you add a new function, add a test for it (if a testing framework is in place).
- If you fix a bug, add a regression test that would have caught it.
- Tests should be deterministic — no reliance on system time, network, or random values without mocking.
- Test names should describe the behaviour being tested, not the implementation.

---

## 7. Documentation

- If you add a public API, service method, or hook, add a brief JSDoc/TSDoc comment explaining what it does, its parameters, and its return value.
- Do not write obvious comments like `// increment counter` above `counter++`.
- Update README or relevant docs if you change setup steps, environment variables, or key workflows.

---

*This file should be treated as a living document. Update it when new patterns emerge or new anti-patterns are discovered.*
