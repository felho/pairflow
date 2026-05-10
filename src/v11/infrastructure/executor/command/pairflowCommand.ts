import { attachBubble, asAttachBubbleError, executeAttachCommand } from "./pairflowCommandAttach.js";

export type { PairflowCommandPathAssessment, PairflowCommandPathStatus } from "../../../ports/pairflowCommand.js";
export { assessPairflowCommandPath, resolveExternalPairflowCommand, resolveWorktreePairflowEntrypoint } from "../../../shared/command/pairflowCommandPathAssessment.js";
export { buildPairflowCommandBootstrap, buildPairflowCommandGuidance, buildPinnedPairflowCommand } from "../../../shared/command/pairflowCommandBootstrap.js";
export { attachBubble, asAttachBubbleError, executeAttachCommand };
