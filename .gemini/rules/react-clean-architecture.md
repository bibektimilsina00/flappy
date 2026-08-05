# MANDATORY REACT CLEAN ARCHITECTURE RULE (RioCut Workspace)

ALWAYS follow this rule whenever creating, editing, refactoring, or reviewing frontend feature code in this repository.

## 🏗️ 1:1 Feature Architecture Standard
All code in `apps/web/src/features/<feature-name>/` MUST be structured cleanly into subdirectories:

1. `components/` -> Dumb presentational React components ONLY (emits callbacks, zero direct API calls or complex state loops).
2. `components/<sub-folder>/` -> For complex UI components requiring their own UI hook (`<name>.tsx` + `use-<name>.ts`).
3. `hooks/` -> State orchestration, keybindings, event listeners, and gesture state machines.
4. `services/` -> Pure API service layer (`<feature>-api.ts`) returning Promises.
5. `schemas/` -> Zod validation schemas for all user inputs & payload objects.
6. `stores/` -> Zustand state stores (`use-<feature>-store.ts`) for interactive UI states without prop drilling.
7. `lib/` -> Pure deterministic domain functions & engines (zero React/DOM imports).
8. `pages/` -> Concise page orchestrator (<200 lines).
9. Root of Feature: **ONLY `index.ts` and `types.ts` are permitted at the root level.**

## 🔍 MANDATORY FEATURE AUDIT PROTOCOL
Before declaring any feature work finished, the AI agent MUST perform this 5-step self-audit:
1. **Root Hygiene**: Check feature root has zero loose files except `index.ts` and `types.ts`.
2. **Dumb UI**: Check `components/` perform zero direct API requests.
3. **Zod Validation**: Check input payloads pass through Zod schemas in `schemas/`.
4. **Zustand & Toasts**: Check interactive UI state uses Zustand stores and mutations show toasts.
5. **Typecheck Verification**: Execute `pnpm --filter web typecheck` and ensure 0 errors.
