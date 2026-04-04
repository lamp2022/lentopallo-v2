# Technology Stack

**Analysis Date:** 2026-04-04

## Languages

**Primary:**
- HTML5 — markup for UI structure in `index.html`
- CSS3 — styling, grid layout for court visualization, animations
- JavaScript (ES6) — vanilla JS, no frameworks; all logic in `index.html` script block
- **Planned:** TypeScript — migration target in PRD (see section 6.4)

## Runtime

**Environment:**
- Browser (modern, ES6 compatible) — no server-side runtime currently
- **Planned:** Node.js + Vite — for build pipeline and development

**Package Manager:**
- **Current:** None (no dependencies, no `package.json`)
- **Planned:** npm — with Vite + TypeScript + Supabase JS client

## Frameworks

**UI/Frontend:**
- **Current:** None — vanilla HTML/CSS/JS
- **Planned:** Vite (build tool) + vanilla TypeScript (no UI framework like React/Vue)

**Persistence:**
- **Current:** localStorage API (browser native, no library)
- **Planned:** Supabase JavaScript Client — for remote persistence + offline sync

**Testing:**
- Not currently in use

**Build/Dev:**
- **Current:** None (single HTML file, served directly or via `python3 -m http.server`)
- **Planned:** Vite (dev server, build to static assets)

## Key Dependencies

**Current:**
- None — zero external dependencies

**Planned (PRD section 6.4):**
- `@supabase/supabase-js` — Supabase JavaScript client for auth, database queries, RLS enforcement
- `vite` — fast build tool and dev server
- `typescript` — type checking

**Not included:**
- No UI frameworks (React, Vue, Svelte)
- No bundlers other than Vite
- No HTTP clients (uses native `fetch` API)

## Configuration

**Environment:**
- **Current:** Hardcoded state in memory; all data in localStorage under key `'lentopallo'`
- **Planned:** `.env.local` for Supabase URL and anon key (see docs/PRD.md section 3)

**Build:**
- **Current:** No build step; served as-is from `/index.html`
- **Planned:**
  - `vite.config.ts` — Vite configuration
  - `tsconfig.json` — TypeScript compiler options
  - Hosting: GitHub Pages from `docs/` folder or `gh-pages` branch (PRD 6.4)

**Browser Requirements:**
- Viewport: mobile-first, 375px target width (see UI-PERIAATTEET.md)
- Cache headers: `no-cache, no-store, must-revalidate` already set in `index.html` meta tags (line 6–8)

## Platform Requirements

**Development:**
- Any modern browser (Chrome, Firefox, Safari, Edge) with ES6 support
- Optional: Python 3 for local server (`python3 -m http.server 8080`)
- **Planned:** Node.js 18+ for Vite dev server

**Production:**
- GitHub Pages hosting (free, static hosting)
- **Planned:** Supabase PostgreSQL + Auth (Free or Pro tier; see PRD section 5.2)
- **Planned:** Supabase Edge Functions for rate limiting (PRD section 1.3)

## Current Code Organization

**Entry Point:**
- `index.html` (810 lines) — entire app in one file

**State Management:**
- In-memory objects: `players`, `court`, `eventLog`, `scores`, `currentSet`, `serveTicks`, etc.
- Persistence: `localStorage.getItem('lentopallo')` / `localStorage.setItem()` (lines 823, 858)

**Key Functions (vanilla JS):**
- `renderAll()` — full UI redraw
- `recalcScores()` — derive all scores from `eventLog`
- `addScore(delta, event)` — append event
- `rotate()` — advance court positions
- `esc(str)` — XSS-safe escaping

---

*Stack analysis: 2026-04-04*
