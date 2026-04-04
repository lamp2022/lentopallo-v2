---
phase: 01-foundation
plan: 04
subsystem: database
tags: [supabase, postgresql, rls, schema, migration]
dependency_graph:
  requires: []
  provides: [database-schema, rls-policies, db-indexes]
  affects: [02-auth, 03-game-loop, 04-statistics, 05-admin]
tech_stack:
  added: [supabase/migrations]
  patterns: [event-sourcing, row-level-security, club-scoped-rls, composite-pk-join-table]
key_files:
  created:
    - supabase/migrations/20260404_001_initial_schema.sql
  modified: []
decisions:
  - "Players belong to club (not team) — team_players join table enables multi-team rosters without data duplication"
  - "RLS uses auth.uid() -> profiles -> club_id pattern; never trusts client-provided club_id"
  - "All INSERT policies use WITH CHECK; SELECT uses USING; UPDATE uses both"
  - "events.id uses uuid (not bigint GENERATED ALWAYS) for consistency with other tables"
metrics:
  duration_minutes: 3
  completed_date: "2026-04-04"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
requirements_fulfilled: [DB-01, DB-02, DB-03, DB-04]
---

# Phase 01 Plan 04: Supabase Initial Schema Migration Summary

PostgreSQL schema with 7 tables, RLS policies scoped to clubs via auth.uid(), CHECK constraints on all value ranges, 6 indexes covering primary query patterns, and auto-profile trigger on signup.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create complete SQL migration with schema, RLS, constraints, and indexes | 409d441 | supabase/migrations/20260404_001_initial_schema.sql |

## What Was Built

A single SQL migration file (291 lines) ready to paste into Supabase SQL Editor. Contains:

**Tables (7):** clubs, teams, players, team_players, matches, events, profiles

**Schema decisions vs PRD:**
- PRD had `players.team_id FK -> teams.id` (direct FK). Research resolved this to `team_players` join table with `PRIMARY KEY (team_id, player_id)` and `UNIQUE (team_id, nr)`. Players belong to club, not team — enables multi-team rosters.
- PRD had `events.id bigint GENERATED ALWAYS AS IDENTITY`. Changed to `uuid PRIMARY KEY DEFAULT gen_random_uuid()` for consistency.
- Added `matches.status` ('active'/'closed') and `matches.scorer_id` not in PRD but needed for match lifecycle.
- Added `events.type` ('serve'/'point') matching existing app's eventLog structure.

**RLS (18 policies):** All scoped through `auth.uid() -> profiles -> club_id` subquery. No client-provided club_id trusted.

**Indexes (6):** events(match_id), events(player_id), players(club_id), matches(team_id, date), teams(club_id), profiles(club_id).

**Trigger:** `handle_new_user()` SECURITY DEFINER auto-creates profile row on auth.users INSERT.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a DDL-only migration file. No application code.

## Threat Flags

All threats in the plan's threat model are mitigated:

| T-ID | Status | Notes |
|------|--------|-------|
| T-04-01 | Mitigated | All RLS policies derive club_id from auth.uid() via profiles subquery |
| T-04-02 | Mitigated | All INSERT policies use WITH CHECK; UPDATE policies use both USING + WITH CHECK |
| T-04-03 | Mitigated | CHECK constraints on nr (1-99), set_nr (1-5), delta (-1,1), position (1-6), role enum, status enum |
| T-04-04 | Mitigated | No runtime Supabase calls in Phase 1; migration file only |
| T-04-05 | Mitigated | 6 indexes covering all primary query patterns |

## Self-Check: PASSED

- [x] supabase/migrations/20260404_001_initial_schema.sql exists (291 lines, > 100 min)
- [x] 7 CREATE TABLE statements
- [x] 7 ALTER TABLE ... ENABLE ROW LEVEL SECURITY statements
- [x] 18 CREATE POLICY statements (>= 15)
- [x] 6 CREATE INDEX statements (>= 6)
- [x] CHECK (nr BETWEEN 1 AND 99) present (twice: players + team_players)
- [x] CHECK (set_nr BETWEEN 1 AND 5) present
- [x] CHECK (delta IN (-1, 1)) present
- [x] PRIMARY KEY (team_id, player_id) present
- [x] UNIQUE (team_id, nr) present
- [x] REFERENCES auth.users(id) present (twice: matches.scorer_id + profiles.id)
- [x] auth.uid() used in 23 policy clauses
- [x] All INSERT policies use WITH CHECK
- [x] All SELECT policies use USING
- [x] All UPDATE policies have both USING and WITH CHECK
- [x] Commit 409d441 exists
