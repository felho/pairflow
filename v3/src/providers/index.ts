// The runtime-context provider module home (packet ch9-p2; ADR-014 point 4:
// `src/providers/` is born WITH the first real provider). Production code
// imports THIS module (never testkit); the composition roots wire the
// worktree provider into the production `ProviderRegistry` (R1).
// packet ch9-p3b, T1: `enc` RELOCATED to runner/enc.ts (the ONE authority);
// providers/ KEEPS re-exporting it from the new home (extend-don't-fork — zero
// consumer breakage).
export { enc } from "../runner/enc.js";
export { createWorktreeProvider } from "./worktreeProvider.js";
export type { WorktreeProvider, WorktreeProviderOptions } from "./worktreeProvider.js";
