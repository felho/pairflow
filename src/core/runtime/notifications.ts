// Temporary bridge: Phase 5 C1 moved canonical channel notification ownership
// to `src/v11/infrastructure/channel/notifications.ts`. Remove this shim once
// legacy core imports are migrated.
export * from "../../v11/infrastructure/channel/notifications.js";
