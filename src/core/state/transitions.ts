// Temporary bridge: Phase 5 S1 moved canonical transition policy ownership to
// `src/v11/domain/state/transitions.ts`. Remove this shim once legacy
// `src/core/**` callers are migrated.
export * from "../../v11/domain/state/transitions.js";
