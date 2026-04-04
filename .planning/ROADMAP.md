# Roadmap: Lentopallo

## Overview

Migration of a working 810-line vanilla JS volleyball app to Vite + TypeScript + Supabase. The dependency chain is strict: types and schema must exist before auth, auth before sync, sync before stats, stats before admin. Each phase delivers a standalone capability; nothing is partially built. The app must work offline at every phase boundary — the 2-second courtside constraint is non-negotiable throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Vite + TypeScript migration with Supabase schema and GitHub Pages deployment
- [ ] **Phase 2: Auth & Access** - Magic link auth, club-scoped RLS, team selection after login
- [ ] **Phase 3: Game Loop & Sync** - Offline scoring with IndexedDB queue and Supabase sync
- [ ] **Phase 4: Statistics & Roster** - Per-player/team stats, CSV import, RLS isolation testing
- [ ] **Phase 5: Admin & Polish** - Admin panel, i18n, rate limiting, Edge Function keep-alive

## Phase Details

### Phase 1: Foundation
**Goal**: A deployable Vite + TypeScript app on GitHub Pages with Supabase schema and RLS in place
**Depends on**: Nothing (first phase)
**Requirements**: MIG-01, MIG-02, MIG-03, MIG-04, DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. App builds via `npm run build` and deploys to GitHub Pages without errors
  2. All existing features (rotation, scoring, roster, event log) work identically in the TypeScript build
  3. TypeScript strict mode passes with zero `any` types in scoring and stats logic
  4. Supabase schema (clubs, teams, players, team_players, matches, events, profiles) exists with RLS policies, CHECK constraints, and indexes applied
**Plans:** 3/4 plans executed
Plans:
- [x] 01-01-PLAN.md — Scaffold Vite + TS project, define types, port logic with unit tests
- [x] 01-02-PLAN.md — Port HTML/CSS/rendering to typed modules, pixel-perfect clone
- [x] 01-03-PLAN.md — GitHub Actions deploy workflow and visual refresh
- [x] 01-04-PLAN.md — Supabase schema migration (SQL file with RLS, constraints, indexes)
**UI hint**: yes

### Phase 2: Auth & Access
**Goal**: Users can authenticate via magic link, see only their club's data, and select a team before scoring
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ROLE-01, ROLE-02, ROLE-03, ROLE-04, UI-07
**Success Criteria** (what must be TRUE):
  1. Admin receives invite link, clicks it, and gains access to their club — no other club's data is visible
  2. Coach logs in via magic link and session persists across browser refresh
  3. Magic link redirect lands correctly on the GitHub Pages production URL
  4. No Supabase service role key appears anywhere in the built client bundle
  5. After login, user sees a team selection screen and can enter the scoring view for their team
**Plans**: TBD
**UI hint**: yes

### Phase 3: Game Loop & Sync
**Goal**: Coaches can score a live match offline; events sync to Supabase automatically when connectivity returns
**Depends on**: Phase 2
**Requirements**: MATCH-01, MATCH-02, MATCH-03, MATCH-04, MATCH-05, MATCH-06, SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, SEC-01, SEC-02, SEC-04, SEC-06
**Success Criteria** (what must be TRUE):
  1. Coach creates a match, scores 10 serve events while airplane mode is on, reconnects — all events appear in Supabase with no duplicates
  2. Scoring a serve point takes under 2 seconds from tap to visible score update (no network await on critical path)
  3. Online/offline status indicator updates correctly when toggling network on iOS Safari
  4. Court grid is fully visible without scrolling on a 375px screen; all tap targets are at least 48px
  5. Destructive actions (clear court, new game) require two taps to confirm
**Plans**: TBD
**UI hint**: yes

### Phase 4: Statistics & Roster
**Goal**: Coaches can view per-player and per-team serve statistics; admins can manage the club roster including bulk import
**Depends on**: Phase 3
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06, STAT-07, TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06, TEAM-07, SEC-05
**Success Criteria** (what must be TRUE):
  1. Coach can view a player's serve points per set, per match, and per season with streak visualization
  2. Coach can view per-team statistics including best server and per-set breakdown across matches
  3. Jersey number conflict on the same team is flagged immediately when assigning a player
  4. Admin can import 20 players from a CSV file and see them appear in the club roster
  5. RLS isolation confirmed: user in Club A cannot read or write Club B's data in any table (tested with two real users)
**Plans**: TBD

### Phase 5: Admin & Polish
**Goal**: Admins can manage their club from a dedicated panel; the app speaks Finnish and English; rate limiting and keep-alive protect the free-tier backend
**Depends on**: Phase 4
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06, I18N-01, I18N-02, I18N-03, SEC-03, DB-05
**Success Criteria** (what must be TRUE):
  1. Admin can create a club, create teams, paste multiple coach emails, and send invite links from a single admin page
  2. Admin can assign or change coach roles for club members without leaving the admin panel
  3. Language toggle switches all UI strings between Finnish and English with no page reload
  4. Rate limiter blocks a user who sends more than 100 events per minute via Edge Function
  5. GitHub Actions weekly ping prevents Supabase Free tier project from auto-pausing
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/4 | In Progress|  |
| 2. Auth & Access | 0/? | Not started | - |
| 3. Game Loop & Sync | 0/? | Not started | - |
| 4. Statistics & Roster | 0/? | Not started | - |
| 5. Admin & Polish | 0/? | Not started | - |
