---
paths:
  - "frontend/**/*.ts"
  - "frontend/**/*.tsx"
  - "frontend/**/*.css"
  - "frontend/package.json"
---

# Frontend standards (Next.js / TypeScript / Tailwind)

## Toolchain

- **npm** (or the project's chosen package manager — stay consistent,
  don't mix lockfiles).
- **ESLint** (`next/core-web-vitals` + `next/typescript`) — linting.
- **Prettier** with `prettier-plugin-tailwindcss` — formatting and
  automatic Tailwind class sorting. Don't hand-order classes.
- **TypeScript strict mode** — see `tsconfig.json`; don't weaken it
  project-wide to silence one file's errors.
- **Vitest + React Testing Library** — component/unit tests.

Before considering any frontend task done:

```
npm run lint
npm run format:check
npm run type-check
npm run test
```

## Code style

- **No `any`.** If the type is genuinely unknown, use `unknown` and
  narrow it — `any` defeats the type checker silently.
- **Props: explicit interfaces, no boolean prop proliferation.** Don't
  add `isCompact`/`showHeader`/`isRounded`-style boolean flags to
  customize behavior — use composition (compound components, explicit
  variants) instead. A component with 5+ boolean props is a sign it
  should be split or restructured.
- **Server Components by default** (Next.js App Router) — add
  `"use client"` only where interactivity actually requires it, not
  reflexively at the top of every file.
- **Co-locate tests** with the component (`Component.tsx` +
  `Component.test.tsx`), following whatever pattern the project already
  has.
- **Semantic HTML first** — reach for `<button>`, `<nav>`, `<label>`,
  etc. before reaching for ARIA attributes to patch a `<div>`.

## Tailwind

- Tailwind v4 uses CSS-first config (`@theme` in `globals.css`), not
  `tailwind.config.js` — see the comment in `globals.css`.
- Utility classes in markup, not new custom CSS files, for anything a
  utility already covers. Extract a component instead of repeating a
  long class string more than twice.
- Let `prettier-plugin-tailwindcss` sort classes; don't fight it.

## Accessibility (non-negotiable baseline)

- Minimum 4.5:1 contrast ratio for text (3:1 for large text).
- Every interactive element reachable and operable by keyboard; visible
  focus states — don't remove the focus ring without replacing it.
- Every `<img>` has meaningful `alt` text (or `alt=""` if decorative).
- Every form input has an associated `<label>`.
- Respect `prefers-reduced-motion` for non-essential animation.
- Status/error states aren't conveyed by color alone.

## Performance

- Avoid request waterfalls — fetch what you can in parallel; use
  Suspense to stream rather than blocking on everything before render.
- `next/image` for images, `next/dynamic` for heavy client components
  that aren't needed on initial paint.
- Avoid barrel-file imports that pull in an entire library for one
  export.
- Memoize only when a measured re-render is actually a problem — don't
  reach for `useMemo`/`React.memo` by default.

## Testing

- Every component with logic (not pure presentation) gets a test.
- Test behavior and accessibility roles (`getByRole`, `getByLabelText`),
  not implementation details like class names or internal state.
- Mock network calls; don't hit the real backend in unit tests.

## Security

- Never render unsanitized user input with `dangerouslySetInnerHTML`.
- Validate/sanitize anything from the URL, form input, or an external
  API before using it in a query, redirect, or rendered output.
- Keep secrets server-side — anything in a `NEXT_PUBLIC_*` env var ships
  to the browser and is not a secret.
