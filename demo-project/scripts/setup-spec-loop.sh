#!/bin/bash
# =============================================================================
# Spec Loop — Setup Script
# Creates state file and initializes the loop in the current session.
# =============================================================================

set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# --- Parse arguments ---
PROMPT_PARTS=()
MAX_ITERATIONS=0
SKIP_SPEC=false
SKIP_IMPL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      cat << 'HELP_EOF'
Spec Loop — Two-phase autonomous AI loop

USAGE:
  /spec-loop [OPTIONS] PROMPT...

ARGUMENTS:
  PROMPT...    Task description (multiple words without quotes OK)

OPTIONS:
  --max-iterations <n>   Max total iterations across both phases (default: unlimited)
  --skip-spec            Skip Phase 1 (spec refinement), go straight to implementation
  --skip-impl            Only refine specs, don't implement
  -h, --help             Show this help

PHASES:
  Phase 1 — Spec Refinement:
    Reviews spec.json, rewrites vague criteria to be machine-verifiable.
    Exits when: <promise>SPEC_COMPLETE</promise>

  Phase 2 — Implementation:
    Picks highest-priority incomplete story, implements, tests, commits.
    Exits when: <promise>COMPLETE</promise>

PREREQUISITES:
  spec.json must exist in project root (use /spec to create one)

EXAMPLES:
  /spec-loop Implement the task priority feature
  /spec-loop --skip-spec Implement all stories from spec.json
  /spec-loop --max-iterations 20 Build the priority system
  /spec-loop --skip-impl Review and refine the spec only

STOPPING:
  /cancel-spec-loop    Cancel the active loop

MONITORING:
  /spec-loop-status    Show current progress
  grep '^iteration:' .claude/spec-loop.local.md
HELP_EOF
      exit 0
      ;;
    --max-iterations)
      if [[ -z "${2:-}" ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
        echo "❌ Error: --max-iterations requires a positive integer" >&2
        exit 1
      fi
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    --skip-spec)
      SKIP_SPEC=true
      shift
      ;;
    --skip-impl)
      SKIP_IMPL=true
      shift
      ;;
    *)
      PROMPT_PARTS+=("$1")
      shift
      ;;
  esac
done

PROMPT="${PROMPT_PARTS[*]:-}"

# --- Validate ---
if [[ ! -f "spec.json" ]]; then
  echo "❌ Error: spec.json not found in project root." >&2
  echo "" >&2
  echo "   Create one with: /spec" >&2
  echo "   Or copy the example: cp spec.json.example spec.json" >&2
  exit 1
fi

# Validate spec.json is valid JSON
if ! python3 -c "import json; json.load(open('spec.json'))" 2>/dev/null; then
  echo "❌ Error: spec.json is not valid JSON" >&2
  exit 1
fi

# Check stories exist
STORY_COUNT=$(python3 -c "import json; print(len(json.load(open('spec.json')).get('stories', [])))" 2>/dev/null || echo "0")
if [[ "$STORY_COUNT" -eq 0 ]]; then
  echo "❌ Error: spec.json has no stories" >&2
  exit 1
fi

# --- Determine starting phase ---
if [[ "$SKIP_SPEC" == "true" ]]; then
  START_PHASE="implement"
  PROMPT_FILE="$PLUGIN_ROOT/scripts/prompts/implement.md"
else
  START_PHASE="spec-refine"
  PROMPT_FILE="$PLUGIN_ROOT/scripts/prompts/spec-refine.md"
fi

# --- Load phase prompt ---
PHASE_PROMPT=""
if [[ -f "$PROMPT_FILE" ]]; then
  PHASE_PROMPT=$(cat "$PROMPT_FILE")
fi

# Append user's custom prompt if provided
if [[ -n "$PROMPT" ]]; then
  PHASE_PROMPT="${PHASE_PROMPT}

---

## Additional Context from User

${PROMPT}"
fi

# --- Ensure progress files exist ---
if [[ ! -f "progress.md" ]]; then
  cat > "progress.md" <<'EOF'
# Spec Loop Progress Journal

> Append-only log of iteration outcomes and learnings.
> Each iteration adds an entry below — **never edit or remove previous entries**.

---
EOF
fi

if [[ ! -f "guardrails.md" ]]; then
  cat > "guardrails.md" <<'EOF'
# Guardrails

> Patterns and signs discovered during spec loop iterations.
> **Read this FIRST** before starting any work.

## Codebase Patterns

## Signs
EOF
fi

# --- Create state file ---
mkdir -p .claude

cat > ".claude/spec-loop.local.md" <<EOF
---
active: true
iteration: 1
session_id: ${CLAUDE_CODE_SESSION_ID:-}
max_iterations: $MAX_ITERATIONS
phase: $START_PHASE
spec_promise: SPEC_COMPLETE
impl_promise: COMPLETE
skip_spec: $SKIP_SPEC
skip_impl: $SKIP_IMPL
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
---

$PHASE_PROMPT
EOF

# --- Story summary ---
PASSED=$(python3 -c "import json; d=json.load(open('spec.json')); print(sum(1 for s in d.get('stories',[]) if s.get('passes')))" 2>/dev/null || echo "?")
REFINED=$(python3 -c "import json; d=json.load(open('spec.json')); print(sum(1 for s in d.get('stories',[]) if s.get('refined')))" 2>/dev/null || echo "?")

# --- Output ---
cat <<EOF
🔄 Spec Loop activated!

Phase: $(if [[ "$START_PHASE" == "spec-refine" ]]; then echo "1 — Spec Refinement"; else echo "2 — Implementation"; fi)
Stories: $STORY_COUNT total | $PASSED passed | $REFINED refined
Max iterations: $(if [[ $MAX_ITERATIONS -gt 0 ]]; then echo $MAX_ITERATIONS; else echo "unlimited"; fi)

The stop hook will keep Claude running through iterations.
Each iteration works on one story with fresh focus.

To monitor:  /spec-loop-status
To cancel:   /cancel-spec-loop
EOF

if [[ "$START_PHASE" == "spec-refine" ]]; then
  cat <<EOF

═══════════════════════════════════════════════════════════
PHASE 1 — SPEC REFINEMENT
═══════════════════════════════════════════════════════════

Review spec.json and refine acceptance criteria to be machine-verifiable.
When ALL stories have refined: true, output:
  <promise>SPEC_COMPLETE</promise>

DO NOT output the promise until every story genuinely has
clear, testable acceptance criteria. Trust the process.
═══════════════════════════════════════════════════════════
EOF
else
  cat <<EOF

═══════════════════════════════════════════════════════════
PHASE 2 — IMPLEMENTATION
═══════════════════════════════════════════════════════════

Read guardrails.md FIRST. Then pick the highest-priority
incomplete story from spec.json, implement it, test it, commit it.

When ALL stories have passes: true, output:
  <promise>COMPLETE</promise>

ONE story per iteration. Do NOT rush to complete everything at once.
═══════════════════════════════════════════════════════════
EOF
fi

echo ""
echo "$PHASE_PROMPT"
