# Pitfalls Research

**Domain:** Vanilla JS → Vite + TypeScript + Supabase + PWA migration (volleyball club app)
**Researched:** 2026-04-04
**Confidence:** MEDIUM — based on training knowledge of these well-documented patterns; no external verification possible (web access denied). Core patterns are stable and well-known.

---

## Critical Pitfalls

### Pitfall 1: Offline Queue Conflicts — Sync Clobbers Live Data

**What goes wrong:**
Coach scores events offline during a match. Another device (club admin) modifies the same match data online. When the offline device reconnects, the sync blindly upserts or replays the local queue, overwriting the live state. Result: duplicate events, wrong scores, or data loss.

**Why it happens:**
Teams implement offline sync as "queue everything locally, flush when online." This works for single-user but silently breaks for multi-user. The event-sourcing model (append-only eventLog) partially mitigates this, but only if sync uses server-assigned IDs and timestamps, not client-generated ones.

**How to avoid:**
- Use server-side `id GENERATED ALWAYS AS IDENTITY` (already in PRD schema) — never use client-generated IDs as primary keys for events.
- Sync by inserting events with a `client_temp_id` and letting the server assign the canonical ID. Replace local temp IDs after confirmation.
- For the events table specifically: treat it as append-only (no updates, no deletes) — this makes conflict resolution trivial. The PRD schema already supports this.
- Lock a match to one device at a time during active play. Do not allow multi-device concurrent scoring.

**Warning signs:**
- Score totals drift when switching devices after an offline session.
- Duplicate events visible in event log after reconnect.
- `recalcScores()` produces different results on different devices for the same match.

**Phase to address:** Phase 1 (Supabase + Auth + offline sync foundation)

---

### Pitfall 2: RLS Policies That Pass Testing But Fail in Production

**What goes wrong:**
RLS rules are written for the happy path (authenticated user with club_id). They pass all manual tests. In production: service role key leaks into client code, bypassing RLS entirely; or a user with no profile yet (newly registered, hasn't been assigned to a club) gets a null club_id and either sees all data or gets cryptic errors.

**Why it happens:**
Supabase RLS testing in the dashboard uses a simulated user context. The `anon` key and `service_role` key behave differently — service role bypasses all RLS. If any client code ever touches the service role key, all security is void.

**How to avoid:**
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or Vite build. Only use it in Edge Functions or server-side scripts.
- The Supabase JS client should always use the `anon` key + user JWT. Verify this in `vite.config.ts` — no service role key in `VITE_*` env vars.
- Test RLS using `SET ROLE authenticated; SET request.jwt.claims TO '{"sub":"...","role":"authenticated"}';` in the SQL editor, not just the dashboard toggle.
- Add a profile existence check on auth: if `profiles` row is missing, show "pending approval" screen, not an empty data view.
- Write an explicit RLS policy test: create two club users, verify neither can read the other's data.

**Warning signs:**
- Any `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env` — immediate red flag.
- New user login shows blank screen with no error (likely RLS returning empty, not an error).
- API calls succeed even when unauthenticated (service role leaking).

**Phase to address:** Phase 1 (Auth + RLS setup) — must be verified before any data goes in

---

### Pitfall 3: TypeScript Migration Breaks the Event-Sourcing Model

**What goes wrong:**
The existing `eventLog` array is typed loosely or incorrectly during migration. `recalcScores()` and `calcStreaks()` are ported with `any` types to "get it working." Over time, the type contracts diverge from actual runtime shape, and bugs are silently introduced — wrong player stats, off-by-one streak counts — that are hard to trace.

**Why it happens:**
Migrating JS to TS under time pressure means `any` everywhere to stop compiler errors. The event-sourcing model is especially sensitive because all derived state (`scores`, `serveScores`, `pointScores`) depends on correct event structure.

**How to avoid:**
- Define `Event`, `Court`, `Player`, and all domain types first, before touching any logic. Make these the foundation.
- Use `strict: true` in `tsconfig.json` from day one. No relaxing later.
- `recalcScores()` and `calcStreaks()` should be pure functions with explicit input/output types — easy to test in isolation.
- Write unit tests for `recalcScores` and `calcStreaks` against a fixed eventLog fixture before migrating the logic.

**Warning signs:**
- Any `as any`, `// @ts-ignore`, or `unknown` cast in core scoring functions.
- `recalcScores()` returns different totals than the old JS implementation for the same input.
- TypeScript errors suppressed with `// eslint-disable` in scoring logic.

**Phase to address:** Phase 1 (Vite + TS migration) — define types before porting logic

---

### Pitfall 4: Service Worker Caches Stale JS/CSS After Deploy

**What goes wrong:**
A bug fix is deployed. Coaches still see the old version because the service worker serves cached assets. No error, no prompt — the app just silently runs old code. This is especially dangerous courtside: a scoring bug "fixed" in production is still present for offline users.

**Why it happens:**
Service workers cache aggressively by design. Vite hashes filenames (`main.abc123.js`), which handles asset cache busting — but only if the service worker's cache manifest is updated. If the SW itself is cached, or if the update check logic is wrong, old SWs persist.

**How to avoid:**
- Use `vite-plugin-pwa` (Workbox under the hood). Do not write a service worker manually.
- Set `registerType: 'autoUpdate'` only for non-critical apps. For a match-day app, use `'prompt'` so coaches are notified of updates and can choose when to reload.
- Set `skipWaiting: false` — let the coach finish the match before the SW activates.
- Test SW update flow explicitly: deploy v1, open app, deploy v2, verify update prompt appears.

**Warning signs:**
- Deployed fix not visible to users who were already in the app.
- `navigator.serviceWorker.getRegistrations()` shows old SW still active.
- Console shows "New content available" message but UI does not prompt.

**Phase to address:** Phase 2 (PWA + service worker) — get this right before first production deploy

---

### Pitfall 5: localStorage and Supabase State Desync After Auth

**What goes wrong:**
User logs out and logs back in as a different coach (different team). The app loads localStorage data from the previous session and displays it alongside (or instead of) the freshly fetched Supabase data. Scores appear correct but belong to the wrong team.

**Why it happens:**
localStorage is keyed globally (not per user). The migration reuses the existing localStorage keys (`court`, `players`, `eventLog`) without scoping them to the authenticated user or team.

**How to avoid:**
- Namespace all localStorage keys by team ID: `lp_court_{teamId}`, `lp_eventLog_{teamId}`.
- On login: clear any localStorage data not matching the current user's team IDs.
- On logout: explicitly clear in-session state (don't rely on page reload).
- Design the sync flow as: Supabase is source of truth → localStorage is cache. On load: fetch from Supabase, write to localStorage. Never read localStorage as authoritative after login.

**Warning signs:**
- Player names from a previous session appear in the court picker after login.
- Switching teams does not reset the score display.
- Event log shows events from a different match after logging back in.

**Phase to address:** Phase 1 (Auth + localStorage migration) — namespace keys before any multi-user testing

---

### Pitfall 6: GitHub Pages Routing Breaks Auth Redirect

**What goes wrong:**
Supabase magic link sends user to `https://yourrepo.github.io/lentopallo/#access_token=...`. GitHub Pages serves only static files; any deep-link route returns 404 unless handled. The auth callback never completes — user gets "404" instead of being logged in.

**Why it happens:**
Magic link and OAuth redirects use URL fragments or query params that require the SPA to be served at the redirect URL. GitHub Pages doesn't support SPA fallback routing natively.

**How to avoid:**
- Configure Supabase Auth redirect URL to the exact index.html path: `https://[user].github.io/[repo]/`. Never a subpath.
- Use hash-based routing (`/#/`) if navigation is needed — GitHub Pages handles fragments without 404.
- In `supabase.auth.onAuthStateChange()`, detect the `SIGNED_IN` event and redirect to the app state immediately — don't rely on URL parsing.
- Set the redirect URL in Supabase Dashboard → Auth → URL Configuration → Site URL and Redirect URLs. Add both local dev and production URLs.

**Warning signs:**
- Magic link email opens to a 404 page.
- Auth session not established after clicking magic link.
- `supabase.auth.getSession()` returns null after redirect.

**Phase to address:** Phase 1 (Auth setup) — test magic link flow on GitHub Pages before building any protected features

---

### Pitfall 7: Supabase Free Tier Pause Kills the App Mid-Season

**What goes wrong:**
Supabase Free tier pauses inactive projects after 1 week of inactivity. A club that doesn't use the app during school holidays comes back in September for the new season and finds the database paused and all data inaccessible.

**Why it happens:**
The Free tier pausing policy is a known Supabase behavior. Most developers don't read it until they're hit by it.

**How to avoid:**
- Set up a weekly GitHub Actions ping (simple SELECT query) to keep the project active.
- Alternatively, upgrade to Pro ($25/mo) when the club commits to regular use.
- Document this limitation explicitly for the club admin. Do not discover it during a match.
- The Free tier has 500MB storage — fine for a small club, but monitor usage quarterly.

**Warning signs:**
- Supabase dashboard shows "Project paused."
- All API calls return 503 or connection refused.
- No matches logged for more than 7 days (approaching pause threshold).

**Phase to address:** Phase 1 (Supabase setup) — add keep-alive immediately, before handing off to club

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Type with `any` for existing JS logic during migration | Faster migration, fewer TS errors | Bugs in scoring/stats impossible to track; defeats purpose of TS | Never — define domain types first |
| Single localStorage key namespace (no user scoping) | Simpler initial code | Multi-user sessions corrupt each other's data | Never — namespace from day one |
| Skip RLS testing with two real users | Faster development | Security hole: cross-club data visible | Never — test RLS before first real user |
| Inline Supabase client creation in multiple files | Convenient | Multiple auth sessions, inconsistent state, token refresh issues | Never — singleton client only |
| `autoUpdate` SW registration | Users always get latest | Coach mid-match gets force-reloaded and loses in-progress state | Only for admin/stats pages, not scoring UI |
| Store match ID only in URL hash (no localStorage backup) | Cleaner URLs | Losing URL = losing match context on reload | Never — always persist active match ID |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth (magic link) | Redirect URL not configured for GitHub Pages path | Set exact production URL in Dashboard; test end-to-end on GH Pages before launch |
| Supabase RLS | Testing only with admin/service role in dashboard | Test with real `authenticated` role using two separate browser sessions |
| Supabase JS client | Creating multiple client instances across modules | Export a singleton from `src/lib/supabase.ts`, import everywhere |
| Vite env vars | Using `SUPABASE_SERVICE_ROLE_KEY` as `VITE_*` var | Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in client; service role only in Edge Functions |
| Vite + GitHub Pages | Base URL not set for subpath hosting | Set `base: '/lentopallo/'` in `vite.config.ts` if repo is not at root |
| vite-plugin-pwa + Workbox | Caching Supabase API calls in SW | Exclude `supabase.co` domain from SW cache; only cache static assets |
| Service Worker + auth tokens | SW intercepts auth token refresh requests | Configure Workbox `networkFirst` for all Supabase API calls, never `cacheFirst` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching full event history on every `recalcScores()` call | Scoring UI lags, especially mid-long match | Keep eventLog in memory; only persist to Supabase async, don't re-fetch for scoring | ~200+ events in a session |
| Querying all events for stats without indexes | Stats page slow to load | PRD indexes already planned — implement them in Phase 1, not later | ~1000+ events across matches |
| Re-rendering entire court on every event | Jank on low-end Android | `renderAll()` is fine for now; optimize specific slow nodes only if measured | Not an issue at current scale |
| Supabase realtime subscription for all events | Unnecessary traffic, battery drain on mobile | No realtime needed — single-coach scoring, pull on load is sufficient | Any live use |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service role key in Vite env | Complete RLS bypass — any user reads all clubs' data | Never prefix service role key with `VITE_`; audit `.env` before first commit |
| RLS policies without `WITH CHECK` clause | INSERT/UPDATE allowed even if resulting row violates policy | Always pair `USING` (SELECT) with `WITH CHECK` (INSERT/UPDATE) in every policy |
| Missing policy for `profiles` table | User can read/modify other users' profiles | Explicit policy: `profiles.id = auth.uid()` only |
| Trusting client-sent `club_id` in inserts | Malicious user inserts data into another club | RLS policy derives `club_id` from `auth.uid()` via `profiles` join — never trust client-provided club_id |
| No rate limiting on event insertion | Score-flooding attack inflates stats | Edge Function rate limiter as planned in PRD — implement before any public access |
| JWT not validated on custom Edge Functions | Direct API calls bypass auth | Always check `Authorization: Bearer` header in Edge Functions, use `supabase.auth.getUser()` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing network error during match when Supabase is slow | Coach panics, match disruption | Always show local state first; sync silently in background; only surface errors on explicit save |
| Auth redirect loop if session expires mid-match | Coach loses in-progress match data | Detect session expiry, save full state to localStorage before redirecting to login |
| Login flow that requires multiple taps on mobile | Friction at match start | Magic link with auto-copy or QR code; test entire auth flow one-handed on 375px |
| Spinner blocking the scoring UI during sync | Unusable mid-match | Optimistic UI: record event locally first, sync async, show subtle status indicator not a full spinner |
| Requiring team selection every session | Tedious for single-team coaches | Remember last selected team in localStorage; skip team picker if only one team available |
| Update prompt mid-match (`autoUpdate` SW) | Active match state disrupted by forced reload | Use `prompt` registration type; show update banner that coach can dismiss until match ends |

---

## "Looks Done But Isn't" Checklist

- [ ] **RLS:** Tested with two separate real users in two different clubs — not just the dashboard toggle.
- [ ] **Offline sync:** Tested by scoring 20+ events with airplane mode on, then reconnecting — all events appear in Supabase, no duplicates.
- [ ] **Auth redirect:** Magic link tested on actual GitHub Pages URL, not just localhost.
- [ ] **Service Worker update:** Deployed v2 over v1 while app was open — verified update prompt appeared without crashing active session.
- [ ] **localStorage namespace:** Logged out, logged in as different coach — confirmed no data bleed between sessions.
- [ ] **TypeScript strict mode:** `tsc --noEmit` passes with `strict: true` and zero suppressions in scoring logic.
- [ ] **Supabase keep-alive:** GitHub Actions weekly ping tested — project does not pause after 7 idle days.
- [ ] **Mobile tap targets:** All scoring buttons tested one-handed on real 375px device, not just browser DevTools.
- [ ] **Event append-only integrity:** Verified no UPDATE or DELETE paths exist for events table in client code.
- [ ] **Vite base URL:** App loads correctly from GitHub Pages subpath (`/lentopallo/`), not just `/`.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Offline sync conflict created duplicates | MEDIUM | Event table is append-only — identify duplicates by `client_temp_id`, delete extras via admin script; recalculate stats |
| RLS misconfiguration exposed cross-club data | HIGH | Immediately rotate Supabase JWT secret (invalidates all sessions), audit access logs, fix policies, notify affected clubs |
| Service worker serving stale version to all users | LOW | Update SW version string in manifest, `skipWaiting()` triggers forced update; worst case: instruct users to clear site data |
| Supabase Free tier paused mid-season | LOW | Resume in dashboard (takes ~30 seconds); add keep-alive immediately after; no data lost |
| localStorage–Supabase desync | MEDIUM | Clear localStorage for affected team, re-fetch from Supabase; no data loss if Supabase is source of truth |
| TypeScript `any` types caused scoring bug | HIGH | Full audit of scoring functions required; add regression tests; cannot be hotfixed safely |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Offline sync conflicts | Phase 1: offline sync design | Test with airplane mode + 20 events; check Supabase for no duplicates |
| RLS bypass (service role key) | Phase 1: Supabase setup | Audit `.env`; run two-user cross-club access test |
| TypeScript `any` in scoring logic | Phase 1: TS migration | `tsc --noEmit` with `strict: true`; unit tests for `recalcScores` |
| Service worker stale cache | Phase 2: PWA | Deploy v2 over v1 while app open; verify update prompt |
| localStorage/Supabase desync | Phase 1: Auth + localStorage | Multi-user session test: logout → login as different user |
| GitHub Pages auth redirect failure | Phase 1: Auth | End-to-end magic link test on GH Pages URL |
| Supabase Free tier pause | Phase 1: Supabase setup | Add keep-alive CI job; verify project not paused after 8 idle days |

---

## Sources

- Supabase documentation (RLS, Auth, Free tier policies) — training knowledge, August 2025 cutoff; confidence MEDIUM
- Workbox / vite-plugin-pwa service worker update patterns — training knowledge; confidence MEDIUM
- GitHub Pages SPA limitations — well-documented, stable behavior; confidence HIGH
- Event-sourcing offline conflict patterns — established distributed systems knowledge; confidence HIGH
- Vite TypeScript strict mode migration patterns — stable TS/Vite behavior; confidence HIGH

**Note:** Web search and WebFetch were unavailable during this research session. All findings are from training data (cutoff August 2025). The Supabase Free tier pause policy and GitHub Pages routing behavior should be verified against current documentation before Phase 1 begins.

---
*Pitfalls research for: Vanilla JS → Vite + TypeScript + Supabase + PWA (volleyball club app)*
*Researched: 2026-04-04*
