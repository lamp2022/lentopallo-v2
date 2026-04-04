# Testing

## Current State

**No testing infrastructure exists.** Zero test files, no test framework, no CI/CD pipeline.

## What Would Need Testing

| Area | Priority | Complexity |
|------|----------|------------|
| `rotate()` — position shifting logic | High | Low |
| `recalcScores()` — event log aggregation | High | Medium |
| `calcStreaks()` — consecutive score detection | High | Low |
| `loadState()` — URL hash / localStorage parsing | Medium | Medium |
| `openPicker()` — libero placement rules | Medium | High |
| `esc()` — XSS escaping | Low | Low |

## Manual Testing

- Open `index.html` in browser
- No dev server required (static file)
- State persists in localStorage between reloads
- Share link via URL hash for cross-device testing

## Planned (from PRD)

The migration to Vite + TypeScript would enable:
- Unit tests for state logic (rotation, scoring, streaks)
- Supabase integration tests
- GitHub Actions CI
