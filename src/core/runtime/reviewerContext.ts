// Temporary bridge: Phase 5 C1 moved canonical reviewer tmux context ownership
// to `src/v11/infrastructure/channel/tmux/reviewerContext.ts`. Remove this shim
// once legacy core imports are migrated.
export * from "../../v11/infrastructure/channel/tmux/reviewerContext.js";
