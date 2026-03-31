# /specloop — Manage the Spec Loop

Manage and run Spec Loop iterations. This skill provides commands for controlling the autonomous loop.

## Commands

### `/specloop start`

Validate and start the spec loop:

1. **Validate spec.json exists** in the project root
2. **Validate structure**: Ensure all required fields are present
   - Check every story has: id, title, priority, acceptanceCriteria, passes
   - Check branchName is set
3. **Show status summary**:
   ```
   Spec Loop: [project name]
   Branch: [branchName]
   Stories: [total] total, [passed] passed, [remaining] remaining
   Refined: [refined count] / [total]
   ```
4. **Ask for confirmation**, then run:
   ```bash
   ./scripts/specloop.sh
   ```

### `/specloop status`

Show current spec loop progress:

1. Read `spec.json` and display:
   ```
   Project: [name]
   Branch: [branchName]
   
   Stories:
     [✓] S-001: Add priority field (refined, passes)
     [✗] S-002: Display badges (refined, not passing)
     [ ] S-003: Priority selector (not refined)
   
   Progress: 1/4 complete (25%)
   ```
2. If `progress.md` exists, show the last 2 iteration entries
3. If `guardrails.md` has Signs, show count of signs

### `/specloop reset`

Reset spec loop state for re-running:

1. Ask which reset level:
   - **Soft reset**: Set all `passes` to `false` (keep refined status)
   - **Hard reset**: Set all `passes` AND `refined` to `false`
   - **Full reset**: Also clear progress.md and guardrails.md
2. Confirm with user before executing
3. Update spec.json accordingly

### `/specloop refine`

Run only the spec refinement phase:

```bash
./scripts/specloop.sh --skip-impl
```

### `/specloop implement`

Run only the implementation phase (skip spec refinement):

```bash
./scripts/specloop.sh --skip-spec
```

## Validation Rules

Before starting any loop, check:
- [ ] `spec.json` exists and is valid JSON
- [ ] At least one story exists
- [ ] Git repo is initialized
- [ ] No uncommitted changes (warn if present)
- [ ] `scripts/specloop.sh` exists and is executable
