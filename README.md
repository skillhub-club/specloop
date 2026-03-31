# Spec Loop

An autonomous two-phase AI coding loop that refines specifications before implementing them.

Inspired by the [Ralph Loop](https://github.com/snarktank/ralph) pattern — but instead of jumping straight to code, Spec Loop first ensures your specs are tight, verifiable, and right-sized.

## Why?

Ralph Loop showed that fresh-context iteration beats long conversations. But garbage specs in → garbage code out, no matter how many iterations you run.

Spec Loop adds a **spec refinement phase** that rewrites vague acceptance criteria into machine-verifiable checks *before* a single line of code is written. The result: fewer wasted iterations, clearer exit conditions, and code that actually matches intent.

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                    SPEC LOOP                        │
│                                                     │
│  Phase 1: Spec Refinement                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ while stories have refined: false             │  │
│  │   1. Fresh Claude instance reads spec.json    │  │
│  │   2. Identifies vague/untestable criteria     │  │
│  │   3. Rewrites to be machine-verifiable        │  │
│  │   4. Adds validationCommand per story         │  │
│  │   5. Marks refined: true                      │  │
│  │   → exits when all stories refined            │  │
│  └───────────────────────────────────────────────┘  │
│                       ↓                             │
│  Phase 2: Implementation                           │
│  ┌───────────────────────────────────────────────┐  │
│  │ while stories have passes: false              │  │
│  │   1. Fresh Claude instance reads spec.json    │  │
│  │   2. Reads guardrails.md (failure signs)      │  │
│  │   3. Picks highest-priority incomplete story  │  │
│  │   4. Implements, tests, validates             │  │
│  │   5. Commits + records learnings              │  │
│  │   → exits when all stories pass               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Memory between iterations:                        │
│    spec.json + progress.md + guardrails.md + git   │
└─────────────────────────────────────────────────────┘
```

Each iteration spawns a **fresh Claude Code instance** with clean context. No context rot. No accumulated confusion. The filesystem is the memory.

## Quick Start

### 1. Install dependencies

```bash
npm install -g @anthropic-ai/claude-code  # Claude Code CLI
brew install jq                            # JSON processor
```

### 2. Create a spec

Copy the example and edit it for your project:

```bash
cp spec.json.example spec.json
# Edit spec.json with your feature stories
```

Or use the `/spec` skill to generate one interactively:

```
/spec
> Add priority levels to tasks so users can sort by urgency
```

### 3. Run the loop

```bash
# Full loop: refine specs, then implement
./scripts/specloop.sh

# Skip spec refinement (your specs are already solid)
./scripts/specloop.sh --skip-spec

# Only refine specs, don't implement yet
./scripts/specloop.sh --skip-impl

# Custom iteration limits
./scripts/specloop.sh --spec-iterations 5 --impl-iterations 20
```

## File Structure

| File | Purpose |
|------|---------|
| `spec.json` | Your feature specification (stories + criteria + status) |
| `progress.md` | Append-only iteration journal (learnings persist across iterations) |
| `guardrails.md` | Discovered patterns + failure "Signs" (anti-regression memory) |
| `scripts/specloop.sh` | Main orchestrator |
| `scripts/spec-refine-prompt.md` | Phase 1 prompt |
| `scripts/implement-prompt.md` | Phase 2 prompt |
| `skills/spec/prompt.md` | `/spec` skill — generate spec.json |
| `skills/specloop/prompt.md` | `/specloop` skill — manage the loop |

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

Each story should be completable in one context window. Rule of thumb:

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

## Comparison with Ralph

| | Ralph | Spec Loop |
|---|---|---|
| Spec creation | Manual PRD | Iterative refinement loop |
| Criteria quality | Human-dependent | Machine-verified to be testable |
| Phases | 1 (implementation) | 2 (refine + implement) |
| Per-story validation | Project-level checks only | `validationCommand` per story |
| Failure memory | `progress.txt` | Structured "Signs" in `guardrails.md` |

## Credits

- [Ralph Loop](https://github.com/snarktank/ralph) by Geoffrey Huntley — the original autonomous AI coding loop
- [Open Spec](https://redreamality.com/blog/ralph-wiggum-loop-vs-open-spec/) methodology — spec-first thinking for agent workflows
