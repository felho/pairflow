// Temporary bridge: Phase 5 S1 moved canonical state schema ownership to
// `src/v11/shared/state/stateSchema.ts`. Remove this shim once legacy
// `src/core/**` callers are migrated.
export * from "../../v11/shared/state/stateSchema.js";
