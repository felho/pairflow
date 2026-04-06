// Temporary bridge: Phase 5 C1 split canonical runtime session ownership
// between the executor session registry and channel tmux pane binding modules.
// Remove this shim once legacy core imports are migrated.
export * from "../../v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
export * from "../../v11/infrastructure/channel/tmux/metaReviewerPaneBinding.js";
