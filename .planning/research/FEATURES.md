# Feature Research

**Domain:** Volleyball club management + courtside rotation tracking
**Researched:** 2026-04-04
**Confidence:** MEDIUM — WebSearch denied; based on PRD.md, CLAUDE.md domain docs, and training-data knowledge of sports club management apps (TeamSnap, Volleyball Stats+, GameChanger, DataVolley). Competitor analysis is training-data sourced (flag for validation).

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Live courtside score recording | Core loop; app is useless without it | LOW | Already exists: +1/-1 on server in position 1 |
| Serve rotation tracking (positions 1–6) | Volleyball-specific; every team tracks rotations | LOW | Already exists; rotate() shifts court |
| Player roster per team (nr, name, role) | Can't score anonymously; jersey number is identity | LOW | Already exists; extend with active/inactive flag |
| Per-set score display | Coaches review between sets; offline must work | LOW | Already exists |
| Match history list | "What happened in last week's game?" is obvious ask | MEDIUM | Not yet; requires matches table + list view |
| Login / account | Multi-device, multi-coach — any persistent app needs auth | MEDIUM | Planned: Supabase magic link + email/password |
| Data persists across devices | Coaches switch phones; assistants help | MEDIUM | Requires Supabase sync; localStorage is device-local |
| Offline operation during match | Gym WiFi is unreliable; match cannot stop for network | HIGH | Offline-first + sync is explicit constraint |
| Two-tap confirmation for destructive actions | Accidental "new game" during live match = catastrophe | LOW | Already exists via confirmingNewGame flag |
| Mobile-first UI (one-handed, 48px+ targets) | Coaches hold clipboard or whistle with other hand | MEDIUM | Already enforced in UI-PERIAATTEET.md |
| Per-player serve statistics (points, efficiency) | Coaches need data to decide who serves when | MEDIUM | Planned; calcStreaks() exists, needs DB aggregation |
| Team selection after login | Clubs have multiple teams; coach must pick theirs | LOW | Planned; straightforward dropdown/list |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Serve streak visualization | Most apps show totals; streaks show momentum and pressure patterns | MEDIUM | calcStreaks() already exists; needs chart/visual |
| Event-sourced scoring (immutable log) | Enables undo, replay, and future analytics without schema changes | MEDIUM | Existing pattern; preserve through migration |
| Offline-first with background sync | Competitors (TeamSnap) go read-only offline; we stay writable | HIGH | localStorage fallback + Supabase sync queue |
| Court-position context on every event | Records which position player was in when point scored — rare in consumer apps | LOW | court_json in events table; already in schema |
| Coach-scoped RLS (data isolation per club) | Multi-club SaaS without cross-contamination; important for federation use | MEDIUM | Supabase RLS with club_id filter |
| CSV/Excel player import | Coaches copy-paste roster from federation spreadsheet; saves 20 min setup | MEDIUM | Papa Parse or xlsx; needed before player-count growth |
| Finnish + English bilingual | Finnish Volleyball Federation context; English for diaspora clubs | LOW | i18n string map; no library needed at this scale |
| Season-scoped statistics | Show this season vs last season; context for player development | MEDIUM | Season field on teams table already in schema |
| Per-set efficiency trend across matches | DataVolley-class insight for amateur clubs at zero cost | HIGH | SQL aggregation across events; defer to v2 |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time multi-user score sync (WebSockets) | "Two coaches scoring simultaneously" | Race conditions during live match; conflicting events corrupt log; adds infra complexity | Single scorer per match; offline-first append-only log syncs after match |
| Push notifications | "Notify team of match result" | Service Worker push requires VAPID key infra, permission UX is intrusive on mobile; low open rate for sports apps | Display last match result on home screen after login |
| Social login (Google/Apple OAuth) | Lowers friction for sign-up | Clubs use shared accounts or federation emails; OAuth binds to personal account, creates access loss when coach leaves | Magic link email; works with any email including shared club addresses |
| Rich text match notes / comments feed | "Log what happened" | Turns app into chat/forum; scope creep; no moderation story | Plain text notes field on matches table (already in schema) |
| Video clip uploads | "Film the serve sequence" | Storage costs blow past Supabase Free tier immediately; requires CDN, transcoding | Out of scope; link to external video (YouTube/Vimeo) in notes field |
| FIVB/federation standings integration | "Auto-import match scores from official results" | Finnish Volleyball Federation API likely does not exist (PRD.md §4.1 flags this as unverified); scraping is fragile | CSV import for player roster; manual match result entry |
| Full scouting / reception stats | DataVolley territory — dig%, attack%, block% | Requires separate input flow per rally, not one-handed; bloats courtside UI | Serve points only for v1; reception can be phase 3+ with explicit UX research |
| Automated rotation legality checker | "Warn when rotation is illegal" | Requires tracking all 6 players + libero rules + overlap rules; high complexity, high edge cases | Coach's responsibility; app is a tool not a referee |

---

## Feature Dependencies

```
Auth (Supabase magic link)
    └──requires──> Supabase project + RLS setup
                       └──requires──> clubs/teams/players/matches/events schema

Match management (create, tag opponent/date)
    └──requires──> Auth
    └──requires──> Team selection UI

Persistent statistics (per player, per team)
    └──requires──> Match management
    └──requires──> Events synced to Supabase

Offline-first sync
    └──requires──> localStorage queue implementation
    └──requires──> Supabase JS client with conflict resolution strategy

CSV/Excel player import
    └──requires──> Player roster management UI
    └──requires──> Team selection

Admin panel (user + team management)
    └──requires──> Auth with role column on profiles
    └──enhances──> CSV import (admin bulk-loads roster)

PWA (service worker, install prompt)
    └──requires──> Vite build (manifest.json, SW registration)
    └──enhances──> Offline-first (SW caches app shell)

Season-scoped statistics
    └──requires──> Season field on teams (already in schema)
    └──requires──> Persistent statistics

Per-set efficiency trend across matches
    └──requires──> Season-scoped statistics
    └──requires──> Multiple matches in DB (data volume dependency)
```

### Dependency Notes

- **Offline-first conflicts with real-time sync:** Writable offline + multi-user real-time sync creates merge conflicts. Decision: single scorer per match, sync on reconnect. Do not attempt both simultaneously.
- **Statistics require data volume:** Trend charts are meaningless with <5 matches. Build the data pipeline first; add visualization in later milestone.
- **PWA enhances offline but is not required for it:** localStorage fallback works without a service worker. Add PWA layer after offline sync is proven stable.

---

## MVP Definition

### Launch With (v1 — this milestone)

- [x] Vite + vanilla TypeScript migration (from single index.html)
- [ ] Supabase Auth (magic link) — enables multi-device, multi-coach
- [ ] clubs/teams/players/matches/events schema with RLS — data isolation
- [ ] Offline-first: localStorage queue + Supabase sync on reconnect — match safety
- [ ] Match management (create match, tag opponent/date, close match) — history starts here
- [ ] Team selection after login — multi-team clubs
- [ ] Per-player serve stats (points per set/match, streak) — immediate coaching value
- [ ] Role-based access: admin vs coach — prevents roster corruption

### Add After Validation (v1.x)

- [ ] Admin panel (user management, team management) — trigger: second club onboards
- [ ] CSV/Excel player import — trigger: coaches complain about manual roster entry
- [ ] PWA install prompt + service worker — trigger: coaches want home screen icon
- [ ] Finnish + English i18n — trigger: English-speaking coach requests it
- [ ] Per-team statistics (best server, per-set totals) — trigger: coaches ask "who should serve in set 3?"

### Future Consideration (v2+)

- [ ] Per-set efficiency trend across multiple matches — requires data volume (10+ matches)
- [ ] Finnish Volleyball Federation roster import — requires verifying API existence (PRD §4.1 open question)
- [ ] Viewer/player role (read-only statistics view) — requires UX research; risk of feature bloat
- [ ] Audit log UI (who changed what) — currently logged in events.ts; UI is low priority
- [ ] Supabase Pro upgrade + PITR — trigger: club's season data becomes irreplaceable

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth (magic link) | HIGH | MEDIUM | P1 |
| Offline-first sync | HIGH | HIGH | P1 |
| Match management | HIGH | MEDIUM | P1 |
| Team selection after login | HIGH | LOW | P1 |
| Per-player serve stats | HIGH | MEDIUM | P1 |
| Role-based access (admin/coach) | HIGH | MEDIUM | P1 |
| Admin panel | MEDIUM | MEDIUM | P2 |
| CSV player import | MEDIUM | MEDIUM | P2 |
| PWA | MEDIUM | LOW | P2 |
| i18n fi/en | MEDIUM | LOW | P2 |
| Per-team statistics | MEDIUM | MEDIUM | P2 |
| Season-scoped trend charts | LOW | HIGH | P3 |
| Federation API import | LOW | HIGH | P3 |
| Viewer/player role | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (this milestone)
- P2: Should have, add when possible (next milestone)
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

> Confidence: LOW — based on training data (August 2025 cutoff). Validate before using for marketing positioning.

| Feature | TeamSnap | GameChanger | DataVolley | Our Approach |
|---------|----------|-------------|------------|--------------|
| Offline scoring | Partial (read-only) | Yes | Desktop only | Full offline writable + sync |
| Volleyball-specific rotation | No (generic) | Limited | Yes (pro) | Yes, core feature |
| Serve streak analytics | No | No | Yes (pro, complex) | Yes, simplified |
| Magic link auth | No | No | No | Yes (coach-friendly) |
| Free tier | Freemium (limited) | Freemium | Trial only | Yes (Supabase Free) |
| Court position on events | No | No | Yes | Yes (court_json) |
| Club-scoped multi-team | Yes | Yes | Yes | Yes (RLS) |
| CSV roster import | Yes | Yes | Yes | Yes (planned) |
| Mobile-first courtside UI | Partial | Yes | No | Yes (primary design constraint) |

---

## Sources

- `/Users/ttt/Documents/AI Agent Claude/Lentopallo/.planning/PROJECT.md` — validated requirements, out-of-scope decisions
- `/Users/ttt/Documents/AI Agent Claude/Lentopallo/docs/PRD.md` — schema, RLS, migration phases, open questions
- `/Users/ttt/Documents/AI Agent Claude/Lentopallo/CLAUDE.md` — UI constraints, architecture, state model
- Training data: TeamSnap, GameChanger, DataVolley feature sets (LOW confidence — verify against current product pages)

---

*Feature research for: Volleyball club management + courtside rotation tracking*
*Researched: 2026-04-04*
