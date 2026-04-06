// Temporary bridge: Phase 5 S1 moved canonical state machine ownership to
// `src/v11/domain/state/machine.ts`. Remove this shim once legacy
// `src/core/**` callers are migrated.
export * from "../../v11/domain/state/machine.js";
