import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type {
  MetaReviewSubmissionPayload,
  ProtocolEnvelope
} from "../../../types/protocol.js";
import type { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import type { readRuntimeSessionsRegistry } from "../../../core/runtime/sessionsRegistry.js";
import type {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../core/state/stateStore.js";
import type { MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateTypes.js";
import type { recoverMetaReviewGateFromSnapshot } from "../metaReviewGate/metaReviewGateRecovery.js";
import type {
  MetaReviewDeliveryEmitter,
  MetaReviewDeliveryMessageRefBuilder
} from "./metaReviewDeliveryCapabilities.js";
import type {
  MetaReviewArtifactReadPort,
  MetaReviewArtifactWritePort
} from "./metaReviewArtifactIo.js";
import type { MetaReviewResult } from "./metaReviewTypes.js";

export type {
  MetaReviewDepth,
  MetaReviewLastReportView,
  MetaReviewResult,
  MetaReviewRunWarning,
  MetaReviewStatusView
} from "./metaReviewTypes.js";

export interface MetaReviewReadInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}

export interface MetaReviewSubmitInput extends MetaReviewReadInput {
  round: number;
  recommendation: MetaReviewSubmissionPayload["recommendation"];
  summary: string;
  rework_target_message?: string | null;
  report_json: Record<string, unknown>;
  refs?: string[];
  expectedHandoffId?: string;
  expectedRole?: "implementer" | "reviewer" | "meta_reviewer";
  expectedRound?: number;
  expectedStateFingerprint?: string;
}

export interface MetaReviewCommandDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  readStateSnapshot?: typeof readStateSnapshot;
  writeStateSnapshot?: typeof writeStateSnapshot;
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  readRuntimeSessionsRegistry?: typeof readRuntimeSessionsRegistry;
  emitDeliveryNotification?: MetaReviewDeliveryEmitter;
  buildDeliveryMessageRef?: MetaReviewDeliveryMessageRefBuilder;
  readFile?: MetaReviewArtifactReadPort;
  writeFile?: MetaReviewArtifactWritePort;
  now?: Date;
  randomUUID?: () => string;
  recoverMetaReviewGateFromSnapshot?: typeof recoverMetaReviewGateFromSnapshot;
}

export type MetaReviewSubmitResult = Omit<
  MetaReviewResult,
  "bubble_id" | "report_json"
> & {
  bubbleId: string;
  lifecycle_state: BubbleStateSnapshot["state"];
  report_json: Record<string, unknown>;
  gate_route: MetaReviewGateRoute;
  gate_sequence: number;
  gate_envelope_type: ProtocolEnvelope["type"];
};
