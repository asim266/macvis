---
name: React
description: Build React 18/19 apps with hooks, components, and state patterns.
when_to_use: Building interactive UIs or SPAs with React/Vite.
icon: ⚛️
---

# React

## Scaffold
- `npm create vite@latest <name> -- --template react-ts` inside `~/.macvis/workspace/projects/`.
- `npm install` then `npm run dev` (use `bash run_in_background:true`, then `bash_output` to read the URL).

## Component rules
- Function components only. Keep them small and single-purpose.
- Derive state; don't duplicate it. Lift state to the lowest common parent.
- `useEffect` only for true side effects (subscriptions, DOM, fetch). Add correct deps.
- Keys on lists must be stable ids, never array index.
- Memoize (`useMemo`/`useCallback`/`React.memo`) only after measuring a real cost.

## Data
- Co-locate fetching with the component that needs it, or use a query lib (TanStack Query).
- Show loading/error/empty states explicitly.

## Structure
```
src/
  components/   # presentational
  hooks/        # reusable logic (useX)
  lib/          # pure helpers
  App.tsx
```

## Verify
- Run the dev server and check the page renders without console errors before claiming done.
