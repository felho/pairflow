import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../../core/bubble/bubbleInstanceId.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PreparePassRoutingResult } from "../../application/pass/passRoutingPreparation.js";
import type { ResolvedPassHandoff } from "../../domain/pass/handoff.js";

export interface BuildFlowBaseInput {
  summary: string;
  refs: string[];
  now: Date;
  nowIso: string;
  findings: Finding[];
  hasFindings: boolean;
  noFindings: boolean;
  resolved: Pick<
    ResolvedBubbleWorkspace,
    "bubbleId" | "bubbleConfig" | "bubblePaths" | "repoPath"
  >;
  bubbleIdentity: Pick<EnsureBubbleInstanceIdForMutationResult, "bubbleInstanceId">;
  handoff: ResolvedPassHandoff;
  reviewer: ResolvedPassHandoff["senderAgent"];
  implementer: ResolvedPassHandoff["recipientAgent"];
  state: BubbleStateSnapshot;
  loadedState: Pick<LoadedStateSnapshot, "fingerprint">;
  passRouting: PreparePassRoutingResult;
  createError: (message: string) => Error;
}
