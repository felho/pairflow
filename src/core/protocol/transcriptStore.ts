// Temporary bridge: Phase 5 A1 moved canonical transcript persistence ownership
// to `src/v11/infrastructure/artifact/transcript/transcriptStore.ts`. Remove
// this shim once legacy `src/core/**` callers are migrated.
export * from "../../v11/infrastructure/artifact/transcript/transcriptStore.js";
