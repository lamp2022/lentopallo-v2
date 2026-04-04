# Conventions

## Code Style

- **No framework**: Pure vanilla JS, no build step, no dependencies
- **`var` only**: No `let`/`const` used anywhere — legacy ES5 style
- **String concatenation**: HTML built with `+` operator, no template literals
- **Semicolons**: Always used
- **Indentation**: 2 spaces

## Function Patterns

- **Verb-first naming**: `renderAll()`, `addScore()`, `openPicker()`, `clearPos()`
- **`render*` prefix**: Functions that update DOM (`renderCourt`, `renderRoster`, `renderBench`, `renderScoreBoard`, `renderScoreBtns`, `renderSetBar`)
- **Early returns**: Used for validation (`if (!nr || nr < 1 || nr > 99) return;`)
- **Inline event handlers**: `onclick` attributes in HTML strings, not `addEventListener` (except for keyboard events on inputs)

## DOM Manipulation

- **`getElementById` exclusively**: No `querySelector` usage
- **`innerHTML` for bulk updates**: All render functions replace entire innerHTML
- **`classList.toggle`**: Used for show/hide (`collapsed`, `open`, `active`)
- **No DOM diffing**: Full re-render on every state change via `renderAll()`

## Error Handling

- **Silent fail pattern**: `try-catch` blocks with empty catch for localStorage and URL decode
- **Validation at entry points**: `addPlayer()` validates number range, duplicates, max count
- **No error UI**: Errors silently ignored, no user-facing error messages

## XSS Safety

- **`esc()` function** (line 815): Creates DOM text node to safely escape user input
- **Required for all user-generated content**: Player names always passed through `esc()`

## State Management

- **Global variables**: All state in top-level `var` declarations
- **Immutable pattern for court snapshots**: `JSON.parse(JSON.stringify(court))` in event log
- **Render-everything pattern**: Call `renderAll()` after any state change
- **Auto-save**: `renderAll` wrapped to call `saveState()` on every invocation (line 879–880)

## Confirmation Pattern

- **Two-tap destructive actions**: `confirmingClear` / `confirmingNewGame` boolean flags
- **3-second timeout**: Confirmation state resets after 3000ms via `setTimeout`
- **Visual feedback**: Button text and border color change to red during confirmation

## UI Color Convention

- Green (`--green`): Positive actions, scores
- Red (`--red`): Negative/destructive actions
- Blue (`--blue`): Navigation, primary actions
- Amber (`--amber`): Serve ticks, streaks
