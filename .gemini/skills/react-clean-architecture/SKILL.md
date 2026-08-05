---
name: react-clean-architecture
description: >-
  Project-scoped standard enforcing Clean Architecture, SOLID principles, Separation of Concerns,
  Dumb UI components, Zod schema validation, Zustand state stores, and standardized 1:1 feature folder structure for React/Next.js.
  Automatically active for all frontend feature modifications in this workspace.
---

# React Clean Architecture & Feature Standard (Project Scope)

This skill defines the mandatory architectural standard for all React and Next.js feature development in this repository. It ensures maximum maintainability, testability, separation of concerns, and clean code hygiene.

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

## 🛡️ Core Architectural Principles

### 1. Single Responsibility & Separation of Concerns (SOLID)
- **Dumb Presentational UI (`components/`)**:
  - UI components MUST be purely presentational.
  - No direct `fetch()` or `api()` calls.
  - No complex `useEffect` synchronization loops or gesture state machines.
  - Accept values and callback props (or consume Zustand selectors) exclusively.
- **Custom Hooks (`hooks/`)**:
  - Encapsulate React lifecycles, event listeners, keyboard shortcuts, and state orchestration.
  - Keep page components small (<200 lines).
- **API Services (`services/`)**:
  - Exclusively perform HTTP requests (`api<T>()`), file uploads, and payload transformations.
  - Pure functions returning Promises.
- **Pure Domain Engine (`lib/`)**:
  - Pure functions with zero React or DOM dependencies. Given input $A$, always return output $B$.
  - Essential for complex logic (magnetic timeline, graph operations, calculations).

---

### 2. Zod Schema Validation Standard (`schemas/`)
- **Mandatory Input Validation**: Every user input field (text inputs, numeric sliders, form submissions, query parameters) MUST be validated through a Zod schema in `schemas/`.
- **Parsing Rules**:
  - Use `.parse()` when executing mutations where invalid data should halt execution and trigger error feedback (e.g., Sonner toast).
  - Use `.safeParse()` for live inline input validation inside handlers.

---

### 3. Zustand Reactive State Store (`stores/`)
- **Use Zustand for Interactive UI State**:
  - Cross-component UI interaction states (e.g. active playhead, selection set, zoom level, open modals, tool drawer collapsed, drag gesture state machine) MUST be managed via Zustand.
  - Eliminates prop-drilling across multi-level component trees.
- **Use React Query for Server State**:
  - Server data caching, revalidation, and API mutations belong in React Query (`useQuery`, `useMutation`). Do NOT cache server API responses inside Zustand.

---

### 4. Zero Feature Root Clutter
- **Strict Prohibition**: Never create loose `.tsx` or `.ts` implementation files directly inside `src/features/<feature-name>/`.
- **Allowed Root Files**: ONLY `index.ts` (barrel export) and `types.ts` (type definitions) are permitted at the root level of a feature.
