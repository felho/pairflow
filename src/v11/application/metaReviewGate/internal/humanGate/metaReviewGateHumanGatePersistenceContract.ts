import type { MetaReviewRecommendation } from "../../../../shared/metaReview/metaReviewTypes.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { MetaReviewResult } from "../../../../shared/metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../../../types/protocol.js";
import type { AppendProtocolEnvelopePort } from "../../../../ports/transcript.js";
import type {
  MetaReviewGateRoute,
  MetaReviewGateThresholdMetadata
} from "../../../../shared/metaReviewGate/metaReviewGateRouteContract.js";
import type { MetaReviewGateAdvisoryFinding } from "../../../../domain/metaReviewGate/findingsSplit.js";

export interface PersistHumanGateRouteInput {
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  summary: string;
  refs: string[];
  metaReviewerAgent: AgentName;
  loaded: LoadedStateSnapshot;
  expectedState: PersistedBubbleStateSnapshot["state"];
  route: MetaReviewGateRoute;
  metaReviewRun?: MetaReviewResult;
  parityMetadata?: FindingsParityMetadata | null;
  thresholdMetadata?: MetaReviewGateThresholdMetadata;
  gateReasonCode?: string;
  findings?: MetaReviewGateAdvisoryFinding[];
  fallbackRecommendation?: MetaReviewRecommendation;
  targetState?: "READY_FOR_HUMAN_APPROVAL" | "RUNNING";
  stickyHumanGate?: boolean;
  consecutiveCleanRuns?: number;
  rollbackStateOnAppendFailure?: PersistedBubbleStateSnapshot;
}
