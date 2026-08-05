# RioCut — Claude Code Guidelines & Clean Architecture Standard

This project enforces strict **Clean Architecture**, **SOLID principles**, **Zod validation**, **Zustand state management**, and **100% Separation of Concerns**.

---

## 🏗️ Mandatory Feature Folder Structure

Every feature directory under `apps/web/src/features/<feature-name>/` MUST strictly follow this layout. **No loose implementation files are permitted at the feature root level — only `index.ts` and `types.ts` belong at the root.**

```
apps/web/src/features/<feature-name>/
├── components/           # Dumb presentational React components (UI layout only)
│   ├── <sub-folder>/     # Subdirectory for large components requiring their own hook
│   │   ├── <name>.tsx    # Dumb UI component
│   │   └── use-<name>.ts # Component-specific UI hook (effects, DOM refs, observers)
│   └── <name>.tsx        # Presentational component
├── hooks/                # Feature-level React hooks (state orchestration & keybindings)
│   ├── use-<feature>.ts  # Main feature page orchestrator hook
│   └── use-<aspect>.ts   # Domain/UI specific custom hook (e.g. use-timeline, use-billing)
├── lib/                  # Pure domain logic, algorithms, engines, and formatters
│   ├── <engine>.ts       # Deterministic pure functions (zero React/DOM dependencies)
│   └── <helpers>.ts
├── services/             # Pure API service layer (fetchers, mutators, uploaders)
│   └── <feature>-api.ts  # Isolated backend API request functions
├── schemas/              # Zod validation schemas for all user inputs & payloads
│   └── <feature>-schemas.ts
├── stores/               # Zustand state stores for reactive UI/interaction state
│   └── use-<feature>-store.ts
├── pages/                # Top-level page view orchestrator (<200 lines)
│   └── <feature>-page.tsx
├── types.ts              # Core TypeScript interfaces & data models
└── index.ts              # Single public barrel export file at feature root
```

---

## 🛡️ Core Rules for Claude Code

1. **Dumb UI Components**: UI components inside `components/` MUST be purely presentational. They emit callbacks and render UI. They do not execute `fetch()`, direct API requests, or complex state loops.
2. **Zod Validation**: Every form, text field, numeric slider, or user payload MUST pass through a Zod schema in `schemas/<feature>-schemas.ts`.
3. **Zustand State Stores**: Interactive cross-component UI states (active selection, playhead, active tab, tool panel toggles, modal open state) MUST be managed in `stores/use-<feature>-store.ts`.
4. **Pure Services**: All API requests MUST be isolated inside `services/<feature>-api.ts`.
5. **Zero Root Clutter**: Never leave loose component files or API files at `src/features/<feature-name>/`. Only `index.ts` and `types.ts` exist at root.
6. **Typecheck Rule**: Always run `pnpm --filter web typecheck` after refactoring to ensure 0 TypeScript errors.
