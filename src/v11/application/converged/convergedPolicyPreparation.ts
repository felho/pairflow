import {
  readTranscriptEnvelopes,
  type ReadTranscriptOptions
} from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import {
  validateConvergencePolicy,
  type ConvergencePolicyResult
} from "../../../core/convergence/policy.js";
import type {
  AgentName,
  ReviewArtifactType,
  RoundRoleHistoryEntry
} from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface PrepareConvergedPolicyInput {
  transcriptPath: string;
  currentRound: number;
  reviewer: AgentName;
  implementer: AgentName;
  reviewArtifactType: ReviewArtifactType;
  roundRoleHistory: RoundRoleHistoryEntry[];
  severityGateRound: number;
}

export interface PrepareConvergedPolicyDependencies {
  readTranscriptEnvelopes?: (
    transcriptPath: string,
    options?: ReadTranscriptOptions
  ) => Promise<ProtocolEnvelope[]>;
  validateConvergencePolicy?: typeof validateConvergencePolicy;
}

export interface PrepareConvergedPolicyResult {
  transcript: ProtocolEnvelope[];
  policy: ConvergencePolicyResult;
  convergencePolicyDiagnostics: string[];
}

export async function prepareConvergedPolicy(
  input: PrepareConvergedPolicyInput,
  dependencies: PrepareConvergedPolicyDependencies = {}
): Promise<PrepareConvergedPolicyResult> {
  const readTranscript =
    dependencies.readTranscriptEnvelopes ?? readTranscriptEnvelopes;
  const validatePolicy =
    dependencies.validateConvergencePolicy ?? validateConvergencePolicy;

  const transcript = await readTranscript(input.transcriptPath, {
    allowMissing: true,
    toleratePartialFinalLine: true
  });
  const policy = validatePolicy({
    currentRound: input.currentRound,
    reviewer: input.reviewer,
    implementer: input.implementer,
    reviewArtifactType: input.reviewArtifactType,
    roundRoleHistory: input.roundRoleHistory,
    transcript,
    severity_gate_round: input.severityGateRound
  });
  const convergencePolicyDiagnostics = policy.diagnostics.filter(
    (entry) => entry.trim().length > 0
  );

  return {
    transcript,
    policy,
    convergencePolicyDiagnostics
  };
}
