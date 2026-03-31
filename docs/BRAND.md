# Solon Brand Brief

## Identity

**Name:** Solon
**Claim:** Your AI. Your rules.
**What it is:** Self-hosted AI runtime. One binary, no DevOps. Agents, models, and inference on your own terms.
**Named after:** Solon of Athens — the lawmaker who gave people sovereignty over their own governance.

## Logo

A circle. Nothing else.

- **Light mode:** Black circle (`#1a1a2e`)
- **Dark mode:** White circle (`#ffffff`)
- **Glow:** Subtle purple drop-shadow `rgba(108, 99, 255, 0.4)` — signals that something intelligent lives inside

```svg
<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
  <circle cx="14" cy="14" r="11" fill="#1a1a2e" />
</svg>
```

The circle is the brand. No wordmarks, no gradients, no icons inside it. When paired with text, the wordmark is **"Solon"** in the system font, `font-extrabold tracking-tight`.

**Favicon:** Same circle at 32x32, auto-switches fill via `prefers-color-scheme`.

## Voice

- **Direct.** No buzzwords. Say what it does, not what it "empowers" or "revolutionizes."
- **Confident but not arrogant.** We know the product is good. We don't need superlatives.
- **Technical when talking to developers.** Don't dumb it down. Show the curl command, the API endpoint, the config.
- **Short sentences.** One binary. No DevOps. Your server. Your data.

**Do:** "Run AI agents on your own server."
**Don't:** "Leverage cutting-edge AI infrastructure to empower your autonomous agent workflows."

## Colors

### Brand

| Token | Value | Usage |
|-------|-------|-------|
| `brand` | `#1a1a2e` | Logo, sidebar, primary buttons, text on light backgrounds |
| `brand-light` | `#6c63ff` | Accent, highlights, badges, glow, interactive elements |

### Light mode

| Token | Value |
|-------|-------|
| Background | `#f8f9fb` (dashboard) / `#ffffff` (website) |
| Card | `#ffffff` |
| Text primary | `#1a1a2e` |
| Text secondary | `#6b7280` |
| Text tertiary | `#9ca3af` |
| Border | `#e5e7eb` |
| Border subtle | `#f3f4f6` |

### Dark mode

| Token | Value |
|-------|-------|
| Background | `#0f0f14` (dashboard) / `#0b0b11` (website) |
| Card | `#1a1a24` |
| Text primary | `#f0f0f5` |
| Text secondary | `#a0a0b0` |
| Text tertiary | `#606070` |
| Border | `#2a2a38` |
| Border subtle | `#1f1f2a` |

### Status colors

- Green: success, online, running
- Red: error, failed, offline
- Yellow: warning, provisioning
- Blue: info, pending

## Typography

**System fonts only.** No Google Fonts, no custom typefaces, no loading delays.

```
Sans:  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif
Mono:  "SF Mono", Monaco, "Cascadia Code", monospace
```

### Scale

| Element | Size | Weight | Extra |
|---------|------|--------|-------|
| Hero heading | `text-5xl md:text-6xl` | `font-extrabold` | `tracking-tight leading-[1.1]` |
| Section heading | `text-3xl` | `font-bold` | `tracking-tight` |
| Card title | `text-lg` | `font-semibold` | — |
| Body | `text-base` to `text-lg` | normal | `leading-relaxed` |
| UI text | `text-sm` | `font-medium` | — |
| Label | `text-xs` | `font-semibold` | `uppercase tracking-wide` |
| Code | `text-sm` | normal | `font-mono` |

Always use `antialiased` font smoothing.

## Spacing & Layout

- **4px base unit** (Tailwind default scale)
- **Max width:** `max-w-6xl` (72rem) for page content
- **Sidebar:** `w-60` (240px), fixed left
- **Section padding:** `py-20` to `py-24` vertical, `px-6` horizontal
- **Card padding:** `p-6`
- **Button padding:** `px-6 py-2.5` (standard), `px-6 py-3` (large)
- **Gap:** `gap-3` between buttons, `gap-6` between cards, `gap-8` between nav items

## Corners

| Element | Radius |
|---------|--------|
| Buttons, inputs, badges | `rounded-lg` (8px) |
| Cards, containers | `rounded-xl` (12px) |
| Pricing cards, hero elements | `rounded-2xl` (16px) |
| Avatars, pills | `rounded-full` |

## Components

### Buttons

**Primary:**
```
bg-brand text-white rounded-lg text-sm font-semibold
hover:opacity-90 transition-opacity
```

**Secondary:**
```
border border-gray-200 dark:border-white/[0.1] rounded-lg text-sm font-semibold
text-gray-700 dark:text-gray-300
hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors
```

**Ghost:** `text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors`

### Cards

```
rounded-xl border border-gray-100 dark:border-white/[0.06]
hover:border-gray-200 dark:hover:border-white/[0.12]
transition-colors
bg-white dark:bg-white/[0.02]
```

### Section badges

```
inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
bg-brand-light/10 border border-brand-light/20 text-brand-light
```

### Navigation bar (website)

```
sticky top-0 z-50
bg-white/80 dark:bg-[#0b0b11]/80 backdrop-blur-lg
border-b border-gray-100 dark:border-white/[0.06]
```

Glassmorphism — frosted blur over content.

### Sidebar (dashboard)

```
fixed h-full w-60 bg-brand text-white
```

Uses `white/40`, `white/60`, `white/10` opacity scale for text and borders within the dark sidebar.

## Effects

| Effect | Value | Usage |
|--------|-------|-------|
| Logo glow | `drop-shadow(0 0 6px rgba(108, 99, 255, 0.4))` | Logo in navbar |
| Glassmorphism | `backdrop-blur-lg` + `bg-white/80` | Website nav |
| Card shadow | `0 1px 3px rgba(0, 0, 0, 0.04)` | Subtle depth |
| Card hover lift | `translateY(-1px)` + stronger shadow | Interactive cards |
| Fade in | `opacity 0 → 1, translateY(4px → 0)` over `0.3s` | Page transitions |
| Pulse dot | `opacity 1 → 0.4 → 1` over `2s` | Status indicators |

## Dark mode

Two strategies coexist:

- **Website:** Tailwind `dark:` class on `<html>`. Toggled via `localStorage('solon-theme')`, defaults to system preference.
- **Dashboard:** CSS custom properties under `[data-theme="dark"]`. Toggled via Zustand store.

Both are user-controlled with a toggle button. Both default to system preference on first visit.

## Don'ts

- Don't use gradients on the logo
- Don't put letters or icons inside the circle
- Don't use `indigo` — use `brand` (`#1a1a2e`) and `brand-light` (`#6c63ff`)
- Don't use Google Fonts or any external font service
- Don't use emojis in the UI (acceptable in onboarding/marketing sparingly)
- Don't use `shadow-sm ring-1 ring-gray-200` — use `border border-gray-100`
- Don't use heavy box shadows — keep depth subtle
- Don't say "powered by AI" or "AI-powered" — the whole product is AI, it's redundant
