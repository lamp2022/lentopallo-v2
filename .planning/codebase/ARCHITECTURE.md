# Architecture

**Analysis Date:** 2026-04-04

## Pattern Overview

**Overall:** Single-file monolithic application (MPA → SPA progression)

**Key Characteristics:**
- Immediate-mode rendering: full page redraw on any state change
- Event-sourcing: immutable append-only event log (eventLog) as single source of truth
- Derived state: all scores computed from eventLog, never stored directly
- Stateless localStorage: identical to in-memory state, full sync on load
- No framework, no bundler, no external dependencies

## Layers

**Presentation Layer:**
- Purpose: Render UI and handle user interaction
- Location: `index.html` lines 10–179 (HTML/CSS) + render functions
- Contains: DOM structure, styles (CSS custom properties), event handlers
- Depends on: State layer via global variables
- Used by: User interactions, touch events, form submissions

**State Management Layer:**
- Purpose: Hold in-memory game state and persist to localStorage
- Location: `index.html` lines 272–287 (variable declarations)
- Contains: `players`, `court`, `eventLog`, `scores`, `currentSet`, `serveTicks`, etc.
- Depends on: Nothing (pure data)
- Used by: All render and compute functions

**Event Log (Source of Truth):**
- Purpose: Immutable append-only record of all scoring events
- Location: `index.html` line 280: `var eventLog = []`
- Contains: Objects `{ts, set, player, delta, type, court}` — one entry per score change
- Depends on: Nothing
- Used by: `recalcScores()`, `calcStreaks()`, undo recovery

**Computation Layer:**
- Purpose: Derive all displayable data from eventLog
- Location: `index.html` functions: `recalcScores()`, `calcStreaks()`
- Contains: Score aggregation, streak calculation, per-set/per-total statistics
- Depends on: eventLog (only)
- Used by: Rendering functions to display scoreboard

**Interaction Layer:**
- Purpose: Handle user input and translate to state mutations
- Location: `index.html` functions: `addScore()`, `rotate()`, `selectPlayer()`, `clearCourt()`, etc.
- Contains: Form handlers, court cell pickers, button click handlers
- Depends on: State layer
- Used by: DOM event listeners (onclick, onchange)

**Persistence Layer:**
- Purpose: Serialize/deserialize state to/from localStorage
- Location: `index.html` functions: `saveState()`, `loadState()`
- Contains: JSON serialization of `players`, `court`, `eventLog`, `currentSet`, `serveTicks`
- Depends on: State layer
- Used by: Page load/before unload, manual save

## Data Flow

**Adding a Score:**

1. User taps +1 or −1 button (at position 1, the server)
2. `addScore(delta)` called
3. Appends to `eventLog`: `{ts: now(), set: currentSet, player: courtPlayers[1], delta: delta, type: 'serve', court: {...}}`
4. Calls `recalcScores()` — recomputes all score objects (`scores`, `serveScores`, `pointScores`) from eventLog
5. Calls `renderAll()` — redraws scoreboard, court, bench
6. `renderAll()` internally calls `saveState()` to persist

**Rotating Court:**

1. User taps "Rotaatio →" button
2. `rotate()` called
3. Shifts positions: `1→6→5→4→3→2→1`
4. Records serve tick for player who was in position 1
5. Appends event to eventLog (type: 'serve')
6. Calls `recalcScores()` → `renderAll()` → `saveState()`

**Selecting Player for Position:**

1. User taps court cell at position N
2. `openPicker(pos)` shows modal with available roster
3. If user picks a player: `selectPlayer(nr)` updates `court[pos] = nr`, appends to eventLog
4. If user records point from picker: `addPointFromPicker(nr)` appends score event
5. Either way: `renderAll()` → `saveState()`

**State Management:**
- All state is in-memory global variables. No component state.
- localStorage is kept in sync via `saveState()` (called at end of `renderAll()`).
- On page load, `loadState()` restores all variables from localStorage.
- Undo: manually delete from eventLog, recalculate, render (not yet UI-exposed).

## Key Abstractions

**Position-to-Player Map (court):**
- Purpose: Represents which player occupies each court position (1–6)
- Examples: `court = {1: 7, 2: 3, 3: 0, 4: 5, 5: 2, 6: 8}`
- Pattern: Object with position keys (integers), player number values (integers); `0` = empty

**Event Log:**
- Purpose: Complete audit trail of all scoring changes
- Examples: `{ts: 1680000000, set: 1, player: 7, delta: 1, type: 'serve', court: {...}}`
- Pattern: Append-only array. Never deleted. Enables undo, replay, statistics.

**Score Object (computed):**
- Purpose: Aggregated statistics per player
- Examples: `{player_7: {total: 12, serve: 8, point: 4, streaks: [3, 2, 1]}}`
- Pattern: Derived from eventLog in `recalcScores()`. Keyed by player number.

**Roster (players):**
- Purpose: Database of available players
- Examples: `{nr: 7, name: 'Anna', role: 'normaali'}`
- Pattern: Array of objects. Edited via form inputs. Role affects court eligibility (libero → back row only).

## Entry Points

**Page Load:**
- Location: `index.html` lines 838–879
- Triggers: Browser load, GitHub Pages serve
- Responsibilities: Restore state from localStorage, render initial UI

**User Input:**
- Scoring buttons: `addScore(+1)`, `addScore(-1)` (lines 355–372)
- Court cells: `openPicker(position)` (line 635)
- Roster form: `addPlayer()` (line 298)
- Rotate button: `rotate()` (line 797)
- All ultimately call `renderAll()` + `saveState()`

**Periodic Persistence:**
- No periodic save. Save only on state change (eager write).

## Error Handling

**Strategy:** Minimal validation + fail-safe defaults

**Patterns:**
- Player number: checked in form input `type="number"` (0–99)
- Set number: validated in `recalcScores()` — filtered by `set === currentSet || scoreViewSet === 0`
- Court position: must exist (1–6), silently ignores invalid
- Roster: duplicate numbers prevented by checking existing entries
- XSS: all user-generated content escaped via `esc(str)` before insertion to DOM

**Notable:** No try/catch. localStorage write is synchronous; failure would be a browser bug.

## Cross-Cutting Concerns

**Logging:** None currently. Future: audit events to eventLog with metadata.

**Validation:** 
- Client-side: form `type="number"`, `maxlength` attributes
- Pattern: check before appending to eventLog
- Example: `if (nr < 1 || nr > 99) return;`

**Authentication:** Not implemented. Future: Supabase Auth (magic link).

**XSS Protection:** 
- Function `esc(str)` (line 815) escapes `<`, `>`, `&`, `"`, `'`
- Used on all player names, roster tags, court display: `esc(players_by_nr[nr].name)`

---

*Architecture analysis: 2026-04-04*
