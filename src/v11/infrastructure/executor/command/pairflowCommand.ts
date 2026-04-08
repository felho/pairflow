import { attachBubble, asAttachBubbleError, executeAttachCommand } from "./pairflowCommandAttach.js";

export type { PairflowCommandPathAssessment, PairflowCommandPathStatus } from "../../../shared/ports/pairflowCommand.js";
export { assessPairflowCommandPath, resolveExternalPairflowCommand, resolveWorktreePairflowEntrypoint } from "./pairflowCommandPathAssessment.js";
export { buildPairflowCommandBootstrap, buildPairflowCommandGuidance, buildPinnedPairflowCommand } from "./pairflowCommandBootstrap.js";
export { attachBubble, asAttachBubbleError, attachBubble as attachBubbleV11, asAttachBubbleError as asAttachBubbleErrorV11, executeAttachCommand };
