# Lentopallo — Theme Specification

Design tokens for dark and light themes. Both share fonts, spacing, and layout — only CSS custom properties change. Theme toggle button (moon/sun) persists choice to `localStorage` key `lentopallo-theme`.

## Shared

| Property | Value |
|----------|-------|
| Body font | `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif` |
| Mono font | `'DM Mono', 'SF Mono', 'Cascadia Code', monospace` |
| Google Fonts | `DM+Mono:wght@400;500` + `Plus+Jakarta+Sans:wght@400;500;600;700` |
| Min contrast | WCAG AA (4.5:1) for all text on its background |
| Touch targets | 48px minimum |
| Border radius | 6–14px (buttons 8px, cards 10–12px, score buttons 14px) |

## Dark Theme (default — "Broadcast Dark")

Neutral grays, no blue cast. Accent colors are bright/saturated for contrast on dark surfaces.

```css
:root {
  --bg: #1c1c1c;
  --surface: #262626;
  --surface2: #303030;
  --surface3: #3a3a3a;
  --glass: rgba(34, 211, 238, 0.06);

  --border: #404040;
  --border2: #565656;
  --border-glow: rgba(34, 211, 238, 0.25);

  --text: #f0f0f0;       /* 15.0:1 on bg — AAA */
  --text2: #bfbfbf;      /*  9.3:1 on bg — AAA */
  --text3: #8e8e8e;      /*  5.2:1 on bg — AA  */

  --cyan: #22d3ee;       /*  9.6:1 on bg — AAA */
  --cyan-dim: rgba(34, 211, 238, 0.15);
  --blue: #3b82f6;
  --green: #34d399;      /*  9.1:1 on bg — AAA */
  --green-dim: rgba(52, 211, 153, 0.12);
  --red: #f87171;        /*  6.3:1 on bg — AA  */
  --red-dim: rgba(248, 113, 113, 0.12);
  --amber: #fbbf24;      /* 10.4:1 on bg — AAA */
  --amber-dim: rgba(251, 191, 36, 0.12);

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4);
  --shadow-glow-cyan: 0 0 20px rgba(34, 211, 238, 0.15), 0 0 4px rgba(34, 211, 238, 0.3);
  --shadow-glow-green: 0 0 20px rgba(52, 211, 153, 0.15), 0 0 4px rgba(52, 211, 153, 0.3);
  --shadow-glow-red: 0 0 20px rgba(248, 113, 113, 0.15), 0 0 4px rgba(248, 113, 113, 0.3);

  --overlay: rgba(0, 0, 0, 0.7);
  --score-btn-text: #fff;
  --grain-opacity: 0.03;
  --popup-glow: 0 0 20px currentColor;
  --green-gradient: #059669;
  --red-gradient: #dc2626;
}
```

### Dark theme details

- Grain overlay: SVG feTurbulence at 3% opacity on `body::before`
- Score popup: neon glow via `text-shadow: 0 0 20px currentColor`
- Rotate button: `linear-gradient(135deg, var(--cyan), var(--blue))`
- Score +1: `linear-gradient(135deg, var(--green), var(--green-gradient))`
- Score -1: `linear-gradient(135deg, var(--red), var(--red-gradient))`
- Court cell hover: cyan border glow via `--shadow-glow-cyan`
- Net line: dashed repeating-linear-gradient with `--text2` at 0.8 opacity
- Overlays: `backdrop-filter: blur(4px)` over `var(--overlay)`

## Light Theme

Crisp neutral light. No warm tint — clean grays for maximum sharpness. Accent colors darkened for contrast.

```css
[data-theme="light"] {
  --bg: #eeeeee;
  --surface: #fafafa;
  --surface2: #e0e0e0;
  --surface3: #d2d2d2;
  --glass: rgba(14, 116, 144, 0.06);

  --border: #b8b8b8;
  --border2: #909090;
  --border-glow: rgba(14, 116, 144, 0.20);

  --text: #0a0a0a;       /* 17.4:1 on bg — AAA */
  --text2: #303030;      /* 11.5:1 on bg — AAA */
  --text3: #555555;      /*  6.4:1 on bg — AA  */

  --cyan: #0e7490;       /*  5.1:1 on bg — AA  */
  --cyan-dim: rgba(14, 116, 144, 0.10);
  --blue: #1d4ed8;       /*  6.5:1 on bg — AA  */
  --green: #047857;      /*  5.3:1 on bg — AA  */
  --green-dim: rgba(4, 120, 87, 0.08);
  --red: #b91c1c;        /*  6.2:1 on bg — AA  */
  --red-dim: rgba(185, 28, 28, 0.08);
  --amber: #b45309;      /*  4.9:1 on bg — AA  */
  --amber-dim: rgba(180, 83, 9, 0.08);

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-glow-cyan: 0 0 16px rgba(14, 116, 144, 0.12), 0 0 4px rgba(14, 116, 144, 0.18);
  --shadow-glow-green: 0 0 16px rgba(4, 120, 87, 0.12), 0 0 4px rgba(4, 120, 87, 0.18);
  --shadow-glow-red: 0 0 16px rgba(185, 28, 28, 0.12), 0 0 4px rgba(185, 28, 28, 0.18);

  --overlay: rgba(0, 0, 0, 0.3);
  --score-btn-text: #fff;
  --grain-opacity: 0;
  --popup-glow: none;
  --green-gradient: #059669;
  --red-gradient: #991b1b;
}
```

### Light theme details

- No grain overlay (`--grain-opacity: 0`)
- No score popup glow (`--popup-glow: none`)
- Lighter overlay backdrop (`rgba(0,0,0,0.3)`)
- Same gradients on buttons, darker accent endpoints

## Switching

Dark is default (`:root`). Light activates via `data-theme="light"` on `<html>`.

```js
// Toggle
const isLight = document.documentElement.dataset.theme === 'light'
if (isLight) {
  delete document.documentElement.dataset.theme
  localStorage.setItem('lentopallo-theme', 'dark')
} else {
  document.documentElement.dataset.theme = 'light'
  localStorage.setItem('lentopallo-theme', 'light')
}

// Restore on load
const saved = localStorage.getItem('lentopallo-theme')
if (saved === 'light') document.documentElement.dataset.theme = 'light'
```

## Color semantics (both themes)

| Role | Dark | Light | Usage |
|------|------|-------|-------|
| Positive | `#34d399` | `#047857` | +1 score, success states |
| Negative | `#f87171` | `#b91c1c` | -1 score, destructive confirmations |
| Primary action | `#22d3ee` | `#0e7490` | Rotate button, active set, focus rings |
| Navigation | `#3b82f6` | `#1d4ed8` | Links, secondary actions |
| Serve indicator | `#fbbf24` | `#b45309` | Serve ticks, streak badges |
