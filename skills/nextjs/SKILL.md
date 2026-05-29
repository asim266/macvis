---
name: Next.js
description: App Router, server components, routing, and deployment.
when_to_use: Building full-stack React apps, SSR/SSG sites, or anything deployed to Vercel.
icon: ▲
---

# Next.js (App Router)

## Scaffold
- `npx create-next-app@latest <name> --ts --app --tailwind --eslint` in the projects dir.
- Dev: `npm run dev` (background shell), open http://localhost:3000.

## App Router model
- `app/page.tsx` = route. `app/layout.tsx` = shared shell. `loading.tsx`/`error.tsx` per segment.
- **Server Components by default** (can fetch directly, no `useState`). Add `'use client'` only for interactivity.
- Data fetching: `async` server components with `fetch()` (auto-cached). Mutations via Server Actions.
- Route handlers: `app/api/<name>/route.ts` exporting `GET`/`POST`.

## Deploy
- If the Vercel MCP is connected, use `vercel__*` tools. Else `vercel` CLI.
- Set env vars in the platform, never commit secrets.

## Verify
- `npm run build` must pass (catches server/client boundary errors) before deploy.
