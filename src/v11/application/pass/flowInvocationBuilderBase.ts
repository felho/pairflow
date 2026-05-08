import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import type { EnsureBubbleInstanceIdForMutationResult } from "../../ports/bubbleIdentity.js";
import type { ResolvedBubbleWorkspace } from "../../ports/workspaceResolution.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PreparePassRoutingResult } from "./passRoutingPreparation.js";
import type { ResolvedPassHandoff } from "../../domain/pass/handoff.js";
import type { PassActivationProvenance } from "./passCommandContract.js";

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
    "bubbleId" | "bubbleConfig" | "bubblePaths" | "repoPath" | "worktreePath"
  >;
  bubbleIdentity: Pick<EnsureBubbleInstanceIdForMutationResult, "bubbleInstanceId">;
  handoff: ResolvedPassHandoff;
  reviewer: ResolvedPassHandoff["senderAgent"];
  implementer: ResolvedPassHandoff["recipientAgent"];
  state: BubbleStateSnapshot;
  loadedState: Pick<LoadedStateSnapshot, "fingerprint">;
  activation?: PassActivationProvenance;
  passRouting: PreparePassRoutingResult;
  createError: PairflowCreateCommandError;
}
