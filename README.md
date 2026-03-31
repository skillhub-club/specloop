# Spec Loop

A Claude Code plugin that runs an autonomous two-phase AI loop: refine specifications into machine-verifiable criteria, then implement them iteratively.

Inspired by the [Ralph Loop](https://github.com/snarktank/ralph) pattern — but instead of jumping straight to code, Spec Loop first ensures your specs are tight, verifiable, and right-sized.

## Install

```bash
# From Claude Code marketplace (coming soon)
/plugin marketplace add specloop/spec-loop

# Or install manually
/plugin install /path/to/specloop
```

## Quick Start

```bash
# 1. Generate a spec from a feature idea
/spec Add priority levels to tasks

# 2. Start the loop (refine specs → implement)
/spec-loop Implement the priority feature

# 3. Monitor progress
/spec-loop-status

# 4. Cancel if needed
/cancel-spec-loop
```

That's it. Spec Loop will keep Claude running — refining your specs, then implementing stories one by one — until everything passes.

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                    SPEC LOOP                        │
│                                                     │
│  Phase 1: Spec Refinement                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ Stop hook keeps Claude iterating:             │  │
│  │   1. Reads spec.json + codebase              │  │
│  │   2. Identifies vague/untestable criteria     │  │
│  │   3. Rewrites to be machine-verifiable        │  │
│  │   4. Adds validationCommand per story         │  │
│  │   5. Marks refined: true                      │  │
│  │   → <promise>SPEC_COMPLETE</promise>          │  │
│  └───────────────────────────────────────────────┘  │
│                       ↓                             │
│  Phase 2: Implementation                           │
│  ┌───────────────────────────────────────────────┐  │
│  │ Stop hook keeps Claude iterating:             │  │
│  │   1. Reads guardrails.md (failure signs)      │  │
│  │   2. Picks highest-priority incomplete story  │  │
│  │   3. Implements, tests, validates             │  │
│  │   4. Commits + records learnings              │  │
│  │   → <promise>COMPLETE</promise>               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Memory between iterations:                        │
│    spec.json + progress.md + guardrails.md + git   │
└─────────────────────────────────────────────────────┘
```

The **Stop hook** intercepts Claude's exit attempts and re-feeds the prompt, creating a self-referential loop. Claude sees its previous work in files and git, giving it fresh context each iteration without context rot.

## Commands

| Command | Description |
|---------|-------------|
| `/spec [description]` | Generate a spec.json from a feature idea |
| `/spec-loop [prompt] [options]` | Start the autonomous loop |
| `/spec-loop-status` | Show current progress |
| `/cancel-spec-loop` | Cancel an active loop |

### /spec-loop Options

```
--max-iterations N   Max total iterations (default: unlimited)
--skip-spec          Skip Phase 1, go straight to implementation
--skip-impl          Only refine specs, don't implement
```

### Examples

```bash
# Full loop: refine specs → implement all stories
/spec-loop Implement the user dashboard feature

# Already have good specs? Skip refinement
/spec-loop --skip-spec Implement all stories from spec.json

# Just refine, review before implementing
/spec-loop --skip-impl Review and tighten the spec

# Safety limit on iterations
/spec-loop --max-iterations 20 Build the priority system
```

## Plugin Structure

```
spec-loop/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── commands/
│   ├── spec-loop.md             # /spec-loop command
│   ├── spec.md                  # /spec command
│   ├── spec-loop-status.md      # /spec-loop-status command
│   └── cancel-spec-loop.md      # /cancel-spec-loop command
├── hooks/
│   ├── hooks.json               # Stop hook registration
│   └── stop-hook.sh             # Loop continuation logic
├── scripts/
│   ├── setup-spec-loop.sh       # Loop initialization
│   └── prompts/
│       ├── spec-refine.md       # Phase 1 prompt template
│       └── implement.md         # Phase 2 prompt template
├── spec.json.example            # Example spec format
└── README.md
```

## spec.json Format

```json
{
  "project": "MyApp",
  "branchName": "specloop/feature-name",
  "description": "What this feature does",
  "checkCommands": {
    "typecheck": "npm run typecheck",
    "lint": "npm run lint",
    "test": "npm test"
  },
  "stories": [
    {
      "id": "S-001",
      "title": "Add priority field to task model",
      "priority": 1,
      "acceptanceCriteria": [
        "Migration adds 'priority' column with enum: high | medium | low",
        "Default value is 'medium'",
        "Unit test verifies priority defaults"
      ],
      "validationCommand": "npm test -- --grep 'priority'",
      "refined": false,
      "passes": false
    }
  ]
}
```

## Story Sizing

Each story should be completable in one context window:

| Size | Example | Verdict |
|------|---------|---------|
| Too small | "Add an import" | Merge into larger story |
| Right | "Add priority field with migration + tests" | Good |
| Too large | "Build entire dashboard" | Split into 4-6 stories |

## Guardrails & Signs

When an iteration fails, the agent writes a **Sign** to `guardrails.md`:

```markdown
### Sign: Don't use raw SQL for migrations
- **Trigger**: When adding database columns
- **Instruction**: Use the ORM's migration tool (prisma migrate dev)
- **Added after**: Iteration failure on S-001
```

Future iterations read guardrails first, avoiding the same mistakes. This is the loop's "hippocampus" — file-based learning across fresh contexts.

## Comparison with Ralph Loop

| | Ralph Loop | Spec Loop |
|---|---|---|
| Spec creation | Manual PRD | Iterative refinement loop |
| Criteria quality | Human-dependent | Machine-verified to be testable |
| Phases | 1 (implement) | 2 (refine + implement) |
| Per-story validation | Project-level checks | `validationCommand` per story |
| Failure memory | `progress.txt` | Structured "Signs" in `guardrails.md` |
| Distribution | Plugin or bash script | Claude Code plugin with Stop hook |
| Phase transitions | Manual | Automatic (stop hook handles it) |

## Also Available: Standalone Script

If you prefer the bash-script approach (spawning separate Claude processes), the `scripts/specloop.sh` orchestrator is also included. See [CLAUDE.md](CLAUDE.md) for standalone usage.

## Credits

- [Ralph Loop](https://github.com/snarktank/ralph) by Geoffrey Huntley — the original autonomous AI coding loop
- [Open Spec](https://redreamality.com/blog/ralph-wiggum-loop-vs-open-spec/) methodology — spec-first thinking for agent workflows
