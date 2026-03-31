# Guardrails

> Patterns and signs discovered during spec loop iterations.
> **Read this FIRST** before starting any work — it contains lessons from previous iterations.

## Codebase Patterns

- All API routes use `/api/[resource]` convention (no versioning)
- Response envelope: `{ data: ... }` for success, `{ error: string }` for errors
- Use `getDb()` from `src/db.ts` to access the database in route handlers
- Tests clear the tasks table in `beforeEach` and close DB in `afterAll`
- Express 5: don't return `res.json()` — call it then `return;` on next line
- Vitest `fileParallelism: false` is set in vitest.config.ts — all test files share one SQLite DB, parallel execution causes cross-file interference
- Priority validation: `VALID_PRIORITIES = ["low", "medium", "high", "urgent"]` array defined at module level in app.ts, checked on both POST and PUT
- Sorting: `VALID_SORT_FIELDS` and `VALID_ORDER_VALUES` arrays at module level; priority sorts use CASE expression for semantic urgency; always add `id` as tiebreaker for deterministic ordering

## Signs

<!-- Agents: add warning signs here when failures occur.
     These prevent the same mistake from happening in future iterations.

### Sign: [brief description]
- **Trigger**: When [condition that led to failure]
- **Instruction**: [what to do instead]
- **Added after**: Iteration failure on [STORY-ID]
-->
