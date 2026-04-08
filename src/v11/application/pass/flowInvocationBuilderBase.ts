import type { LoadedStateSnapshot } from "../../shared/ports/stateSnapshots.js";
import type { EnsureBubbleInstanceIdForMutationResult } from "../../shared/ports/bubbleIdentity.js";
import type { ResolvedBubbleWorkspace } from "../../shared/ports/workspaceResolution.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PreparePassRoutingResult } from "./passRoutingPreparation.js";
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
  createError: PairflowCreateCommandError;
}
