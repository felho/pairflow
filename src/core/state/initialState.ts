// Temporary bridge: Phase 5 S1 moved canonical initial-state ownership to
// `src/v11/domain/state/initialState.ts`. Remove this shim once legacy
// `src/core/**` callers are migrated.
export * from "../../v11/domain/state/initialState.js";
