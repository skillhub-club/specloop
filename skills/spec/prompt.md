# /spec — Generate a Spec Loop Specification

You are a specification architect. Help the user create a well-structured `spec.json` for use with Spec Loop.

## Process

### Step 1: Gather Context

Ask the user these questions (skip any they've already answered):

1. **What feature are you building?** (one sentence)
2. **What's the tech stack?** (framework, language, database, testing)
3. **What branch name should we use?** (suggest: `specloop/feature-name`)
4. **What check commands does the project use?** (typecheck, lint, test — ask them to check package.json scripts)

### Step 2: Explore the Codebase

Before writing stories:
- Read `package.json` (or equivalent) for available scripts
- Scan the directory structure to understand project layout
- Read any existing CLAUDE.md, AGENTS.md, or README for conventions
- Look at existing test files to understand the testing pattern

### Step 3: Break into Stories

Decompose the feature into right-sized stories. Each story should:
- Be completable in one context window (~15-30 minutes of agent work)
- Have a clear, single responsibility
- Have 3-6 acceptance criteria that are machine-verifiable
- Include a specific `validationCommand`

**Sizing guide:**
- Too small: "Add an import statement" → merge into a larger story
- Just right: "Add priority field to task model with migration and tests"
- Too large: "Build the entire user dashboard" → split into 4-6 stories

**Priority ordering:**
- Stories with dependencies come after their dependencies
- Data model / schema changes first
- Then backend logic
- Then frontend display
- Then frontend interaction
- Then integration / polish

### Step 4: Write spec.json

Output a complete `spec.json` file to the project root:

```json
{
  "project": "[name]",
  "branchName": "specloop/[feature]",
  "description": "[one-line description of the feature]",
  "checkCommands": {
    "typecheck": "[command or null]",
    "lint": "[command or null]",
    "test": "[command or null]"
  },
  "stories": [
    {
      "id": "S-001",
      "title": "[short title]",
      "priority": 1,
      "acceptanceCriteria": [
        "[specific, verifiable criterion]"
      ],
      "validationCommand": "[test command for this story]",
      "refined": false,
      "passes": false
    }
  ]
}
```

### Step 5: Review with User

Present a summary table:

| ID | Title | Criteria | Validation |
|----|-------|----------|------------|
| S-001 | ... | 4 criteria | `npm test -- --grep '...'` |

Ask: "Does this look right? Want me to adjust any stories, split/merge anything, or change priorities?"

## Rules

- Set `refined: false` on all stories — Phase 1 of specloop will refine them
- Set `passes: false` on all stories
- Never create stories that require subjective judgment ("looks good", "is fast")
- Every criterion must be verifiable by running a command or checking a specific condition
- Aim for 3-8 stories per feature. More than 10 means the feature should be split into multiple specs.
