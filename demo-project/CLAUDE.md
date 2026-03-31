# Spec Loop

Spec Loop is an autonomous two-phase AI coding loop that iterates on both **specification refinement** and **implementation**.

Inspired by the [Ralph Loop](https://github.com/snarktank/ralph) pattern, with a critical addition: it refines specs before coding.

## How It Works

**Phase 1 — Spec Refinement**: A fresh Claude Code instance reviews `spec.json`, identifies vague or untestable acceptance criteria, and rewrites them to be machine-verifiable. Repeats until all stories are refined.

**Phase 2 — Implementation**: A fresh Claude Code instance picks the highest-priority incomplete story, implements it, validates via tests, commits, and records learnings. Repeats until all stories pass.

Each iteration spawns a **new Claude Code instance** with clean context. State persists through files, not conversation history.

## File Structure

| File | Purpose |
|------|---------|
| `spec.json` | Structured specification with stories, criteria, and status |
| `progress.md` | Append-only journal of iteration outcomes and learnings |
| `guardrails.md` | Discovered patterns and failure "Signs" to prevent regressions |
| `scripts/specloop.sh` | Main orchestrator bash script |
| `scripts/spec-refine-prompt.md` | Phase 1 prompt template |
| `scripts/implement-prompt.md` | Phase 2 prompt template |
| `skills/spec/prompt.md` | Skill to generate spec.json from feature description |
| `skills/specloop/prompt.md` | Skill to manage the loop |

## spec.json Schema

```json
{
  "project": "string — project name",
  "branchName": "string — git branch for this feature",
  "description": "string — what this feature does",
  "checkCommands": {
    "typecheck": "command to run typecheck (optional)",
    "lint": "command to run linter (optional)",
    "test": "command to run tests (optional)"
  },
  "stories": [
    {
      "id": "S-001",
      "title": "Short description of the story",
      "priority": 1,
      "acceptanceCriteria": ["list of verifiable criteria"],
      "validationCommand": "specific test command for this story",
      "refined": false,
      "passes": false
    }
  ]
}
```

## Running

```bash
# Full loop (spec refinement + implementation)
./scripts/specloop.sh

# Skip spec refinement (already have good specs)
./scripts/specloop.sh --skip-spec

# Custom iteration limits
./scripts/specloop.sh --spec-iterations 5 --impl-iterations 20
```

## Story Sizing Guide

Stories should be completable in one context window. Good examples:
- Add a database column with migration
- Implement a single API endpoint
- Build one UI component
- Add validation logic to a form

Too large (split these):
- "Build the entire dashboard"
- "Implement auth system"
- "Refactor the API layer"

## When Running Inside the Loop

If you are a Claude Code instance spawned by spec-loop, follow the prompt instructions piped to you. This CLAUDE.md is supplementary context — the prompt takes priority.
