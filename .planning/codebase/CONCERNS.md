# Concerns

## Technical Debt

- **Monolithic single file**: All 890 lines in `index.html` — CSS, HTML, JS interleaved. No module boundaries.
- **ES5-only patterns**: `var` everywhere, string concatenation for HTML, no modern JS features. Makes refactoring harder.
- **No TypeScript**: Zero type safety on state objects (`players`, `court`, `eventLog`).
- **Full re-render on every change**: `renderAll()` rebuilds entire DOM. Works at current scale but won't scale.
- **Global mutable state**: 12+ top-level `var` declarations with no encapsulation.

## Known Bugs / Edge Cases

- **Streak calculation resets on any player**: `calcStreaks()` (line 427) resets `cur` to 0 whenever *any* player scores, not just the tracked player. The `else` branch at line 435 sets `cur = 0` unconditionally.
- **Player number edits break event history**: `editNr()` updates `court` map but `eventLog` entries retain old player number. Historical stats become orphaned.
- **No undo**: Score events are append-only. Misclicks require workaround.

## Security

- **XSS mitigated**: `esc()` function used consistently for player names. Good.
- **URL hash data not validated**: `loadState()` trusts decoded JSON structure without schema validation. Malformed data could crash the app.
- **`btoa`/`atob` unsafe for Unicode**: `copyLink()` uses `btoa(unescape(encodeURIComponent()))` which works but is fragile. Non-ASCII names could cause issues in edge cases.
- **No authentication**: Anyone with the link can see/modify the game state.

## Performance

- **Unbounded `eventLog`**: Array grows without limit during a game session. Long games accumulate hundreds of deep-cloned court snapshots (`JSON.parse(JSON.stringify(court))`).
- **Full innerHTML replacement**: Every `renderAll()` call destroys and recreates all DOM nodes. Input focus is lost.
- **No debouncing**: Rapid button clicks create multiple events.

## Fragile Areas

- **Hardcoded rotation**: `rotate()` manually chains `court[1] = court[2]; court[2] = court[3]...` — easy to break if positions change.
- **Libero placement logic**: Complex conditional in `openPicker()` (lines 648–660) with multiple role checks. No tests to verify edge cases.
- **Confirmation state**: Global booleans `confirmingClear` / `confirmingNewGame` with setTimeout resets — race conditions possible with rapid clicks.
- **Court snapshot in events**: Each event stores full court state copy. Storage-heavy and redundant.

## Scaling Limits

- **localStorage only**: ~5MB browser limit. No cloud sync, no multi-device.
- **Hardcoded 10-player max**: `if (players.length >= 10) return;` in `addPlayer()`.
- **Single game at a time**: No concept of game history or multiple teams.
- **No offline-first design**: Despite being a local app, no Service Worker or explicit offline strategy.

## Missing Features (from PRD)

- Authentication (magic link planned)
- Multi-team support
- Supabase backend
- Event undo
- Data export/import
