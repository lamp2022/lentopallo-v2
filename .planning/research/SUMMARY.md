# Project Research Summary

**Project:** Lentopallo — Volleyball Rotation & Statistics App
**Domain:** Offline-first PWA — vanilla JS to Vite + TypeScript + Supabase migration
**Researched:** 2026-04-04
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a migration project, not a greenfield build. A working 810-line vanilla JS app is being restructured into a Vite + TypeScript codebase with Supabase for auth and persistence. The core scoring model (append-only eventLog, event-sourcing, position-1 server logic) is sound and must be preserved — do not rewrite it. The architectural challenge is layering multi-user auth, cloud sync, and offline resilience on top of an existing data model without breaking the 2-second courtside interaction constraint.

The recommended approach is strictly incremental: TypeScript migration first (types define the contract, pure functions tested before any logic changes), then Supabase auth and schema, then offline sync, then PWA hardening, then statistics and admin UI. Each phase delivers standalone value. The dependency chain is non-negotiable — auth requires Supabase schema, stats require matched events in the DB, PWA requires a stable app to cache. Attempting to parallelize phases 1 and 2 will cause rework.

The top risks are all Phase 1 concerns: RLS misconfiguration exposing cross-club data, TypeScript `any` types silently corrupting scoring logic, localStorage-to-Supabase desync on multi-user auth, and offline sync conflicts creating duplicate events. Every one of these has a known prevention pattern; none require architectural creativity, just discipline. The one infrastructure risk (Supabase Free tier auto-pause) is trivially prevented with a GitHub Actions keep-alive ping.

## Key Findings

### Recommended Stack

The stack is fully constrained by the PRD: Vite 7.3.1 + vanilla TypeScript 6.0.2 + Supabase JS 2.101.1, hosted on GitHub Pages. All version choices have been verified against the npm registry. The critical version constraint is Vite 7 not 8 — `vite-plugin-pwa` 1.2.0 does not declare Vite 8 as a supported peer dependency. The `idb` library (IndexedDB wrapper) replaces raw localStorage for the offline event queue. No UI framework; no i18n library (30-line custom `t()` helper is sufficient for two languages).

**Core technologies:**
- Vite 7.3.1: build tool — only version compatible with `vite-plugin-pwa` 1.2.0; do not upgrade to 8.x yet
- TypeScript 6.0.2: type layer — must use `strict: true` from day one; `any` in scoring logic is unacceptable
- `@supabase/supabase-js` 2.101.1: auth + DB + RLS — ships its own types; install as monolith, no sub-packages separately
- `vite-plugin-pwa` 1.2.0 + `workbox-window` 7.4.0: PWA + service worker — Workbox handles all SW complexity; do not hand-roll
- `idb` 8.0.3: typed IndexedDB — offline event queue; localStorage is synchronous and 5MB-capped, not suitable for the queue

**Avoid:**
- Vite 8.x until `vite-plugin-pwa` explicitly supports it
- `chart.js` (6034KB); use `uplot` or inline SVG for stats charts
- `xlsx`/SheetJS (outdated, CVE history); use `papaparse` for CSV import
- Hand-written service worker; Workbox via `vite-plugin-pwa` handles all edge cases

### Expected Features

The feature set has clear tiers. Everything in the existing app is table stakes for the migrated version. Auth, offline sync, match management, team selection, and basic per-player stats are P1 for launch. Admin panel, CSV import, PWA install prompt, and i18n are P2 (trigger-based: add when a second club onboards or coaches request it). Season-trend charts and federation API are P3 (require data volume to be meaningful).

**Must have (table stakes):**
- Offline score recording and rotation — existing; must survive migration intact
- Auth (magic link) — multi-device, multi-coach use requires identity
- Supabase schema + RLS — clubs/teams/players/matches/events with club-scoped data isolation
- Offline-first sync — gym WiFi is unreliable; match cannot stop for network
- Match management (create, tag, close) — history starts here; required for stats
- Team selection after login — clubs have multiple teams
- Per-player serve statistics — immediate coaching value after data exists
- Role-based access (admin/coach) — prevents roster corruption

**Should have (competitive):**
- Serve streak visualization — `calcStreaks()` already exists; needs UI
- CSV player import — saves 20 min setup per new team
- PWA install prompt + service worker — home screen icon, true offline
- Finnish + English i18n — primary audience is Finnish-speaking

**Defer (v2+):**
- Per-set efficiency trend across multiple matches — needs 10+ matches of data
- Finnish Volleyball Federation roster import — API existence unverified (PRD §4.1)
- Viewer/player read-only role — low demand, risk of scope creep
- Real-time multi-user scoring sync — race conditions make this an anti-feature; single scorer per match is the right model

### Architecture Approach

The architecture is a layered offline-first SPA: UI modules → service layer → sync queue → localStorage cache + Supabase JS client → Supabase cloud. All business logic lives in services (game, roster, match, auth, admin), never in UI components or the sync layer. The critical path for match-day scoring is: append to in-memory eventLog → synchronous localStorage write → `renderAll()` → async enqueue for Supabase. The UI must never await a network call. Supabase is the authoritative store; localStorage is the read cache and offline write buffer. On reconnect, the sync queue flushes pending mutations via idempotent upserts keyed on client-generated `id`.

**Major components:**
1. `core/` (state.ts, sync-queue.ts, storage.ts, supabase.ts) — zero UI dependency; fully unit-testable
2. `services/` (game.ts, roster.ts, match.ts, auth.ts, admin.ts) — business logic; one domain per file
3. `ui/` (components/, views/, render.ts) — vanilla TS DOM modules; read state, call services, never touch Supabase directly
4. `sw/` — service worker config consumed by `vite-plugin-pwa`; network-first for Supabase API, cache-first for static assets
5. SyncQueue — write-through to localStorage, async flush to Supabase; offline mutations keyed by `client_temp_id` for server-side dedup

**Build order:** Types → Core → Game Service → Minimal UI (game loop proven offline) → Auth → SyncQueue → Roster → Match → SW/PWA → i18n → Admin. Each step is independently testable.

### Critical Pitfalls

1. **RLS misconfiguration (service role key in client code)** — never expose `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_*` env var; test RLS with two real authenticated users in separate browser sessions before any data goes in
2. **TypeScript `any` in scoring logic** — define all domain types (`Event`, `Court`, `Player`, `ScoreMap`) before porting a single function; `strict: true` from day one; write unit tests for `recalcScores()` and `calcStreaks()` against a fixed fixture
3. **localStorage/Supabase desync after auth** — namespace all localStorage keys by team ID (`lp_court_{teamId}`); clear on logout; treat Supabase as source of truth, localStorage as cache
4. **Offline sync conflicts** — events table is append-only (no updates, no deletes); use `client_temp_id` for local dedup, let server assign canonical IDs; enforce single scorer per active match
5. **GitHub Pages auth redirect failure** — magic link redirect URL must point to exact GitHub Pages root; hash-based routing only (`/#/`); test end-to-end on the production URL before building any protected routes
6. **Supabase Free tier auto-pause** — add GitHub Actions weekly keep-alive ping immediately after project creation; document for club admin

## Implications for Roadmap

Based on research, the dependency chain enforces 4 phases. Phases cannot be reordered.

### Phase 1: Foundation — TypeScript Migration + Supabase Auth + Offline Sync

**Rationale:** Everything else depends on this. Types must exist before logic is ported. Auth must exist before any multi-user feature. The offline sync model must be locked before match data accumulates (retroactively fixing sync conflicts is costly). All 6 critical pitfalls from PITFALLS.md are Phase 1 concerns.

**Delivers:** Working Vite + TypeScript app with Supabase auth, schema, RLS, offline event queue, and match management. Feature parity with current app plus auth and persistence.

**Addresses:** Auth, Supabase schema + RLS, offline-first sync, match management, team selection, role-based access (all P1 features from FEATURES.md)

**Avoids:** RLS bypass, `any` type drift in scoring, localStorage desync, offline sync conflicts, auth redirect failure, Free tier pause

**Research flag:** Needs phase research — Supabase RLS patterns and `supabase.auth.onAuthStateChange()` signature should be verified against current v2 docs before starting.

### Phase 2: Statistics + Player Management

**Rationale:** Stats are only meaningful once match data exists in Supabase. This phase builds on the event pipeline established in Phase 1. Roster management (CSV import) and per-player statistics are natural complements — both operate on the same player/events data.

**Delivers:** Per-player serve statistics (points per set/match/season, streaks), per-team statistics, CSV player import, serve streak visualization.

**Addresses:** Per-player serve stats, CSV import, per-team statistics (P1/P2 features from FEATURES.md). Streak visualization uses existing `calcStreaks()` — new UI only.

**Uses:** `papaparse` for CSV import, `uplot` or inline SVG for charts (not `chart.js`)

**Avoids:** Over-engineering stats before data volume exists; adding trend charts before 5+ matches in DB

**Research flag:** Standard patterns — SQL aggregation for volleyball stats is well-documented; no deep research needed.

### Phase 3: PWA + Offline Hardening

**Rationale:** Service worker is added after the core app and sync are stable. Adding SW before the app is stable means debugging two unknowns simultaneously. This phase hardens offline behavior, adds install prompt, and resolves the SW update flow for match-day safety.

**Delivers:** Installable PWA (home screen icon, offline app shell), SW update prompt (non-disruptive to active matches), background sync registration.

**Addresses:** PWA install prompt, service worker, offline hardening (P2 features from FEATURES.md)

**Uses:** `vite-plugin-pwa` 1.2.0 + `workbox-window` 7.4.0; `registerType: 'prompt'` (not `autoUpdate`) to avoid disrupting live matches

**Avoids:** Stale SW caching bug (Pitfall 4); `autoUpdate` forcing reload mid-match

**Research flag:** Standard patterns — Workbox/vite-plugin-pwa is well-documented; verify iOS Safari `SyncManager` support before relying on Background Sync API.

### Phase 4: Admin Panel + i18n + Polish

**Rationale:** Admin panel depends on all services being stable. i18n is deferred because string keys can be Finnish literals until this point — adding it late is low-cost (30-line helper, no library migration needed). This phase prepares for second-club onboarding.

**Delivers:** Admin panel (user + team management), Finnish + English language support, audit logging UI, rate limiting via Edge Functions.

**Addresses:** Admin panel, i18n fi/en, audit log UI, rate limiting (P2/P3 features from FEATURES.md)

**Avoids:** Premature internationalization overhead; admin complexity blocking Phase 1-3 delivery

**Research flag:** Admin panel is standard CRUD — no research needed. Edge Function rate limiting should verify current Supabase Edge Function Deno runtime docs.

### Phase Ordering Rationale

- Auth before stats: statistics require authenticated match data in Supabase
- Game loop before auth: proving the TypeScript migration works offline first reduces integration risk
- Sync before PWA: service worker wraps a stable sync layer; adding SW before sync is proven creates compounding debug complexity
- Types before everything: PITFALLS.md is unambiguous — `any` in scoring logic has HIGH recovery cost; type-first is non-negotiable
- Admin last: admin depends on all services; low priority for match-day operation

### Research Flags

Phases needing deeper research during planning:
- **Phase 1:** Supabase RLS v2 policy syntax, `supabase.auth.onAuthStateChange()` signature, and iOS Safari `SyncManager` availability — training data is August 2025 cutoff; verify against current Supabase docs
- **Phase 3:** Verify iOS Safari Background Sync API (`SyncManager`) support before relying on it; fallback to `navigator.onLine` event is required if unavailable

Phases with standard patterns (skip research-phase):
- **Phase 2:** SQL aggregation for statistics, `papaparse` CSV import — well-documented, stable APIs
- **Phase 4:** Admin CRUD, 30-line i18n pattern — no novel technology

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against live npm registry on 2026-04-04; compatibility matrix explicitly checked |
| Features | MEDIUM | PRD and CLAUDE.md are authoritative; competitor analysis (TeamSnap, GameChanger) is training-data only — verify before using for positioning |
| Architecture | MEDIUM | Patterns (event-sourcing, offline-first, Workbox) are well-established; Supabase v2 API signatures should be verified at integration time |
| Pitfalls | MEDIUM | GitHub Pages routing and Supabase Free tier pause policy are stable/well-documented (HIGH); Supabase RLS internals and SW update behavior are training-data based (MEDIUM) |

**Overall confidence:** MEDIUM-HIGH — stack is verified, architecture is principled, pitfall prevention is actionable. Main uncertainty is Supabase API surface details that should be checked against current docs in Phase 1.

### Gaps to Address

- **Supabase Free tier pause policy:** Verify current pause threshold (research states 1 week inactivity) against current Supabase dashboard before project creation. Add keep-alive CI immediately.
- **iOS Safari `SyncManager` support:** Check Can I Use or MDN before Phase 3. Navigator.onLine fallback is required regardless.
- **Finnish Volleyball Federation API:** PRD §4.1 flags this as unverified. Do not plan for it until API existence is confirmed.
- **Club size assumption:** "2-15 teams" is an estimate. Validate with actual club admin before over-engineering multi-team UI.
- **Competitor analysis:** TeamSnap/GameChanger feature comparison is training-data based. Verify against current product pages before any positioning decisions.

## Sources

### Primary (HIGH confidence)
- npm registry (live, 2026-04-04): all version numbers verified directly
- `docs/PRD.md`: schema, RLS rules, migration phases, stack decisions
- `CLAUDE.md`: architecture constraints, UI rules, no-framework constraint
- `.planning/PROJECT.md`: validated requirements, out-of-scope decisions

### Secondary (MEDIUM confidence)
- Supabase JS v2 documentation (training data, August 2025 cutoff) — auth patterns, RLS structure, Edge Functions
- Workbox / vite-plugin-pwa patterns (training data) — SW update lifecycle, cache strategies
- Offline-first web app patterns — Jake Archibald / Google Workbox (well-established, HIGH confidence for patterns; MEDIUM for specific API signatures)

### Tertiary (LOW confidence)
- TeamSnap, GameChanger, DataVolley feature comparison — training data; needs validation against current product pages before use in positioning

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
