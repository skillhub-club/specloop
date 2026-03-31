#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Spec Loop — Two-Phase Autonomous AI Coding Loop
#
# Inspired by Ralph Loop (github.com/snarktank/ralph), enhanced with
# iterative spec refinement before implementation.
#
# Phase 1: Spec Refinement — Agent reviews & improves acceptance criteria
# Phase 2: Implementation  — Agent implements stories one at a time
#
# Each iteration spawns a FRESH Claude Code instance (clean context).
# State persists via: spec.json, progress.md, guardrails.md, git history.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- Defaults ---
SPEC_ITERATIONS=3
IMPL_ITERATIONS=15
SKIP_SPEC=false
SKIP_IMPL=false

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# --- Helpers ---
log_info()    { echo -e "${BLUE}[spec-loop]${NC} $*"; }
log_success() { echo -e "${GREEN}[spec-loop]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[spec-loop]${NC} $*"; }
log_error()   { echo -e "${RED}[spec-loop]${NC} $*"; }
log_phase()   { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════${NC}"; echo -e "${BOLD}${CYAN}  $*${NC}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════════${NC}\n"; }

# --- Usage ---
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Spec Loop — Two-phase autonomous AI coding loop.

Options:
  --spec-iterations N   Max iterations for spec refinement (default: $SPEC_ITERATIONS)
  --impl-iterations N   Max iterations for implementation (default: $IMPL_ITERATIONS)
  --skip-spec           Skip Phase 1 (spec refinement)
  --skip-impl           Skip Phase 2 (implementation)
  -h, --help            Show this help message

Examples:
  $(basename "$0")                          # Run both phases with defaults
  $(basename "$0") --skip-spec              # Skip straight to implementation
  $(basename "$0") --spec-iterations 5      # More spec refinement passes
  $(basename "$0") --impl-iterations 20     # More implementation attempts
EOF
    exit 0
}

# --- Argument Parsing ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --spec-iterations)
            SPEC_ITERATIONS="$2"
            shift 2
            ;;
        --impl-iterations)
            IMPL_ITERATIONS="$2"
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
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# --- Dependency Check ---
check_deps() {
    local missing=()
    command -v claude >/dev/null 2>&1 || missing+=("claude")
    command -v jq >/dev/null 2>&1    || missing+=("jq")
    command -v git >/dev/null 2>&1   || missing+=("git")

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing[*]}"
        log_error "Install them before running spec-loop."
        [[ " ${missing[*]} " =~ " claude " ]] && log_error "  claude: npm install -g @anthropic-ai/claude-code"
        [[ " ${missing[*]} " =~ " jq " ]]    && log_error "  jq: brew install jq (or apt install jq)"
        exit 2
    fi
}

# --- File Validation ---
check_files() {
    if [[ ! -f "$PROJECT_DIR/spec.json" ]]; then
        log_error "spec.json not found in project root."
        log_error "Create one from spec.json.example or use the /spec skill."
        exit 2
    fi

    # Ensure progress.md exists
    if [[ ! -f "$PROJECT_DIR/progress.md" ]]; then
        cat > "$PROJECT_DIR/progress.md" <<'PROGRESS'
# Spec Loop Progress Journal

> Append-only log of iteration outcomes and learnings.
> Each iteration adds an entry — never edit previous entries.

---

PROGRESS
        log_info "Created progress.md"
    fi

    # Ensure guardrails.md exists
    if [[ ! -f "$PROJECT_DIR/guardrails.md" ]]; then
        cat > "$PROJECT_DIR/guardrails.md" <<'GUARD'
# Guardrails

> Patterns and signs discovered during spec loop iterations.
> Read this FIRST before starting any work.

## Codebase Patterns

<!-- Agents: add reusable patterns discovered during implementation here -->

## Signs

<!-- Agents: add warning signs here when failures occur -->
<!-- Format:
### Sign: [description]
- **Trigger**: When [condition]
- **Instruction**: [what to do instead]
- **Added after**: Iteration [N] failure
-->

GUARD
        log_info "Created guardrails.md"
    fi
}

# --- Archive Previous Run ---
maybe_archive() {
    local last_branch_file="$SCRIPT_DIR/.last-branch"
    local current_branch
    current_branch=$(jq -r '.branchName // empty' "$PROJECT_DIR/spec.json" 2>/dev/null || true)

    if [[ -z "$current_branch" ]]; then
        return
    fi

    if [[ -f "$last_branch_file" ]]; then
        local last_branch
        last_branch=$(cat "$last_branch_file")
        if [[ "$last_branch" != "$current_branch" ]]; then
            local archive_name
            archive_name="$(date +%Y-%m-%d)-${last_branch//\//-}"
            local archive_dir="$PROJECT_DIR/archive/$archive_name"
            mkdir -p "$archive_dir"

            # Archive state files
            for f in spec.json progress.md guardrails.md; do
                [[ -f "$PROJECT_DIR/$f" ]] && cp "$PROJECT_DIR/$f" "$archive_dir/"
            done

            log_info "Archived previous run ($last_branch) to archive/$archive_name/"
        fi
    fi

    echo "$current_branch" > "$last_branch_file"
}

# --- Story Status ---
print_story_status() {
    local total passed remaining
    total=$(jq '.stories | length' "$PROJECT_DIR/spec.json")
    passed=$(jq '[.stories[] | select(.passes == true)] | length' "$PROJECT_DIR/spec.json")
    remaining=$((total - passed))

    log_info "Stories: ${GREEN}$passed passed${NC} / $total total / ${YELLOW}$remaining remaining${NC}"
}

# --- Phase 1: Spec Refinement ---
run_spec_phase() {
    log_phase "PHASE 1: Spec Refinement"

    local prompt_file="$SCRIPT_DIR/spec-refine-prompt.md"
    if [[ ! -f "$prompt_file" ]]; then
        log_error "Missing: $prompt_file"
        exit 2
    fi

    for ((i = 1; i <= SPEC_ITERATIONS; i++)); do
        log_info "${BOLD}Spec Iteration $i / $SPEC_ITERATIONS${NC}"

        local unrefined
        unrefined=$(jq '[.stories[] | select(.refined != true)] | length' "$PROJECT_DIR/spec.json")
        if [[ "$unrefined" -eq 0 ]]; then
            log_success "All stories already refined. Skipping remaining spec iterations."
            break
        fi
        log_info "Unrefined stories: $unrefined"

        # Spawn fresh Claude Code instance
        local output
        output=$(cat "$prompt_file" | claude --dangerously-skip-permissions --print -p "$(cat "$prompt_file")" 2>&1) || true

        # Check for spec completion promise
        if echo "$output" | grep -q '<promise>SPEC_COMPLETE</promise>'; then
            log_success "Spec refinement complete!"
            return 0
        fi

        log_info "Spec iteration $i finished. Continuing..."
        sleep 2
    done

    log_warn "Spec refinement hit max iterations ($SPEC_ITERATIONS)."
    log_warn "Proceeding to implementation with current spec."
}

# --- Phase 2: Implementation ---
run_impl_phase() {
    log_phase "PHASE 2: Implementation"

    local prompt_file="$SCRIPT_DIR/implement-prompt.md"
    if [[ ! -f "$prompt_file" ]]; then
        log_error "Missing: $prompt_file"
        exit 2
    fi

    print_story_status

    for ((i = 1; i <= IMPL_ITERATIONS; i++)); do
        log_info "${BOLD}Implementation Iteration $i / $IMPL_ITERATIONS${NC}"

        local remaining
        remaining=$(jq '[.stories[] | select(.passes != true)] | length' "$PROJECT_DIR/spec.json")
        if [[ "$remaining" -eq 0 ]]; then
            log_success "All stories already pass!"
            return 0
        fi

        # Show which story is next
        local next_story
        next_story=$(jq -r '[.stories[] | select(.passes != true)] | sort_by(.priority) | .[0] | "\(.id): \(.title)"' "$PROJECT_DIR/spec.json")
        log_info "Next story: $next_story"

        # Spawn fresh Claude Code instance
        local output
        output=$(claude --dangerously-skip-permissions --print -p "$(cat "$prompt_file")" 2>&1) || true

        # Check for completion promise
        if echo "$output" | grep -q '<promise>COMPLETE</promise>'; then
            log_success "All stories implemented and passing!"
            print_story_status
            return 0
        fi

        print_story_status
        log_info "Implementation iteration $i finished. Continuing..."
        sleep 2
    done

    log_warn "Implementation hit max iterations ($IMPL_ITERATIONS)."
    print_story_status
    return 1
}

# ============================================================================
# Main
# ============================================================================

main() {
    log_phase "Spec Loop"
    log_info "Project: $PROJECT_DIR"

    check_deps
    check_files
    maybe_archive

    # Phase 1: Spec Refinement
    if [[ "$SKIP_SPEC" == false ]]; then
        run_spec_phase
    else
        log_info "Skipping Phase 1 (spec refinement)"
    fi

    # Phase 2: Implementation
    if [[ "$SKIP_IMPL" == false ]]; then
        run_impl_phase
        local exit_code=$?
        if [[ $exit_code -eq 0 ]]; then
            log_phase "Spec Loop Complete"
            log_success "All stories implemented successfully."
            exit 0
        else
            log_phase "Spec Loop Incomplete"
            log_warn "Some stories remain. Run again or increase --impl-iterations."
            exit 1
        fi
    else
        log_info "Skipping Phase 2 (implementation)"
    fi
}

main
