// Temporary bridge: Phase 5 S1 moved canonical state store ownership to
// `src/v11/infrastructure/state/stateStore.ts`. Remove this shim once
// legacy `src/core/**` callers are migrated.
export * from "../../v11/infrastructure/state/stateStore.js";
