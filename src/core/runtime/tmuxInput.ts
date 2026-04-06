// Temporary bridge: Phase 5 C1 moved canonical tmux input ownership to
// `src/v11/infrastructure/channel/tmux/tmuxInput.ts`. Remove this shim once
// legacy core imports are migrated.
export * from "../../v11/infrastructure/channel/tmux/tmuxInput.js";
