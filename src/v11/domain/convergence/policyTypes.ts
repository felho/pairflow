import type {
  AgentName,
  BubbleReviewLoopMode,
  ReviewArtifactType,
  RoundRoleHistoryEntry
} from "../../../types/bubble.js";
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
  hasBlocking: boolean;
  hasNonBlocking: boolean;
}
