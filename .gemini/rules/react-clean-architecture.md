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

## 🛡️ Verification Command
Always run `pnpm --filter web typecheck` after edits to verify 0 TypeScript errors.
