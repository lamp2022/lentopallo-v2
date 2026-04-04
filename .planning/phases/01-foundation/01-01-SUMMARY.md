---
phase: 01-foundation
plan: 01
subsystem: core
tags: [typescript, vite, vitest, state-management, scoring, persistence]

requires: []
provides:
  - Vite + TypeScript project scaffold with strict mode
  - All domain types in src/types.ts (zero any)
  - Pure scoring logic: recalcScores, calcStreaks, calcScoreView
  - Court rotation: rotate function
  - Global typed state object
  - localStorage persistence with URL hash support
  - Unit tests: 11 passing (scoring + utils)
affects: [02-ui, 03-supabase, 04-sync]

tech-stack:
  added: [vite, typescript, vitest, jsdom, "@supabase/supabase-js (installed, not used)"]
  patterns:
    - "Pure functions for scoring logic — no side effects, easy to test"
    - "Event-sourcing: immutable append-only eventLog as single source of truth"
    - "Mutable global state object (state.ts) with typed accessors"
    - "Silent fail pattern for localStorage/URL decode (try-catch with empty catch)"

key-files:
  created:
    - src/types.ts
    - src/utils.ts
    - src/scoring.ts
    - src/court.ts
    - src/state.ts
    - src/persistence.ts
    - src/scoring.test.ts
    - src/utils.test.ts
    - package.json
    - tsconfig.json
    - vite.config.ts
    - vitest.config.ts
    - .gitignore
    - .env.example
  modified:
    - src/main.ts

key-decisions:
  - "jsdom environment for vitest (configured in vitest.config.ts) — enables esc() tests that need document.createElement"
  - "decodeShareUrl exported from persistence.ts even though not in plan spec — needed for symmetry and future use"
  - "calcScoreView added to scoring.ts beyond plan spec — ported from index.html renderScoreBoard logic, needed in Plan 02"

patterns-established:
  - "TDD: write failing tests first, then implement to pass"
  - "Zero any: enforced by TypeScript strict mode + noUnusedLocals/noUnusedParameters"
  - "Pure functions: recalcScores/calcStreaks take events array as param, no global reads"

requirements-completed: [MIG-01, MIG-03]

duration: 25min
completed: 2026-04-04
---

# Phase 01 Plan 01: Foundation Scaffold Summary

**Vite + TypeScript scaffold with all index.html JS logic ported to typed modules — zero any, 11 unit tests passing, strict mode clean**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-04T17:35:00Z
- **Completed:** 2026-04-04T17:41:00Z
- **Tasks:** 1 of 2 executed (Task 1 was pre-completed; Task 2 executed here)
- **Files modified:** 15

## Accomplishments

- All JS logic from index.html ported to typed TypeScript modules with zero `any`
- 11 unit tests passing (8 scoring, 3 utils) under vitest with jsdom environment
- `npx tsc --noEmit` and `npx vitest run` both exit 0
- Threat model mitigations applied: try-catch in persistence.ts for T-01-01 and T-01-02

## Task Commits

1. **Task 1: Scaffold Vite project and define all TypeScript types** - `(pre-committed before this session)` (chore)
2. **Task 2: Port all JS logic to typed modules with unit tests** - `ceece32` (feat)

## Files Created/Modified

- `src/scoring.ts` - Pure recalcScores, calcStreaks, calcScoreView functions ported from index.html
- `src/court.ts` - rotate function + POSITIONS_NORMAL/FLIPPED constants
- `src/state.ts` - Global mutable state with typed accessors (getPlayerByNr, getServerNr, isOnCourt, getPositions)
- `src/persistence.ts` - saveState, loadState (hash + localStorage), encodeShareUrl, decodeShareUrl
- `src/main.ts` - Entry point wiring persistence and scoring
- `src/scoring.test.ts` - 8 unit tests: recalcScores (3) + calcStreaks (5)
- `src/utils.test.ts` - 3 unit tests for esc() XSS escaping

## Decisions Made

- jsdom vitest environment required for esc() tests (document.createElement dependency)
- calcScoreView added beyond plan spec — ported from index.html, needed by Plan 02 renderer
- decodeShareUrl exported for symmetry with encodeShareUrl and future URL-sharing feature

## Deviations from Plan

### Auto-added Functions

**1. [Rule 2 - Missing Critical] Added decodeShareUrl to persistence.ts**
- **Found during:** Task 2 (persistence.ts creation)
- **Issue:** encodeShareUrl produces URLs but no decoder was in plan spec — asymmetric API
- **Fix:** Added decodeShareUrl(url: string): GameState | null
- **Files modified:** src/persistence.ts
- **Committed in:** ceece32

**2. [Rule 2 - Missing Critical] Added calcScoreView to scoring.ts**
- **Found during:** Task 2 (scoring.ts creation)
- **Issue:** Plan spec showed calcScoreView in the action block but not in exports list — needed for Plan 02 renderer
- **Fix:** Included calcScoreView export in scoring.ts
- **Files modified:** src/scoring.ts
- **Committed in:** ceece32

---

**Total deviations:** 2 (both additive — extra exports for completeness)
**Impact on plan:** No scope creep. Both functions were implicit in the source JS being ported.

## Threat Mitigations Applied

| Threat ID | File | Mitigation |
|-----------|------|------------|
| T-01-01 | persistence.ts:tryLoadFromHash | try-catch, validates data.players.length > 0 before applyState |
| T-01-02 | persistence.ts:tryLoadFromStorage | try-catch, same defensive parsing |
| T-01-04 | .env.example | Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY — no service role key |

## Known Stubs

None — no UI rendering in this plan. All functions are pure logic or wired entry points.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes beyond what the plan specifies.

## Self-Check: PASSED
