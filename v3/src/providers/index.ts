// The runtime-context provider module home (packet ch9-p2; ADR-014 point 4:
// `src/providers/` is born WITH the first real provider). Production code
// imports THIS module (never testkit); the composition roots wire the
// worktree provider into the production `ProviderRegistry` (R1).
export { createWorktreeProvider, enc } from "./worktreeProvider.js";
export type { WorktreeProvider, WorktreeProviderOptions } from "./worktreeProvider.js";
