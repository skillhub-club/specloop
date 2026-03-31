#!/bin/bash
# =============================================================================
# Spec Loop — Stop Hook
#
# Intercepts Claude's exit to keep the loop running.
# Handles two phases:
#   Phase 1 (spec-refine): Loops until <promise>SPEC_COMPLETE</promise>
#   Phase 2 (implement):   Loops until <promise>COMPLETE</promise>
#
# State file: .claude/spec-loop.local.md (YAML frontmatter + prompt)
# =============================================================================

set -euo pipefail

STATE_FILE=".claude/spec-loop.local.md"

# --- No state file = no active loop, allow exit ---
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# --- Read state from YAML frontmatter ---
get_field() {
  local field="$1"
  sed -n '/^---$/,/^---$/p' "$STATE_FILE" | grep "^${field}:" | head -1 | sed "s/^${field}:[[:space:]]*//" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/"
}

ACTIVE=$(get_field "active")
ITERATION=$(get_field "iteration")
MAX_ITERATIONS=$(get_field "max_iterations")
PHASE=$(get_field "phase")
SESSION_ID=$(get_field "session_id")
SPEC_PROMISE=$(get_field "spec_promise")
IMPL_PROMISE=$(get_field "impl_promise")
SKIP_SPEC=$(get_field "skip_spec")
SKIP_IMPL=$(get_field "skip_impl")

# --- Not active, allow exit ---
if [[ "$ACTIVE" != "true" ]]; then
  exit 0
fi

# --- Session isolation: only block our own session ---
if [[ -n "${CLAUDE_CODE_SESSION_ID:-}" ]] && [[ -n "$SESSION_ID" ]] && [[ "$SESSION_ID" != "${CLAUDE_CODE_SESSION_ID}" ]]; then
  exit 0
fi

# --- Validate numeric fields ---
if ! [[ "$ITERATION" =~ ^[0-9]+$ ]]; then
  echo "⚠️ Spec Loop: Invalid iteration count, cleaning up." >&2
  rm -f "$STATE_FILE"
  exit 0
fi
if ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]]; then
  MAX_ITERATIONS=0
fi

# --- Check max iterations ---
if [[ "$MAX_ITERATIONS" -gt 0 ]] && [[ "$ITERATION" -ge "$MAX_ITERATIONS" ]]; then
  echo "🛑 Spec Loop: Max iterations ($MAX_ITERATIONS) reached." >&2
  rm -f "$STATE_FILE"
  exit 0
fi

# --- Read last assistant output from transcript ---
TRANSCRIPT="${CLAUDE_CODE_TRANSCRIPT_FILE:-}"
LAST_OUTPUT=""

if [[ -n "$TRANSCRIPT" ]] && [[ -f "$TRANSCRIPT" ]]; then
  # Extract last assistant text blocks (cap at last 200 lines for performance)
  LAST_OUTPUT=$(tail -200 "$TRANSCRIPT" | \
    grep '"type":"assistant"' | \
    tail -5 | \
    grep -o '"text":"[^"]*"' | \
    sed 's/"text":"//;s/"$//' || true)
fi

# --- Determine current promise to check ---
CURRENT_PROMISE=""
if [[ "$PHASE" == "spec-refine" ]]; then
  CURRENT_PROMISE="${SPEC_PROMISE:-SPEC_COMPLETE}"
elif [[ "$PHASE" == "implement" ]]; then
  CURRENT_PROMISE="${IMPL_PROMISE:-COMPLETE}"
fi

# --- Check for promise completion ---
if [[ -n "$CURRENT_PROMISE" ]] && [[ -n "$LAST_OUTPUT" ]]; then
  if echo "$LAST_OUTPUT" | grep -qF "<promise>${CURRENT_PROMISE}</promise>"; then
    # Promise detected!
    if [[ "$PHASE" == "spec-refine" ]]; then
      # Phase 1 complete — transition to Phase 2
      if [[ "$SKIP_IMPL" == "true" ]]; then
        echo "✅ Spec Loop: Spec refinement complete. Implementation skipped." >&2
        rm -f "$STATE_FILE"
        exit 0
      fi

      echo "✅ Spec Loop: Spec refinement complete. Transitioning to implementation..." >&2

      # Update state file: switch to Phase 2, reset iteration
      PROMPT=$(sed '1,/^---$/d' "$STATE_FILE" | sed '1,/^---$/d')
      IMPL_PROMPT_FILE="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$0")")}/scripts/prompts/implement.md"
      if [[ -f "$IMPL_PROMPT_FILE" ]]; then
        PROMPT=$(cat "$IMPL_PROMPT_FILE")
      fi

      cat > "$STATE_FILE" <<EOF
---
active: true
iteration: 1
session_id: ${CLAUDE_CODE_SESSION_ID:-}
max_iterations: $MAX_ITERATIONS
phase: implement
spec_promise: ${SPEC_PROMISE:-SPEC_COMPLETE}
impl_promise: ${IMPL_PROMISE:-COMPLETE}
skip_spec: ${SKIP_SPEC:-false}
skip_impl: ${SKIP_IMPL:-false}
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
---

$PROMPT
EOF

      # Block exit and feed Phase 2 prompt
      SYSTEM_MSG="🔄 Spec Loop — Phase 2: Implementation | Iteration 1"
      ESCAPED_PROMPT=$(echo "$PROMPT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo "\"$PROMPT\"")
      ESCAPED_MSG=$(echo "$SYSTEM_MSG" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo "\"$SYSTEM_MSG\"")

      echo "{\"decision\": \"block\", \"reason\": ${ESCAPED_PROMPT}, \"systemMessage\": ${ESCAPED_MSG}}"
      exit 0

    elif [[ "$PHASE" == "implement" ]]; then
      # Phase 2 complete — all done!
      echo "✅ Spec Loop: All stories implemented and passing!" >&2
      rm -f "$STATE_FILE"
      exit 0
    fi
  fi
fi

# --- Continue the loop: increment iteration and re-feed prompt ---
NEXT_ITERATION=$((ITERATION + 1))

# Extract prompt (everything after the second ---)
PROMPT=$(sed '1,/^---$/d' "$STATE_FILE" | sed '1,/^---$/d')

# Update iteration in state file atomically
TEMP_FILE=$(mktemp)
sed "s/^iteration:.*/iteration: $NEXT_ITERATION/" "$STATE_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$STATE_FILE"

# Build system message
if [[ "$PHASE" == "spec-refine" ]]; then
  PHASE_LABEL="Phase 1: Spec Refinement"
else
  PHASE_LABEL="Phase 2: Implementation"
fi

if [[ "$MAX_ITERATIONS" -gt 0 ]]; then
  SYSTEM_MSG="🔄 Spec Loop — ${PHASE_LABEL} | Iteration ${NEXT_ITERATION}/${MAX_ITERATIONS}"
else
  SYSTEM_MSG="🔄 Spec Loop — ${PHASE_LABEL} | Iteration ${NEXT_ITERATION}"
fi

# Block exit and re-feed prompt
ESCAPED_PROMPT=$(python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" <<< "$PROMPT" 2>/dev/null || echo "\"$PROMPT\"")
ESCAPED_MSG=$(python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" <<< "$SYSTEM_MSG" 2>/dev/null || echo "\"$SYSTEM_MSG\"")

echo "{\"decision\": \"block\", \"reason\": ${ESCAPED_PROMPT}, \"systemMessage\": ${ESCAPED_MSG}}"
