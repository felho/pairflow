// Temporary bridge: Phase 5 S1 moved canonical execution-context ownership to
// `src/v11/shared/state/executionContext.ts`. Remove this shim once legacy
// `src/core/**` callers are migrated.
export * from "../../v11/shared/state/executionContext.js";
