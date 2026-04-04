# External Integrations

**Analysis Date:** 2026-04-04

## APIs & External Services

**Current:**
- None — fully standalone application

**Planned (docs/PRD.md):**
- **Supabase Auth** — email + password login, magic link (no-password) authentication
- **Finnish Volleyball Federation API** (optional) — to auto-populate player rosters
  - Status: Under investigation (PRD section 4.1: `lentopalloliitto.fi`, `tulospalvelu.fi`, `torneopal.fi`)
  - Fallback: CSV/Excel import or manual entry (PRD 4.3)

## Data Storage

**Current:**
- **localStorage** — browser-native, no external service
  - Key: `'lentopallo'`
  - Stored object: `{players, court, eventLog, currentSet, serveTicks}`
  - No size limit enforcement (typically 5–10 MB per origin)
  - Persists per browser/device

**Planned (PRD section 2):**
- **Supabase PostgreSQL** — hosted relational database
  - Tables:
    - `clubs` — seurat (organizations)
    - `teams` — joukkueet (squads per club)
    - `players` — pelaajat (roster)
    - `matches` — ottelut (games)
    - `events` — tapahtumat (scoring events, replaces local `eventLog`)
    - `profiles` — käyttäjäprofiilit (user metadata)
  - Indexes planned (PRD 2.3): `idx_events_match`, `idx_events_player`, `idx_players_team`, `idx_matches_team`
  - Row Level Security (RLS): club-scoped access (PRD 2.2)

**File Storage:**
- Not detected or planned in current PRD

**Caching:**
- Not implemented — data served from localStorage or (planned) direct from Supabase

## Authentication & Identity

**Current:**
- None — no auth, no multi-user support
- Single-device use; all data local to browser

**Planned (PRD section 1.2–1.3):**
- **Supabase Auth**
  - Magic link (salasanaton, email-based) — primary method for ease of adoption
  - Email + password — secondary fallback
  - No social auth (OAuth) initially
- **Authorization Model:**
  - Roles: `admin` (seuran admin), `coach` (valmentaja), `viewer` (pelaaja/katsoja)
  - Row Level Security (RLS) in Supabase enforces club and team isolation (PRD 2.2)
  - User data in `profiles` table, linked to `auth.users.id`

## Monitoring & Observability

**Current:**
- Not applicable — no backend

**Planned:**
- **Audit Logging** (PRD 1.3, 7)
  - Built into `events` table: timestamp + `court_json` snapshot allows data recovery
  - Rate limiting via Supabase Edge Functions (max 100 points/min, PRD 1.3)
- **Errors:** No dedicated error tracking service mentioned; rely on browser console + Supabase logs

## CI/CD & Deployment

**Current:**
- **Manual deployment** — push to GitHub, files served as-is
- **Hosting:** GitHub Pages at repo root (`index.html`)
- No CI/CD pipeline

**Planned (PRD section 6.4):**
- **Hosting:** GitHub Pages (static build output from Vite)
  - Output folder: `docs/` or `gh-pages` branch
- **Build:** Vite outputs minified JS/CSS bundle + HTML
- **CI/CD:** Not specified; likely GitHub Actions (future phase)

## Environment Configuration

**Required Environment Variables:**

**Current:**
- None (all hardcoded or in localStorage)

**Planned:**
- `VITE_SUPABASE_URL` — Supabase project URL (public)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (public, safe for client-side use)
  - Stored in `.env.local` (not committed; see `.gitignore`)
  - Injected by Vite at build time via `import.meta.env.VITE_*`

**Secrets Location:**
- **Current:** Not applicable
- **Planned:** `.env.local` in project root (Git-ignored); Supabase console for sensitive keys

## Webhooks & Callbacks

**Current:**
- None

**Planned:**
- **Supabase Realtime (optional, future)**
  - Could push score updates to all devices on same team in real time
  - Not mentioned in PRD phase 1, likely phase 2+

## Offline Support

**Current:**
- All data stored in localStorage; app is fully offline-capable
- No sync needed; single-device use case

**Planned (PRD 6.1):**
- **Offline-First with Sync**
  - Primary: localStorage for offline reads/writes
  - On connectivity return: sync changes to Supabase
  - Conflict resolution: last-write-wins (timestamp-based from `ts` field in `events`)
  - Service Worker: Enable PWA install on home screen (PRD 6.1, 6.3)

## Third-Party Integrations Not Used

- No payment/billing (volunteer sports app)
- No SMS/push notifications (mentioned as optional future, PRD 6.3)
- No email service (Supabase Auth handles verification emails via SendGrid backend)
- No CDN (GitHub Pages acts as CDN)
- No analytics (future consideration not in PRD)

---

*Integration audit: 2026-04-04*
