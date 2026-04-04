# Architecture Research

**Domain:** Offline-first PWA — Vite + vanilla TypeScript + Supabase
**Researched:** 2026-04-04
**Confidence:** MEDIUM (web tools unavailable; based on PRD constraints + well-established patterns for these technologies)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │   UI     │  │  Auth    │  │  Stats   │  │    Admin     │    │
│  │ Modules  │  │  Views   │  │  Views   │  │    Panel     │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       │             │             │               │             │
│  ─────┴─────────────┴─────────────┴───────────────┴──────────   │
│                     State / Event Bus                            │
│  ─────────────────────────────────────────────────────────────   │
│       │             │             │               │             │
│  ┌────┴──────┐  ┌───┴──────┐  ┌──┴───────┐  ┌───┴────────┐    │
│  │  Game     │  │  Roster  │  │  Match   │  │  Profile   │    │
│  │  Service  │  │  Service │  │  Service │  │  Service   │    │
│  └────┬──────┘  └───┬──────┘  └──┬───────┘  └───┬────────┘    │
│       │             │            │               │             │
│  ─────┴─────────────┴────────────┴───────────────┴──────────   │
│                    Sync Layer (SyncQueue)                        │
│  ─────────────────────────────────────────────────────────────   │
│  ┌───────────────────────────┐  ┌────────────────────────────┐   │
│  │     localStorage Cache    │  │   Supabase JS Client       │   │
│  │  (events, players, court) │  │  (auth, db, realtime)      │   │
│  └───────────────────────────┘  └────────────┬───────────────┘   │
│                                              │                   │
│  ┌───────────────────────────────────────────┴───────────┐       │
│  │                  Service Worker                        │       │
│  │  (cache strategies, offline detection, bg sync)       │       │
│  └───────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Supabase (Cloud)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐    │
│  │    Auth     │  │  PostgreSQL │  │    Edge Functions      │    │
│  │ (magic link)│  │  + RLS      │  │  (rate limiting)       │    │
│  └─────────────┘  └─────────────┘  └───────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| UI Modules | Render DOM, handle user input, call services | Services, State |
| State / Event Bus | Single source of truth in memory; notify UI on change | UI Modules, Services |
| Game Service | Rotation logic, score recording, court state, eventLog | SyncQueue, localStorage |
| Roster Service | Player CRUD, import (CSV), role assignment | SyncQueue, Supabase |
| Match Service | Create/select matches, per-set stats, streak calc | SyncQueue, Supabase |
| Profile Service | Auth state, club/team context, role checks | Supabase Auth |
| SyncQueue | Persist offline mutations; flush to Supabase on reconnect | localStorage, Supabase |
| localStorage Cache | Write-through cache for all game state + pending queue | SyncQueue, Services |
| Supabase JS Client | Auth tokens, DB queries, realtime subscriptions | Supabase Cloud |
| Service Worker | Network-first/cache-first strategies per route, background sync | Browser Cache API |

## Recommended Project Structure

```
src/
├── core/
│   ├── state.ts            # In-memory state store + typed event bus
│   ├── sync-queue.ts       # Offline mutation queue (serialize to localStorage)
│   ├── supabase.ts         # Supabase client singleton (env vars)
│   └── storage.ts          # localStorage read/write helpers (typed)
│
├── services/
│   ├── auth.ts             # Magic link flow, session management, role checks
│   ├── game.ts             # rotate(), addScore(), recalcScores(), calcStreaks()
│   ├── roster.ts           # Player CRUD, CSV import, team membership
│   ├── match.ts            # Match lifecycle, per-match/per-set stats
│   └── admin.ts            # Club/user management (admin role only)
│
├── ui/
│   ├── components/
│   │   ├── court.ts        # 2×3 court grid, picker popup, position rendering
│   │   ├── scoreboard.ts   # Score display, set selector
│   │   ├── roster-list.ts  # Player list, edit inline
│   │   └── stats-view.ts   # Per-player/per-team statistics tables
│   ├── views/
│   │   ├── game.ts         # Main courtside view (active during match)
│   │   ├── match-select.ts # Match picker / new match form
│   │   ├── login.ts        # Magic link request, confirm token
│   │   ├── team-select.ts  # Post-login team selector
│   │   └── admin.ts        # Admin panel view
│   └── render.ts           # renderAll() orchestrator, DOM diffing helpers
│
├── i18n/
│   ├── fi.ts               # Finnish strings
│   ├── en.ts               # English strings
│   └── index.ts            # t() lookup, locale detection
│
├── sw/
│   └── service-worker.ts   # Cache strategies, background sync registration
│
├── types/
│   └── index.ts            # Player, Match, Event, CourtState, SyncMutation types
│
├── main.ts                 # App bootstrap: auth check → team select → game view
├── vite-env.d.ts
└── style.css
```

### Structure Rationale

- **core/**: Zero UI dependency. `sync-queue.ts` and `state.ts` can be unit-tested in isolation. Everything that touches network or persistence lives here.
- **services/**: Business logic separated from rendering. Each service owns one domain (game, roster, match). Services read/write state, queue mutations.
- **ui/**: Components are vanilla TS functions returning/mutating DOM nodes. No shadow DOM, no framework — mirrors existing code style. Views assemble components.
- **sw/**: Service worker compiled separately by Vite (vite-plugin-pwa or manual entry).
- **types/**: Shared interfaces prevent the "any" drift common in vanilla TS migrations.

## Architectural Patterns

### Pattern 1: Event-Sourced Local State (preserved from existing app)

**What:** `eventLog` is append-only array of scoring events. All scores/streaks are derived by replaying the log.
**When to use:** Everywhere scoring state changes. Never mutate aggregates directly.
**Trade-offs:** Slightly more compute on recalc (negligible for <500 events/match); gives free undo, audit trail, offline replay.

```typescript
// core/state.ts
interface GameEvent {
  id: string;         // client-generated uuid4 (for dedup on sync)
  ts: string;         // ISO timestamp
  set_nr: number;
  player_id: string;
  delta: 1 | -1;
  court_json: CourtState;
  position: number;
  synced: boolean;    // false until flushed to Supabase
}

// Derived state — never stored, always recalculated
function recalcScores(events: GameEvent[]): ScoreMap { ... }
```

### Pattern 2: Offline-First Sync Queue

**What:** Every mutation is written to localStorage immediately. A background queue flushes pending mutations to Supabase when online. On conflict, server wins (last-write-wins per event id).
**When to use:** All write operations (addScore, rotate, playerEdit).
**Trade-offs:** Eventual consistency is acceptable for this use case (one coach per match at a time). Conflict risk is minimal.

```typescript
// core/sync-queue.ts
interface SyncMutation {
  id: string;
  table: 'events' | 'players' | 'matches';
  op: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  queued_at: string;
}

async function flush(client: SupabaseClient): Promise<void> {
  const pending = loadQueue();
  for (const mutation of pending) {
    await client.from(mutation.table)[mutation.op](mutation.payload);
    dequeue(mutation.id);
  }
}

// Called on: navigator.onLine event, app foreground, periodic interval
window.addEventListener('online', () => flush(supabase));
```

### Pattern 3: Write-Through Cache

**What:** On every state change, serialize to localStorage immediately (synchronous). Supabase is the authoritative store; localStorage is the read cache + offline buffer.
**When to use:** All state mutations.
**Trade-offs:** localStorage has ~5MB limit. For this domain (events per match ~100-300, players ~15), this is not a constraint.

```typescript
// Sequence for addScore():
// 1. Append to in-memory eventLog
// 2. saveToStorage() — synchronous, < 1ms
// 3. renderAll()     — immediate UI update
// 4. enqueue({ table: 'events', op: 'insert', payload: event })
// 5. flush() if online — async, does not block UI
```

### Pattern 4: Module-Based UI Without Framework

**What:** Each UI component is a TypeScript module exporting a `render(container, state)` function. State changes call `renderAll()` which re-renders affected components via targeted DOM updates (not full page rewrite).
**When to use:** Matches existing code style; avoids framework overhead.
**Trade-offs:** Manual DOM diffing is error-prone at scale. Acceptable here because UI surface is small (~6 views, ~10 components) and mostly stable.

```typescript
// ui/components/court.ts
export function renderCourt(container: HTMLElement, state: GameState): void {
  container.innerHTML = buildCourtHTML(state);  // small enough for innerHTML
  attachCourtHandlers(container, state);
}
```

## Data Flow

### Match Day Flow (Critical Path — must be < 2s)

```
Coach taps +1 (serve point)
    ↓
ui/views/game.ts → onClick handler
    ↓
services/game.ts → addScore(+1)
    ├── append event to eventLog (in-memory)
    ├── recalcScores() → update state.scores
    ├── core/storage.ts → saveToStorage() [SYNC, ~0ms]
    └── core/sync-queue.ts → enqueue(event) [SYNC, ~0ms]
    ↓
ui/render.ts → renderAll()  [target: < 16ms]
    ↓
UI updated (court + scoreboard redrawn)
    ↓
(background) sync-queue.ts → flush() if navigator.onLine
    ↓
supabase.from('events').insert(event) [async, ~200-500ms, does not block UI]
```

### Auth + Hydration Flow (App Start)

```
main.ts bootstrap
    ↓
services/auth.ts → getSession()
    ├── No session → render login view
    └── Session found →
        ├── load profile (club_id, role)
        ├── check localStorage for cached team selection
        │   ├── No selection → render team-select view
        │   └── Selection found →
        │       ├── hydrate state from localStorage (instant)
        │       ├── render game view (offline-capable immediately)
        │       └── (background) fetch latest from Supabase → merge into state
        └── render game view
```

### Sync Reconciliation (Online Return)

```
navigator 'online' event
    ↓
sync-queue.ts → flush()
    ├── For each pending mutation: upsert to Supabase (event.id as dedup key)
    ├── On conflict: server wins (idempotent inserts)
    └── Clear queue entries on success
    ↓
(optional) fetch remote state delta since last_sync_ts
    ↓
merge into state, renderAll()
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `supabase.auth.signInWithOtp()` for magic link; `onAuthStateChange()` listener | Session stored in localStorage by client automatically |
| Supabase DB | `supabase.from('table').select/insert/update/delete` | All behind RLS; club_id filter redundant but explicit in queries for clarity |
| Supabase Edge Functions | HTTP POST for rate-limited writes (if needed) | Only for scoring endpoint if rate abuse is detected; skip in MVP |
| Service Worker | Background Sync API (`SyncManager`) for queue flush | Fallback: flush on `navigator.onLine` event if Background Sync unavailable |
| GitHub Pages | Static hosting; Vite outputs to `dist/` or `docs/` | No SSR; all routing is hash-based (`#/game`, `#/login`) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Services | Direct function calls + state subscribe | No event bus needed at this scale |
| Services ↔ SyncQueue | `enqueue(mutation)` call; queue is passive | Services never await sync completion |
| SyncQueue ↔ Supabase | Async batch flush | Retry with exponential backoff on network error |
| Services ↔ localStorage | Via `core/storage.ts` typed wrappers only | No direct localStorage access outside storage.ts |
| Auth ↔ All Services | Services read `state.currentUser` (club_id, role, team_id) | Never re-fetch profile on every service call |

## Suggested Build Order

Components have explicit dependencies. Build in this sequence to avoid blocking work:

1. **Types** (`src/types/index.ts`) — all other modules depend on shared interfaces
2. **Core** (`state.ts`, `storage.ts`) — services and sync depend on these
3. **Game Service** (`services/game.ts`) — preserves existing logic; proves types work
4. **Minimal UI** (`ui/views/game.ts`, `ui/components/court.ts`, `ui/render.ts`) — validates game loop end-to-end without auth
5. **Supabase Client** (`core/supabase.ts`) + **Auth Service** — introduces network dependency
6. **Sync Queue** (`core/sync-queue.ts`) — connects local state to cloud
7. **Roster Service + UI** — player management, CSV import
8. **Match Service + UI** — match lifecycle, stats queries
9. **Service Worker** + **PWA manifest** — offline hardening after core flow is stable
10. **i18n** — add last; string keys can be Finnish literals until this point
11. **Admin Panel** — last; depends on all services, low priority for match-day use

## Anti-Patterns

### Anti-Pattern 1: Blocking the UI on Network Calls

**What people do:** `await supabase.from('events').insert(event)` before `renderAll()`.
**Why it's wrong:** On a 3G courtside connection this blocks the UI for 1-3 seconds. Defeats the "under 2 seconds" core constraint.
**Do this instead:** Write to localStorage + in-memory state synchronously, render immediately, enqueue mutation for async flush.

### Anti-Pattern 2: Putting Business Logic in UI Components

**What people do:** `recalcScores()` called inside the court renderer; rotation logic spread across click handlers.
**Why it's wrong:** Untestable, duplicated, breaks when a second UI view needs the same data.
**Do this instead:** All logic lives in `services/`. UI components only read from state and call service functions.

### Anti-Pattern 3: Direct Supabase Calls from UI

**What people do:** `supabase.from('players').select()` called directly in a component's render function.
**Why it's wrong:** Creates scattered error handling, no offline fallback, no caching.
**Do this instead:** All Supabase access through services. Services handle offline fallback (return cached state, enqueue write).

### Anti-Pattern 4: One-to-One localStorage ↔ Supabase Column Mapping

**What people do:** Mirror the Supabase schema exactly in localStorage, sync field-by-field.
**Why it's wrong:** Creates brittle coupling; schema migrations break offline state.
**Do this instead:** localStorage stores serialized app state (eventLog, court, players) and the pending SyncQueue. Supabase schema is independent — services translate between the two.

### Anti-Pattern 5: Replacing Event Sourcing with Mutable Aggregates

**What people do:** Store `{player_id: 7, serve_points: 12}` and update in place.
**Why it's wrong:** Loses undo capability, streak calculation, audit trail. The existing event-sourcing model is one of the app's strengths.
**Do this instead:** Keep eventLog as append-only. Aggregates are always derived.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 team (current) | Single localStorage key, no auth needed; existing app works |
| 2-15 teams (target) | Current architecture handles this without changes |
| 15-100 teams | Add Supabase Views for heavy stats queries; consider pagination in roster/match lists |
| 100+ teams | Edge Functions for aggregations; consider moving stats to separate read-optimized table |

The Free tier Supabase limit (500MB DB) is not a concern until roughly 50,000 matches with full event logs. Well beyond the target scale.

## Sources

- PRD.md (project constraints, schema) — authoritative for this codebase
- CLAUDE.md (architecture decisions: single-file app, event-sourcing, localStorage)
- Supabase JS client v2 patterns (training data, MEDIUM confidence — verify `supabase.auth.onAuthStateChange` signature on first integration)
- Vite 5 project structure conventions (training data, HIGH confidence — stable API)
- Service Worker Background Sync API (W3C spec, MEDIUM confidence — verify browser support for `SyncManager` on iOS Safari before relying on it; fallback to `navigator.onLine` event is required)
- Offline-first web app patterns — Jake Archibald / Google Workbox (HIGH confidence, well-established patterns)

---
*Architecture research for: Vite + vanilla TypeScript + Supabase offline-first PWA*
*Researched: 2026-04-04*
