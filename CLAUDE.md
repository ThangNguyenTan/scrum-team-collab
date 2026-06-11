@AGENTS.md

# Scrum Team Collaboration - Development Guide & Workflows

This document outlines the commands, architecture, and step-by-step developer workflows for this repository. Please follow these processes strictly to maintain code quality, styling, and verification standards.

---

## 🛠️ Build, Lint, and Test Commands

Use the following npm commands for local development and verification:

*   **Start Dev Server:** `npm run dev`
*   **Run Linter & TypeScript Check:** `npm run lint`
*   **Check Production Build:** `npm run build`
*   **Run E2E Tests (Playwright):** `npm run test:e2e`

---

## 🏗️ Directory & Stack Summary
*   **Framework:** Next.js 16.2+ (App Router) + React 19 (Server Components by default).
*   **Styling:** Tailwind CSS v4 (configured via `@theme` in `src/app/globals.css`).
*   **Database:** Firebase v12 (Auth, Firestore, Realtime Database).
*   **Testing:** Playwright E2E tests in `e2e/`.

---

## 🤖 Custom Slash Commands for Agents

You (the AI Agent) must recognize the following slash commands in the user's prompt and immediately execute their corresponding workflows. Do not ask for confirmation or explain the steps beforehand—just start implementing.

### `/create-component <name> [--client] [--server] [--desc="description"]`
Trigger the **Create Component Workflow**:
1. Identify the component type (Server by default, Client if `--client` is passed, or if interaction hooks/event handlers are needed).
2. Create the file in the appropriate directory (e.g., `src/components/room/` or `src/components/landing/` or `src/components/`).
3. Set up the TypeScript interface, named export, and base Tailwind CSS v4 styling.
4. Verify by running the compiler/linter check.

### `/create-feature <name> [--desc="description"]`
Trigger the **Create Feature Workflow**:
1. Check if new state or properties are needed in `src/types.ts`.
2. Define the page route directory under `src/app/` (e.g. `src/app/<feature-name>/page.tsx`).
3. Generate reusable components and hook skeletons.
4. Add Playwright E2E tests under `e2e/`.
5. Run linting and production build checks to ensure correctness.

### `/brainstorm <topic>`
Trigger the **Brainstorm & Design Workflow**:
1. Research the codebase for existing references to `<topic>`.
2. Write a design concept detailing UI mockup outlines, data architecture (Firebase changes), and trade-offs.
3. Propose the layout and visual styles (glassmorphism, dark-mode first, smooth transitions).
4. Prompt the user to run `/grill-me` if complex architectural design decisions need clarifying.

### `/fix-lint`
Trigger the **Code Quality & CI Readiness Workflow**:
1. Run ESLint checks using the bypass command: `powershell -ExecutionPolicy Bypass -Command "npm run lint"`.
2. Parse the errors and systematically fix them (e.g. `any` types, `set-state-in-effect` violations, unused variables, purity warnings).
3. Re-run lint checks to confirm everything is resolved.

---

## 🔄 Core Developer Workflows

### 1. Create Component Workflow
Follow these steps whenever creating a new UI component.

#### A. Determine Component Type & Location
1.  **Server Component (Default):** Do NOT add `"use client"`. Use for static content, database fetch wrappers, or layout pieces.
2.  **Client Component:** Add `"use client"` at the very top of the file *only* if the component:
    *   Uses React hooks (`useState`, `useEffect`, `useContext`, `useActionState`, etc.).
    *   Uses interactive event handlers (`onClick`, `onChange`, `onSubmit`, etc.).
    *   Uses browser-only APIs.
    *   *Rule:* Keep client components at the leaf-level to maximize server rendering.
3.  **Location:**
    *   If specific to landing page: `src/components/landing/[ComponentName].tsx`
    *   If specific to the collaborative room: `src/components/room/[ComponentName].tsx`
    *   If generic/shared across the app: `src/components/[ComponentName].tsx`

#### B. Component Architecture & Code Styling
1.  **Named Exports:** Always use named exports rather than defaults:
    ```typescript
    export function MyComponent({ prop1 }: MyComponentProps) { ... }
    ```
2.  **TypeScript Interface:** Create clear, explicit types/interfaces. Avoid `any` types.
    ```typescript
    interface MyComponentProps {
      prop1: string;
      onAction?: () => void;
    }
    ```
3.  **Tailwind CSS v4 Styling:**
    *   Use Tailwind CSS v4 classnames.
    *   Import and use `cn(...)` from `@/lib/utils` for merging dynamic or conditional classnames:
        ```typescript
        import { cn } from "@/lib/utils";
        // ...
        className={cn("base-classes", isHovered && "hover-classes", className)}
        ```
    *   Integrate visual themes correctly using variables, supporting both light and dark modes (check `next-themes` setup).
    *   Do not write inline custom CSS styles (`style={{ ... }}`) unless dynamic calculations (e.g. coordinates/percentages) require it.

#### C. Verification
1.  Run `npm run lint` to catch TypeScript and ESLint issues.
2.  Import and test rendering in a page or parent component.

---

### 2. Create Feature Workflow
Follow this sequence to implement a brand new feature or module.

#### A. Data Model & Routing
1.  **Update Types:** If the feature requires new state fields, update the types in `src/types.ts` first. Ensure correct Firebase/Firestore fields and types (e.g. `FirestoreTimestamp`).
2.  **Define Routing:** Next.js file-system routing is defined under `src/app`.
    *   For a new path, create a directory: `src/app/[feature-name]/page.tsx`.
    *   Ensure the page file is a Server Component, using server-side fetching/awaiting where possible.

#### B. UI & Interactive Integration
1.  Create reusable child components under `src/components/` following the *Create Component Workflow*.
2.  Integrate components inside the parent pages.
3.  If the feature needs stateful sync with Firestore/Realtime Database, create or update a hook in `src/hooks/` to isolate real-time listener logic.

#### C. Testing & Verification
1.  **Add E2E Tests:** Create a test file in `e2e/[feature-name].spec.ts`. Write Playwright tests verifying the user flow (e.g., button clicks, live updates, UI state changes).
2.  **Verify Build & Quality:**
    *   Start development server: `npm run dev`
    *   Verify linting: `npm run lint`
    *   Run E2E tests: `npm run test:e2e`
    *   Ensure production compilation: `npm run build`

---

### 3. Brainstorm & Design Workflow
Use this workflow for planning new ideas, design iterations, or complex refactors.

#### A. Scope & Design Formulation
1.  **Draft Requirements:** Clarify user stories, target audiences (Scrum Masters, Developers, Product Owners), and UI mockups.
2.  **Architectural Assessment:**
    *   Analyze dependencies, data sync strategies (realtime listeners vs single fetch), and state hierarchy.
    *   Create a clean markdown design/proposal document. Use `/grill-me` to clarify open questions, trade-offs, and design patterns.
3.  **UI/UX Aesthetic Iteration:**
    *   Utilize `generate_image` or mockups to iterate on the UI/UX layout before implementing.
    *   Aesthetic Principles: Premium design, dark-mode first, glassmorphism, subtle micro-animations, clean typography, dynamic layout.

#### B. Implementation Plan (Planning Mode)
1.  If the feature is complex, create an `implementation_plan.md` artifact outlining specific file modifications and verification steps.
2.  Create a task checklist (`task.md`) to track progress during execution.
3.  Iterate on feedback and refine the plan with the team/user before execution.

---

### 4. Code Quality & CI Readiness Workflow
Before proposing changes, opening a PR, or concluding a task:

1.  **Lint Check:** Run `npm run lint`. Ensure no unused imports, no `any` types, and proper formatting.
2.  **Production Compile:** Run `npm run build` to verify there are no Server Component rendering errors or build-time issues.
3.  **Test Run:** Run `npm run test:e2e` to ensure no existing tests are broken and new tests pass cleanly.
4.  **Documentation:** Update this file, `AGENTS.md`, or relevant inline comments to preserve architectural knowledge.
