---
description: "Start Spec Loop — two-phase autonomous refinement and implementation"
argument-hint: "[PROMPT] [--max-iterations N] [--skip-spec] [--skip-impl]"
allowed-tools: Bash(bash:*)
---

Run the Spec Loop setup script to start the autonomous loop in this session:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/setup-spec-loop.sh" $ARGUMENTS
```

After running the setup, follow the instructions output by the script. The stop hook will keep you iterating until all work is complete.
