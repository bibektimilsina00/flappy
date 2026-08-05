# RioCut — Claude Code Guidelines & Clean Architecture Standard

This project enforces strict **Clean Architecture**, **SOLID principles**, **Zod validation**, **Zustand state management**, **100% Separation of Concerns**, and a **Mandatory Self-Audit Protocol**.

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

## 🔍 Mandatory Self-Audit Protocol Before Completion

Before declaring any feature work completed, Claude Code MUST execute this 5-point audit:

1. **Root Hygiene**: Confirm feature root contains zero loose files except `index.ts` and `types.ts`.
2. **Dumb UI**: Confirm components in `components/` perform zero direct API requests.
3. **Zod Validation**: Confirm input payloads pass through Zod schemas in `schemas/`.
4. **Zustand & Toasts**: Confirm interactive UI state uses Zustand stores and mutations show toast feedback.
5. **Typecheck Verification**: Run `pnpm --filter web typecheck` and verify 0 errors.
