// Port-parametric kernel: imports domain/ and ports/ ONLY (ADR-001).
// No store, adapter, or clock import — lint-enforced from ch 3.
// L0b content: packet ch4-P3.
export { createKernel } from "./kernel.js";
export type { Kernel, KernelDeps } from "./kernel.js";
export { deriveDispatchIntent } from "./dispatchIntent.js";
export type { StartInstanceInput } from "./start.js";
