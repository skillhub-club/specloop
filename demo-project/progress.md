# Spec Loop Progress Journal

> Append-only log of iteration outcomes and learnings.
> Each iteration adds an entry below — **never edit or remove previous entries**.

---

## Iteration 1 — Spec Refinement (2026-03-31)

**Phase**: Spec Refinement
**Result**: All 8 stories refined and marked `refined: true`

### Codebase Analysis
- Stack: Express 5 + TypeScript + better-sqlite3 (SQLite) + Vitest + supertest
- Existing: Health check endpoint at GET /health, tasks table with (id, title, description, status, created_at, updated_at)
- Test pattern: `tests/**/*.test.ts` with vitest globals, one existing test (health.test.ts)

### Refinements Made

**S-001 (CRUD)**: Consolidated 8 criteria to 6. Added explicit defaults (status='todo', description=''). Specified response envelope `{ data: ... }` / `{ error: ... }` shapes. Added 400 for invalid status on PUT. Set validation command to target `tests/tasks.test.ts`.

**S-002 (Priority)**: Tightened to 5 criteria. Made POST default and explicit-set into one criterion. Clarified 400 response for invalid priority. Set validation to `tests/priority.test.ts`.

**S-003 (Assignee)**: Reduced to 4 criteria. Added 404 handling for assign/unassign endpoints (was missing). Specified response codes (200) for assign/unassign. Set validation to `tests/assignee.test.ts`.

**S-004 (Filtering)**: Kept at 5 criteria. Split priority and assigned_to filters into separate verifiable items. Clarified that unrecognized filter keys are also ignored (not just invalid values). Set validation to `tests/filtering.test.ts`.

**S-005 (Pagination)**: Refined to 5 criteria. Specified response meta shape explicitly `{ total, limit, offset, hasMore }`. Added handling for non-numeric/negative values (fall back to defaults). Added criterion for filter+pagination interaction. Set validation to `tests/pagination.test.ts`.

**S-006 (Sorting)**: Refined to 5 criteria. Clarified priority sorts by semantic urgency not alphabetically. Added criterion for sort+filter+pagination interaction. Set validation to `tests/sorting.test.ts`.

**S-007 (Auth)**: Refined to 5 criteria. Added explicit criterion that all existing /api/* test files must add X-API-Key header after this story. This is critical — implementing auth will break prior tests if they don't include the key. Set validation to `tests/auth.test.ts`.

**S-008 (Stats)**: Refined to 4 criteria. Specified exact response shape with all field types. Added criterion that endpoint requires auth (depends on S-007). Set validation to `tests/stats.test.ts`.

### Assumptions
- Each story's test file will be self-contained (creates/cleans its own test data)
- Tests will use an in-memory or temp SQLite DB via DB_PATH env var to avoid polluting data.db
- S-007 implementation must update all prior test files to include the API key header
- Priority ordering: stories are already in correct dependency order (S-001 → S-002/S-003 → S-004 → S-005 → S-006 → S-007 → S-008)

---

## Iteration 2 — Implementation (2026-03-31)
**Story**: S-001 CRUD endpoints for tasks
**Status**: Success
**Changes**:
- `src/app.ts` — added POST/GET/PUT/DELETE routes for `/api/tasks` and `/api/tasks/:id`
- `tests/tasks.test.ts` — 17 tests covering all CRUD operations (201, 200, 204, 400, 404 responses)
**Learnings**:
- Express 5 route handlers should use `res.status().json()` followed by `return` (or just avoid return-based send) since Express 5 types don't allow returning `Response`
- Tasks table already existed in `db.ts` with correct columns; no migration needed
- `getDb()` from db.ts is the pattern for accessing the database in routes
- Tests use `beforeEach` to clear the tasks table for isolation; `afterAll` closes the DB
- Response envelope pattern: `{ data: ... }` for success, `{ error: string }` for errors

---

## Iteration 3 — Implementation (2026-03-31)
**Story**: S-002 Priority field with enum constraint
**Status**: Success
**Changes**:
- `src/app.ts` — priority validation and handling already implemented in S-001 iteration
- `src/db.ts` — priority column with CHECK constraint already present from S-001
- `tests/priority.test.ts` — 7 tests covering default priority, explicit setting, all valid values, invalid value rejection on POST/PUT, and persistence
- `vitest.config.ts` — added `fileParallelism: false` to prevent cross-file test interference (shared SQLite DB)
**Learnings**:
- Priority field implementation was already done alongside S-001; this iteration mainly added dedicated tests
- Vitest runs test files in parallel by default; since all tests share the same SQLite database file, `fileParallelism: false` is required to prevent `DELETE FROM tasks` in one file's `beforeEach` from clearing data mid-test in another file
- This is a critical setting — all future test files will also share the DB and need sequential execution

---

## Iteration 4 — Implementation (2026-03-31)
**Story**: S-003 Assignee field with user tracking
**Status**: Success
**Changes**:
- `src/db.ts` — added `assigned_to` column (nullable TEXT) to CREATE TABLE and ALTER TABLE migration
- `src/app.ts` — POST and PUT endpoints now accept `assigned_to` field; added POST `/api/tasks/:id/assign` and POST `/api/tasks/:id/unassign` endpoints
- `tests/assignee.test.ts` — 9 tests covering assignment via POST/PUT, dedicated assign/unassign endpoints, 404 on non-existent task, and assigned_to in GET responses
**Learnings**:
- Migration pattern: check `PRAGMA table_info` for column existence before ALTER TABLE, same as priority column migration
- Nullable columns use `DEFAULT NULL` in SQLite; no CHECK constraint needed for free-form string fields
- Stale WAL/SHM files on data.db can cause first-test timeout; all tests still pass when run in full suite (sequential execution handles it)

---

## Iteration 5 — Implementation (2026-03-31)
**Story**: S-004 Filtering tasks by status, priority, and assignee
**Status**: Success
**Changes**:
- `src/app.ts` — modified GET /api/tasks to accept `status`, `priority`, `assigned_to` query parameters with dynamic WHERE clause building
- `tests/filtering.test.ts` — 7 tests covering individual filters, combined AND logic, invalid filter values (return empty, no error), unrecognized keys (ignored), and no-filter baseline
**Learnings**:
- Query parameter filtering uses dynamic SQL WHERE clause construction with parameterized values to prevent injection
- Invalid filter values (e.g. `?status=nonexistent`) return empty results rather than errors — this is by design per acceptance criteria
- Unrecognized query parameters are naturally ignored since only known keys are checked
- The `req.query` values from Express are typed as `string | ParsedQs | ...`; checking `typeof x === "string"` is sufficient for simple single-value params

---

## Iteration 6 — Implementation (2026-03-31)
**Story**: S-005 Pagination with limit and offset
**Status**: Success
**Changes**:
- `src/app.ts` — modified GET /api/tasks to parse `limit`/`offset` query params with defaults (20/0), cap limit at 100, handle non-numeric/negative values, add COUNT query for total, and return `{ data, meta: { total, limit, offset, hasMore } }` response shape
- `tests/pagination.test.ts` — 7 tests covering default pagination, custom limit/offset, hasMore accuracy, max limit cap, non-numeric fallback, negative value fallback, and filter+pagination interaction
**Learnings**:
- Adding `meta` to the list response does not break existing tests — they only assert on `res.body.data` which remains the array
- `parseInt(val, 10)` returns NaN for non-numeric strings; combined `isNaN || < 0` check handles both invalid and negative inputs
- COUNT query uses the same WHERE clause as the data query to ensure total reflects filtered count, not total table count

---

## Iteration 7 — Implementation (2026-03-31)
**Story**: S-006 Sorting tasks by multiple fields
**Status**: Success
**Changes**:
- `src/app.ts` — added sorting support to GET /api/tasks with `?sort=field&order=asc|desc`; allowed fields: created_at, updated_at, priority, title; default created_at desc; priority uses CASE expression for semantic urgency ordering; `id` used as tiebreaker for deterministic results
- `tests/sorting.test.ts` — 9 tests covering sort by each field in both directions, priority urgency ordering, invalid sort/order fallback, and interaction with filters+pagination
**Learnings**:
- SQLite `datetime('now')` has second-level precision — tasks created in rapid succession share the same timestamp, making sorts on created_at/updated_at non-deterministic without a tiebreaker
- Adding `id` as a secondary sort column ensures stable, deterministic ordering when primary sort values are equal
- Priority semantic ordering uses a CASE expression: urgent=4, high=3, medium=2, low=1 — this avoids alphabetical sorting which would incorrectly place "urgent" between "medium" and nothing
