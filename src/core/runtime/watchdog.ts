// Temporary bridge: Phase 5 S2/X2 moved canonical watchdog status ownership to
// `src/v11/shared/watchdog/watchdogStatus.ts`. Remove this shim once legacy
// core imports are migrated.
export * from "../../v11/shared/watchdog/watchdogStatus.js";
