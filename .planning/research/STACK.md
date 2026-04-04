# Stack Research

**Domain:** Vanilla JS to Vite + TypeScript + Supabase migration — offline-first PWA
**Researched:** 2026-04-04
**Confidence:** HIGH — all versions verified against npm registry (live). Architecture decisions confirmed against PRD.md and CLAUDE.md.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | **7.3.1** | Build tool, dev server | Latest stable with proven vite-plugin-pwa support (peerDep ceiling is `^7.0.0`); Vite 8.0.3 exists but vite-plugin-pwa 1.2.0 does not declare it as compatible yet — do not use 8 until confirmed |
| TypeScript | **6.0.2** | Type checking | Current stable. Ships its own compiler; no separate `@types/typescript` needed |
| `@supabase/supabase-js` | **2.101.1** | Auth + DB queries + RLS enforcement | Ships its own types (no `@types/` package needed). The v2 API uses `createClient()`, supports magic link, RLS, realtime, and Edge Function invocation. Bundles auth-js, postgrest-js, realtime-js, storage-js, functions-js. |
| `vite-plugin-pwa` | **1.2.0** | PWA manifest + service worker generation | Wraps Workbox; handles SW registration, precaching, and update flow. Only correct PWA solution for Vite. Requires `workbox-build` + `workbox-window` as peer deps. |
| `workbox-window` | **7.4.0** | SW update prompts on client side | Required peer dep of vite-plugin-pwa. Handles "new version available" messaging to the user. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `idb` | **8.0.3** | Typed IndexedDB wrapper | Use for the offline event queue. localStorage is synchronous and limited to ~5MB; IndexedDB is async and can store large match logs. Ships its own types. |
| `papaparse` | **5.5.3** | CSV parsing for player roster import | Use when CSV/Excel player import is implemented (v1.x). Handles encoding, quoted fields, streaming. Types via `@types/papaparse`. |
| `workbox-build` | **7.4.0** | SW build integration | Required peer dep of vite-plugin-pwa; installed automatically but pin explicitly to avoid mismatch |
| `@vite-pwa/assets-generator` | **1.0.2** | Generate icon set from single source image | Optional peer dep; use once to generate all PWA icon sizes from a master PNG. Dev-only use. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `vitest` 4.1.2 | Unit testing | Vite-native, supports `^7.0.0`; same config as Vite, no separate Jest setup needed |
| `eslint` 10.2.0 | Linting | Required for TypeScript quality gate |
| `@typescript-eslint/eslint-plugin` 8.58.0 | TypeScript-aware lint rules | Pairs with eslint 10.x; catches type-unsafe patterns not caught by tsc |
| `supabase` CLI 2.84.10 | Local Supabase dev stack + type generation | `supabase gen types typescript --project-id ...` generates DB types from live schema; essential for type-safe queries |
| `gh-pages` 6.3.0 | GitHub Pages deploy automation | `npm run deploy` script; deploys `dist/` to `gh-pages` branch. Alternative: GitHub Actions with manual push. |

---

## Installation

```bash
# Core runtime
npm install @supabase/supabase-js@2.101.1 idb@8.0.3

# PWA (install together to ensure version alignment)
npm install workbox-window@7.4.0
npm install -D vite-plugin-pwa@1.2.0 workbox-build@7.4.0

# CSV import (add when implementing player import)
npm install papaparse@5.5.3
npm install -D @types/papaparse

# Dev tools
npm install -D vite@7.3.1 typescript@6.0.2 vitest@4.1.2
npm install -D eslint@10.2.0 @typescript-eslint/eslint-plugin@8.58.0
npm install -D gh-pages@6.3.0

# PWA icon generation (run once, not in CI)
npm install -D @vite-pwa/assets-generator@1.0.2
```

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Vite 8.x | `vite-plugin-pwa` 1.2.0 peer deps declare `^3.1.0 \|\| ^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` — Vite 8 is not listed; using it will produce peer dep warnings and may break SW generation | Vite 7.3.1 until vite-plugin-pwa explicitly adds `^8.0.0` |
| React / Vue / Svelte | Project constraint (CLAUDE.md, PRD §6.4) explicitly rules out UI frameworks; they add 40–100KB+ to bundle for no benefit over vanilla TS at this app's scale | Vanilla TypeScript with DOM APIs |
| i18next | 565KB unpacked for two languages (fi/en) is disproportionate overhead. The app needs ~50 translation strings. | Custom 30-line i18n: `const t = translations[locale][key]`. Extend only if language count grows beyond 3. |
| `xlsx` / SheetJS | 0.18.5 is outdated, large (~1.4MB), and has a known CVE history. For player import, only CSV is needed (coaches paste from federation spreadsheets). | `papaparse` for CSV. If Excel `.xlsx` is required, evaluate `exceljs` (actively maintained) at that time. |
| chart.js | 6034KB unpacked. Courtside statistics charts need to be lightweight on mobile. | `uplot` (1.6.32, 532KB) for trend charts. For simple bar charts, render SVG directly in TypeScript — no library needed. |
| `@supabase/realtime-js` directly | Bundled inside `@supabase/supabase-js`; importing it separately causes version drift | Use the realtime channel through the `supabase` client object |
| Service Worker written by hand | Workbox (via vite-plugin-pwa) handles precaching, routing strategies, and update lifecycle. Hand-rolled SW will miss edge cases (opaque responses, cache versioning, update prompt). | `vite-plugin-pwa` + `workbox-window` |
| localStorage for offline queue | Synchronous, 5MB cap, no indexing. Adequate for the existing single-device state but not for queuing match events during offline play. | `idb` (IndexedDB) for the event queue; keep localStorage only for auth token fallback and UI state |

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Makes Sense |
|-------------|-------------|------------------------------|
| Vite 7.3.1 | Vite 8.0.3 | After `vite-plugin-pwa` adds `^8.0.0` to peer deps (check before starting Phase 2) |
| `idb` for offline queue | `localforage` | `localforage` is unmaintained (last release 2021). `idb` is actively maintained and typed. |
| Custom i18n (30 lines) | `i18next` | If app expands to 3+ languages or needs plural rules, namespace loading, or backend translation services |
| `papaparse` for CSV | `xlsx` / `exceljs` | If coaches explicitly require `.xlsx` upload (not just CSV). Verify demand before adding the weight. |
| Supabase Auth magic link | Email + password | Both are planned (PRD §1.2). Magic link is lower friction for coaches; password is fallback. Implement both from the start — Supabase supports both simultaneously. |
| GitHub Pages + `gh-pages` | Netlify / Vercel | If Edge Functions become compute-heavy (unlikely; Supabase Edge Functions run in Deno, not on the host). GitHub Pages is free and already in use. |

---

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `vite-plugin-pwa@1.2.0` | `vite@^3.1.0 \|\| ^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` | **Does NOT declare Vite 8 compatible as of 2026-04-04** |
| `vite-plugin-pwa@1.2.0` | `workbox-build@^7.4.0` + `workbox-window@^7.4.0` | Must install both; version mismatch breaks SW generation |
| `vitest@4.1.2` | `vite@^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` | Compatible with Vite 7.3.1 |
| `typescript@6.0.2` | `vite@7.3.1` | Vite 7 requires Node `^20.19.0 \|\| >=22.12.0`; TypeScript 6 has no special Vite constraint |
| `@supabase/supabase-js@2.101.1` | All bundled sub-packages at `2.101.1` | Do not install sub-packages separately; version drift breaks type inference |
| `@typescript-eslint/eslint-plugin@8.58.0` | `eslint@10.2.0` | ESLint 10 + typescript-eslint 8 is the current supported pairing |

---

## Architecture Notes for Migration

**File structure target:**
```
src/
  main.ts          — entry point, Supabase client init, route handler
  state/           — all in-memory state (players, court, eventLog)
  supabase/        — client.ts (singleton), types.ts (generated), sync.ts (offline queue)
  ui/              — renderAll(), individual component render functions
  lib/             — esc(), calcStreaks(), recalcScores() (pure functions, easy to test)
  i18n/            — translations object fi/en, t() helper
  sw/              — service worker config (consumed by vite-plugin-pwa)
```

**Key migration constraint:** The existing `eventLog` append-only pattern maps directly to the `events` table in Supabase. Do not rewrite the scoring model — migrate the data shape.

**Supabase client init pattern:**
```typescript
// src/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'  // generated by supabase CLI

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

`import.meta.env` is Vite's env injection — never use `process.env` in client-side code targeting GitHub Pages.

---

## Sources

- npm registry (live, 2026-04-04): vite 7.3.1, @supabase/supabase-js 2.101.1, vite-plugin-pwa 1.2.0, typescript 6.0.2, workbox 7.4.0, idb 8.0.3, vitest 4.1.2, eslint 10.2.0, papaparse 5.5.3, uplot 1.6.32, gh-pages 6.3.0, chart.js 4.5.1 — HIGH confidence (direct registry query)
- `vite-plugin-pwa` peer deps (live registry): confirms Vite 8 incompatibility — HIGH confidence
- `/Users/ttt/Documents/AI Agent Claude/Lentopallo/docs/PRD.md` §6.4: stack decision (Vite + vanilla TS + Supabase JS), offline requirement, GitHub Pages hosting — HIGH confidence (project decision document)
- `/Users/ttt/Documents/AI Agent Claude/Lentopallo/CLAUDE.md`: no-framework constraint, single-file architecture origin — HIGH confidence

---

*Stack research for: Vanilla JS → Vite + TypeScript + Supabase offline-first PWA migration*
*Researched: 2026-04-04*
