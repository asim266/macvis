---
name: Tailwind CSS
description: Utility-first styling, theming, and design systems.
when_to_use: Styling any web project with Tailwind utility classes.
icon: 🎨
---

# Tailwind CSS

## Setup
- Tailwind v4: `@import "tailwindcss";` in your CSS; configure via `@theme` tokens.
- v3: `npx tailwindcss init -p`, add `content` globs, `@tailwind base/components/utilities`.

## Patterns
- Compose utilities in markup; extract repeated clusters into components, not `@apply` soup.
- Use the spacing/letter scales consistently (`gap-4`, `p-6`); avoid arbitrary values unless needed (`w-[327px]`).
- Dark mode: `dark:` variants; drive with `class` strategy.
- Responsive: mobile-first, layer `sm: md: lg:`.

## Design tokens
- Define brand colors, radii, and fonts as theme tokens so the whole app stays consistent.
- Prefer semantic names (`bg-surface`, `text-muted`) via theme over raw palette in markup.

## Don't
- Don't mix large hand-written CSS with utilities for the same element. Pick one source of truth.
