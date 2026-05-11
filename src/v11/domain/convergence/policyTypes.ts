import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleReviewLoopMode
} from "../../shared/reviewPolicy/reviewPolicyTypes.js";
import type {
  ReviewArtifactType
} from "../../shared/config/bubbleConfigVocabulary.js";
import type {
  RoundRoleHistoryEntry
} from "../../domain/state/roundRoleHistoryTypes.js";
import type { FindingPriority } from "../../../types/findings.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface ConvergencePolicyInput {
  currentRound: number;
  reviewer: AgentName;
  implementer: AgentName;
  reviewArtifactType: ReviewArtifactType;
  roundRoleHistory: RoundRoleHistoryEntry[];
  transcript: ProtocolEnvelope[];
  severity_gate_round: number;
  effectiveLoopMode?: BubbleReviewLoopMode;
}

export interface ConvergencePolicyResult {
  ok: boolean;
  errors: string[];
  diagnostics: string[];
}

export interface ReviewerFindingsAggregate {
  missing: boolean;
  invalid: boolean;
  findingCount: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  highestEffectivePriority: FindingPriority | null;
  hasBlocking: boolean;
  hasNonBlocking: boolean;
}
