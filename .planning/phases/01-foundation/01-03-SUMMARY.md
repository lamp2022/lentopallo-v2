---
phase: 01-foundation
plan: 03
subsystem: infra
tags: [github-actions, vite, css, github-pages, deploy]

# Dependency graph
requires:
  - phase: 01-01
    provides: Vite project scaffold with base URL /Lentopallo/ configured
  - phase: 01-02
    provides: TypeScript port of index.html verified pixel-perfect
provides:
  - GitHub Actions workflow deploying to GitHub Pages on push to main
  - D-05 visual refresh: softer shadows, larger radii, warmer surfaces, softened borders
affects: [all future phases using GitHub Pages hosting]

# Tech tracking
tech-stack:
  added: [actions/checkout@v4, actions/setup-node@v4, actions/configure-pages@v5, actions/upload-pages-artifact@v4, actions/deploy-pages@v4]
  patterns: [upload-pages-artifact pattern for static Vite output]

key-files:
  created: [.github/workflows/deploy.yml]
  modified: [style.css]

key-decisions:
  - "Deploy workflow uses actions/deploy-pages@v4 with id-token: write for signed artifacts"
  - "No env secrets needed at build time in Phase 1 — .env.local gitignored, Supabase keys unused"
  - "D-05 refresh kept all color hues, font sizes, tap targets, and layout unchanged — surface treatment only"

patterns-established:
  - "GitHub Actions: npm ci -> tsc --noEmit -> vite build -> upload-pages-artifact -> deploy-pages"
  - "CSS custom properties as single source of truth for tokens; only :root values changed for refresh"

requirements-completed: [MIG-04]

# Metrics
duration: 2min
completed: 2026-04-04
---

# Phase 01 Plan 03: GitHub Actions Deploy + Visual Refresh Summary

**GitHub Actions deploy-pages workflow and D-05 iOS-Settings-level CSS refresh (softer shadows, 10px court-cell radius, warmer #fafafa bg, softened borders)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-04T15:01:23Z
- **Completed:** 2026-04-04T15:02:53Z
- **Tasks:** 1 of 2 complete (Task 2 is checkpoint:human-verify — awaiting approval)
- **Files modified:** 2

## Accomplishments
- Created `.github/workflows/deploy.yml` — triggers on push to main, runs `npm ci` + `npm run build`, uploads dist/ as Pages artifact, deploys via `actions/deploy-pages@v4`
- Applied D-05 visual refresh to `style.css`: warmer bg (#fafafa), softer borders (#d1d5db), larger radii (.court-cell 10px, .btn 8px, .roster-tag 8px), box-shadows on court cells/roster tags/score buttons/picker
- `npm run build` exits 0, dist/index.html contains `/Lentopallo/assets/` paths (base URL correct)

## Task Commits

1. **Task 1: Create GitHub Actions deploy workflow and apply visual refresh** - `637f6c3` (feat)

**Plan metadata:** (pending — created after checkpoint approval)

## Files Created/Modified
- `.github/workflows/deploy.yml` - CI/CD deploy pipeline for GitHub Pages
- `style.css` - D-05 visual refresh: tokens, radii, shadows, spacing

## Decisions Made
- Used `actions/deploy-pages@v4` with `id-token: write` for signed artifact deployment (T-03-02 mitigation)
- No secrets in workflow — `.env.local` is gitignored, Supabase keys not needed at build time (T-03-01 mitigation)
- D-05 refresh: only surface tokens changed, no layout/color/font-size/tap-target changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required for this plan.

The GitHub Actions workflow will trigger automatically on next push to main. GitHub Pages environment must have Pages enabled in repo settings (Settings > Pages > Source: GitHub Actions).

## Next Phase Readiness
- Deploy pipeline ready — next push to main will trigger deployment
- Visual refresh applied — awaiting human checkpoint approval (Task 2)
- Phase 01 plan 04 (if any) can proceed after checkpoint approval

---
*Phase: 01-foundation*
*Completed: 2026-04-04*
