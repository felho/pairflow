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
// ch14-p2a: the arrival spine's three modules. The ONE target-entry rule
// every arrival applies, the post-commit selection that reads the status
// it set, and the Ask derivation — each named here rather than reached
// through a deep path, the convention this barrel already follows.
export { applyTargetEntryEffects } from "./arrival.js";
export type { ArrivalDeps, ArrivalFrom, ArrivingEntry } from "./arrival.js";
export { postCommitOutput } from "./postCommitOutput.js";
// ch14-p3a (F4): the Ask derivation MOVED to `domain/`; the barrel keeps
// naming it, because the kernel's consumers reach it here.
export { humanDecisionRequest, requiredFields } from "../domain/index.js";
// ch14-p2b: the two operator intents — the third entry class. Their
// kernel-side INPUT types carry the nominal `intent` discriminator that
// realizes the class separation (Q9), so they are named here rather
// than reached through a deep path.
export { resumeWait, submitDecision } from "./operatorIntents.js";
export type {
  OperatorIntentDeps,
  ResumeWaitInput,
  SubmitDecisionInput,
} from "./operatorIntents.js";
