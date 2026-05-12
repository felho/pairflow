import type { AppendProtocolEnvelopePort } from "../../../../ports/transcript.js";
import type {
  LoadedDomainStateSnapshot,
  WriteDomainStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { Finding } from "../../../../../types/findings.js";
import type { FindingsParityMetadata } from "../../../../../types/protocol.js";
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
  loaded: LoadedDomainStateSnapshot;
  now: Date;
  refs: string[];
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteDomainStateSnapshotPort;
}

export interface PersistDispatchFailedHumanRouteInput {
  loaded: LoadedDomainStateSnapshot;
  expectedState: PersistedBubbleStateSnapshot["state"];
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
  fallbackReason: string;
  rollbackStateOnAppendFailure?: PersistedBubbleStateSnapshot;
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
