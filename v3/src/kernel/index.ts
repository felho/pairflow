// Port-parametric kernel: imports domain/ and ports/ ONLY (ADR-001).
// No store, adapter, or clock import — lint-enforced from ch 3.
// L0b content: packet ch4-P3.
export { createKernel } from "./kernel.js";
export type { Kernel, KernelDeps } from "./kernel.js";
export { deriveDispatchIntent } from "./dispatchIntent.js";
// The L0c run-profile cascade (packet ch12-p2) — a shared pure unit both
// dispatch and commit resolve through.
export { resolveAgentConfig } from "./agentConfig.js";
// The lifecycle entry family (packet ch12-p1b) — the ch-4 one-shot's
// StartInstanceInput retired with it (C24).
export type { CancelInput, CreateInput, KickoffInput, StartInput } from "./lifecycle.js";
