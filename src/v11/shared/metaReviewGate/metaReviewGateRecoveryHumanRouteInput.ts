import type { LoadedStateSnapshot } from "../ports/stateSnapshots.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import { resolveFindingsParityMetadataFromReportJson } from "./metaReviewGateFindingsMetadata.js";
import type { PersistHumanGateRouteInput } from "./metaReviewGateShared.js";

export interface RecoveryHumanRouteContextInput {
  appendEnvelope: PersistHumanGateRouteInput["appendEnvelope"];
  writeState: PersistHumanGateRouteInput["writeState"];
  now: PersistHumanGateRouteInput["now"];
  nowIso: PersistHumanGateRouteInput["nowIso"];
  refs: PersistHumanGateRouteInput["refs"];
  lockPath: PersistHumanGateRouteInput["lockPath"];
  resolved: {
    bubbleId: string;
    bubblePaths: {
      statePath: string;
      transcriptPath: string;
      inboxPath: string;
    };
  };
}

export function buildRecoveryHumanRoutePersistenceInput(input: {
  context: RecoveryHumanRouteContextInput;
  summary: string;
  loaded: LoadedStateSnapshot;
  expectedState: BubbleStateSnapshot["state"];
  route: PersistHumanGateRouteInput["route"];
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  targetState?: PersistHumanGateRouteInput["targetState"];
  stickyHumanGate?: PersistHumanGateRouteInput["stickyHumanGate"];
  rollbackStateOnAppendFailure?: PersistHumanGateRouteInput["rollbackStateOnAppendFailure"];
}): PersistHumanGateRouteInput {
  return {
    appendEnvelope: input.context.appendEnvelope,
    writeState: input.context.writeState,
    statePath: input.context.resolved.bubblePaths.statePath,
    transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
    inboxPath: input.context.resolved.bubblePaths.inboxPath,
    lockPath: input.context.lockPath,
    now: input.context.now,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    summary: input.summary,
    refs: input.context.refs,
    loaded: input.loaded,
    expectedState: input.expectedState,
    route: input.route,
    metaReviewRun: input.runResultForRouting,
    parityMetadata:
      input.parityMetadata ??
      resolveFindingsParityMetadataFromReportJson(input.runResultForRouting.report_json),
    ...(input.targetState !== undefined ? { targetState: input.targetState } : {}),
    ...(input.stickyHumanGate !== undefined ? { stickyHumanGate: input.stickyHumanGate } : {}),
    ...(input.rollbackStateOnAppendFailure !== undefined
      ? { rollbackStateOnAppendFailure: input.rollbackStateOnAppendFailure }
      : {})
  };
}
