---
name: react-clean-architecture
description: >-
  Project-scoped standard enforcing Clean Architecture, SOLID principles, Separation of Concerns,
  Dumb UI components, Zod schema validation, Zustand state stores, standardized 1:1 feature folder structure, and mandatory feature audit protocol for React/Next.js.
  Automatically active for all frontend feature modifications in this workspace.
---

# React Clean Architecture & Feature Standard (Project Scope)

This skill defines the mandatory architectural standard and audit protocol for all React and Next.js feature development in this repository. It ensures maximum maintainability, testability, separation of concerns, and clean code hygiene.

---

## 🏗️ Mandatory Feature Folder Structure

Every feature directory under `apps/web/src/features/<feature-name>/` MUST strictly adhere to this folder layout. **No loose implementation files are permitted at the feature root level — only `index.ts` and `types.ts` belong at the root.**

```
apps/web/src/features/<feature-name>/
├── components/           # Dumb, presentational React components (UI layout only)
│   ├── <sub-folder>/     # Directory for large components requiring their own hook
│   │   ├── <name>.tsx    # Dumb UI layout component
│   │   └── use-<name>.ts # Component-specific UI hook (effects, DOM refs, observers)
│   └── <name>.tsx        # Presentational component
├── hooks/                # Feature-level React hooks (state orchestration & event listeners)
│   ├── use-<feature>.ts  # Top-level page orchestrator hook
│   └── use-<aspect>.ts   # Aspect-specific custom hook (e.g. use-timeline, use-billing)
├── lib/                  # Pure domain logic, algorithms, engines, and formatters
│   ├── <engine>.ts       # Deterministic pure functions (zero React/DOM dependencies)
│   └── <helpers>.ts
├── services/             # Pure API service layer (fetchers, mutators, uploaders)
│   └── <feature>-api.ts  # Isolated backend API request functions
├── schemas/              # Zod validation schemas for all user inputs & payloads
│   └── <feature>-schemas.ts
├── stores/               # Zustand state stores for reactive UI/interaction state
│   └── use-<feature>-store.ts
├── pages/                # Clean top-level page orchestrator (<200 lines)
│   └── <feature>-page.tsx
├── types.ts              # Core TypeScript interfaces & data models
└── index.ts              # Single public barrel export file at feature root
```

---

## 🔍 Mandatory Feature Audit Protocol

Whenever creating, refactoring, or completing any feature task, the AI agent **MUST automatically perform this 5-point Audit Protocol before declaring completion**:

1. **Root Directory Hygiene Audit**:
   - Verify `src/features/<feature-name>/` contains ONLY `index.ts` and `types.ts` at the root level.
   - Confirm zero loose `.tsx`, `.ts`, or test files exist at the feature root.

2. **SOLID & Dumb UI Audit**:
   - Verify components in `components/` are purely presentational and do NOT invoke direct `fetch()` or `api()` calls.
   - Confirm large components with internal DOM refs/observers have extracted co-located hooks (`components/<name>/use-<name>.ts`).

3. **Zod Validation Audit**:
   - Verify all form inputs, text fields, sliders, or user mutation payloads pass through a Zod schema in `schemas/<feature>-schemas.ts`.

4. **Zustand & Toast Feedback Audit**:
   - Verify cross-component interactive UI states are managed in `stores/use-<feature>-store.ts`.
   - Verify all mutations provide user-facing feedback (`toast.success` and `toast.error`).

5. **Typecheck & Empirical Verification Audit**:
   - Run `pnpm --filter web typecheck` (or `npx tsc --noEmit`) to empirically verify **0 TypeScript errors** before declaring completion.
