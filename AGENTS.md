<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Antigravity Project Rules & Best Practices

## Project Stack & Tooling
- **Core Framework:** Next.js 16.2+ (App Router)
- **Runtime & UI:** React 19 (using React Server Components by default)
- **Styling:** Tailwind CSS v4 (native `@theme` configurations, css-first syntax)
- **Backend/Services:** Firebase v12 (Auth, Firestore/Realtime Database)
- **E2E Testing:** Playwright

---

## 1. Next.js & React 19 Conventions
- **Server Components First:** All page and layout files under `src/app` are Server Components by default. Keep them that way.
- **Client Components:** Use `"use client"` ONLY when utilizing interactive hooks (`useState`, `useEffect`, `useContext`, `useActionState`, etc.) or event handlers. Keep Client Components leaf-level to maximize server rendering.
- **Data Fetching:** Prefer server-side data fetching directly in Server Components using async/await. Avoid fetching in client-side `useEffect` unless query state is highly dynamic.
- **React 19 Hooks & State Practices**:
  - *Avoid setState in useEffect*: Synchronous state updates during rendering or from props should be computed inline during render. Updates from actions/interactions must happen in event handlers or transition actions. Avoid calling state-setters directly inside `useEffect` (which triggers cascading renders and violates `react-hooks/set-state-in-effect`).
  - Leverage modern React 19 features where applicable (e.g., standard action hooks, new `use` API for promises/context).
- **TypeScript Type Safety**:
  - Avoid `any` types. Provide explicit type definitions or use generics where necessary to satisfy `@typescript-eslint/no-explicit-any`.
  - Ensure all imported variables and hook values are used, or removed if obsolete.

---

## 2. Tailwind CSS v4 Guidelines
- **Modern Syntax:** Tailwind CSS v4 is configured CSS-first. Customizations are defined in `src/app/globals.css` (or equivalent CSS entrypoints) via `@theme` directives instead of `tailwind.config.js`.
- **Pure Classes:** Avoid writing inline custom CSS rules unless absolutely necessary. Rely on standard Tailwind v4 utility classes.
- **Responsive & Themes:** Ensure layouts are fully responsive (`sm:`, `md:`, `lg:`) and correctly support dark mode using class-based or media-query approaches via `next-themes`.

---

## 3. Directory & Code Structure
Maintain clean organization across the `src/` directory:
- `src/app/`: File-system routes, layouts, and page views.
- `src/components/`: Reusable UI elements (split into sub-directories like `landing/`, `room/` where appropriate).
- `src/hooks/`: Custom React hooks for sharing stateful logic.
- `src/lib/`: Library initializations (e.g., Firebase client setup).
- `src/types.ts`: Shared TypeScript interfaces and type definitions.
- `src/constants.ts`: Static configuration and constant variables.

---

## 4. Testing & Verification Commands
Before submitting code changes, verify your work using these commands:
- **Development Server:** `npm run dev`
- **TypeScript & ESLint Verification:** `npm run lint` (runs `eslint` configured in `eslint.config.mjs`)
- **Production Build Check:** `npm run build`
- **End-to-End Tests:** `npm run test:e2e` (runs `playwright test` in the `e2e` directory)
