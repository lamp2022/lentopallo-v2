# Structure

## Directory Layout

```
Lentopallo/
├── index.html          # Entire application (HTML + CSS + JS, ~890 lines)
├── CLAUDE.md           # Claude Code project instructions
├── README.md           # Project overview
└── docs/
    ├── PRD.md          # Product Requirements Document (planned migration)
    └── UI-PERIAATTEET.md  # UI design principles
```

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `index.html` | Single-file app: markup, styles, all JS logic | ~890 |
| `docs/PRD.md` | Planned Vite + TypeScript + Supabase migration spec | - |
| `docs/UI-PERIAATTEET.md` | Mobile-first UI constraints and color conventions | - |
| `CLAUDE.md` | Developer guide: architecture, key functions, scoring model | - |

## Naming Conventions

- **Functions**: camelCase, verb-first (`renderAll`, `addScore`, `openPicker`, `clearPos`)
- **Variables**: camelCase (`eventLog`, `currentSet`, `scoreViewSet`, `courtFlipped`)
- **CSS classes**: kebab-case (`court-cell`, `score-btns`, `picker-overlay`)
- **CSS variables**: `--name` on `:root` (`--bg`, `--blue`, `--surface2`)
- **DOM IDs**: camelCase (`scoreBtns`, `helpOverlay`, `rosterBody`)

## Entry Points

- **Browser**: Open `index.html` directly or via `python3 -m http.server 8080`
- **GitHub Pages**: Hosted at repo root (`index.html`)
- **App init**: `loadState()` → `renderAll()` at end of `<script>` block (lines 885–886)

## State Loading Priority

1. URL hash (Base64-encoded JSON) — for sharing via link
2. localStorage key `lentopallo` — session persistence
3. Hardcoded defaults — 8 demo players + court placement
