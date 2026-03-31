---
description: "Cancel an active Spec Loop"
allowed-tools: Bash(rm:*)
---

Cancel the active Spec Loop by removing the state file:

```bash
rm -f .claude/spec-loop.local.md
```

Then confirm to the user:

🛑 Spec Loop cancelled. The stop hook will no longer intercept exits.

Show a brief summary of progress if spec.json exists (stories passed vs total).
