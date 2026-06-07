# React Component Directory & Architecture Guidelines

This codebase is organized using intuitive, real-world folder structures. This design promotes maximum reusability, clear division of concerns, and rapid onboarding for engineers.

---

## 1. Directory Structure & Architecture Layers

Components are divided into four primary folders under `src/components/` based on their role and business coupling:

### 🎨 Reusable UI Components (`src/components/ui`)
UI components are generic, highly reusable widgets that provide core building blocks and visual presentation.
- **Rules**:
  - Should be **purely presentational** (no API calls, no Firebase bindings, no store connections).
  - Can hold **simple local UI state** (e.g., input values, toggle switches, tabs active index, modal open state).
  - Must accept a `className` prop, merged using the `cn()` utility (`clsx` + `tailwind-merge`) to allow visual adjustments by parents.
- **Examples**: Buttons, input fields, custom modals backdrop, simple cards (`PlanningCard`, `TicketCard`, `UserVoteCard`), filters, toggles, form wrappers.

### 🧩 Logic & Feature Blocks (`src/components/features`)
Feature blocks are domain-specific sections of pages. They contain business logic, state management, and direct service hookups (like real-time Firebase listeners or global synth state).
- **Rules**:
  - Can manage complex user interactions, forms submission, or audio/data synchs.
  - Can communicate with data services or Firebase, but keep action handlers as props where possible to simplify testing.
  - Form distinct functional sections of the page layout.
- **Examples**: `PlanningBoard`, `RetroBoard`, `RoomHeader`, `UserSidebar`, `TicketSidebar`, `FocusMusicPlayer`, `LandingNavbar`.

### 📐 Structural Layout Shells (`src/components/layouts`)
Layouts are structural shell wrappers that organize ui and features into layouts, specifying the grids, paddings, and margins.
- **Rules**:
  - Must be **stateless** and focus solely on the responsive visual layout slots (using React `children` or specific slot props).
  - Contain no business logic, no hooks, and no async API calls.
- **Examples**: `LandingLayout`, `RoomLayout`.

### 🛡️ Providers (`src/components/providers`)
Providers hold global React contexts, theme providers, or third-party wrappers that need to wrap the application lifecycle.
- **Examples**: `ThemeProvider`.

---

## 2. Component Design & Best Practices

1. **Keep Component Files Focused**:
   - Save the component in a file named `ComponentName.tsx`.
   - Keep helper sub-components or internal items in the same file if they aren't reused elsewhere; extract them to `src/components/ui/` if they become reusable.

2. **Clean Named Exports**:
   - Use named exports: `export function ComponentName() {}` instead of default exports.
   - Use a barrel export file `index.ts` in each directory to simplify importing:
     ```typescript
     // src/components/ui/index.ts
     export * from "./PlanningCard";
     export * from "./ThemeToggle";
     ```

3. **Style Customization & Merging**:
   - Always merge incoming classes with local defaults using `cn`:
     ```tsx
     import { cn } from "@/lib/utils";
     
     interface Props {
       className?: string;
     }
     
     export function Button({ className, ...props }: Props) {
       return (
         <button className={cn("px-4 py-2 rounded-xl bg-indigo-500 text-white transition-all", className)} {...props}>
           Submit
         </button>
       );
     }
     ```

4. **Path Aliases for Imports**:
   - Use custom configured path aliases to write clean imports:
     ```typescript
     // Good:
     import { PlanningCard } from "@/ui";
     import { RoomHeader } from "@/features";
     import { RoomLayout } from "@/layouts";
     ```
