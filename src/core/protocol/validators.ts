// Temporary bridge: Phase 5 A1 moved canonical protocol validation semantics to
// `src/v11/shared/protocol/validators.ts`. Remove this shim once legacy
// `src/core/**` callers are migrated.
export * from "../../v11/shared/protocol/validators.js";
