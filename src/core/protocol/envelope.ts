// Temporary bridge: Phase 5 A1 moved canonical protocol envelope semantics to
// `src/v11/shared/protocol/envelope.ts`. Remove this shim once legacy
// `src/core/**` callers are migrated.
export * from "../../v11/shared/protocol/envelope.js";
