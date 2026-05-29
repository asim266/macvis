---
name: HTML & CSS
description: Modern semantic HTML, responsive CSS, flexbox/grid layouts.
when_to_use: Building static pages, landing pages, or styling any web UI without a framework.
icon: 🌐
---

# HTML & CSS

## Workflow
1. Create the project under `~/.macvis/workspace/projects/<name>/` with `index.html`, `styles.css`, optional `app.js`.
2. Use semantic HTML5 (`header`, `nav`, `main`, `section`, `article`, `footer`).
3. Mobile-first responsive CSS; verify at 375px, 768px, 1280px widths.
4. Open in browser to verify (`open index.html`) or use the Projects view.

## Layout
- **Flexbox** for 1-D rows/columns; **Grid** for 2-D page layouts.
- Use `clamp()` for fluid type: `font-size: clamp(1rem, 2.5vw, 1.5rem)`.
- `gap` over margins for spacing inside flex/grid.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

## Quality bar
- Every `<img>` has `alt`; every form control has a `<label>`.
- Color contrast ≥ 4.5:1 for body text.
- One `<h1>` per page; headings nest logically.
- No layout shift: set width/height on media.

## Don't
- Don't use tables for layout. Don't inline huge style blocks. Don't ship unused CSS.
