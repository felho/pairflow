// Temporary bridge: Phase 5 A1 moved canonical transcript sequence semantics to
// `src/v11/shared/protocol/sequenceAllocator.ts`. Remove this shim once legacy
// `src/core/**` callers are migrated.
export * from "../../v11/shared/protocol/sequenceAllocator.js";
