import type { AppendProtocolEnvelopePort } from "../../../../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleLifecycleState } from "../../../../../contracts/kernel/lifecycle.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import type { Finding } from "../../../../../contracts/kernel/findings.js";
import type { FindingsParityMetadata } from "../../../../shared/metaReviewGate/findingsParityMetadataContract.js";
import type { MetaReviewResult } from "../../../../shared/metaReview/metaReviewTypes.js";
import type { MetaReviewGateResult } from "../../../../shared/metaReviewGate/metaReviewGateResultContract.js";

export interface AutoReworkFinalizeInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: {
      watchdog_timeout_minutes: number;
      agents: {
        implementer: AgentName;
        reviewer: AgentName;
        meta_reviewer: AgentName;
      };
    };
    bubblePaths: {
      inboxPath: string;
      locksDir: string;
      statePath: string;
      transcriptPath: string;
    };
  };
  loaded: LoadedStateSnapshot;
  now: Date;
  refs: string[];
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
}

export interface PersistDispatchFailedHumanRouteInput {
  loaded: LoadedStateSnapshot;
  expectedState: BubbleLifecycleState;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  fallbackReason: string;
  rollbackStateOnAppendFailure?: BubbleStateSnapshot;
}

export interface DispatchAutoReworkInput {
  finalizeInput: AutoReworkFinalizeInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  findingsForPayload: Finding[] | undefined;
  reworkTargetMessage?: string;
  persistDispatchFailedHumanRoute: (
    input: PersistDispatchFailedHumanRouteInput
  ) => Promise<MetaReviewGateResult>;
}
