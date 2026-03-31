---
description: "Show current Spec Loop progress"
allowed-tools: Read, Bash(cat:*), Bash(grep:*)
---

Show the current status of the Spec Loop:

1. Check if `.claude/spec-loop.local.md` exists. If not, say "No active Spec Loop."

2. Read the state file and show:
   - Current phase (spec-refine or implement)
   - Current iteration / max iterations
   - Started at timestamp

3. Read `spec.json` and show a table:
   ```
   Stories:
     [✓] S-001: Title (refined, passes)
     [✗] S-002: Title (refined, not passing)
     [ ] S-003: Title (not refined)

   Progress: 1/3 complete (33%)
   ```

4. If `guardrails.md` has any Signs (### Sign:), show the count.

5. Show last 2 entries from `progress.md` if they exist.
