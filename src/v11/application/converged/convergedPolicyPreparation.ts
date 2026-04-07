import { type ReadTranscriptEnvelopesPort } from "../../shared/ports/transcript.js";
import {
  validateConvergencePolicy,
  type ConvergencePolicyResult
} from "../../../v11/domain/convergence/policy.js";
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
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  validateConvergencePolicy?: typeof validateConvergencePolicy;
}

export interface PrepareConvergedPolicyResult {
  transcript: ProtocolEnvelope[];
  policy: ConvergencePolicyResult;
  convergencePolicyDiagnostics: string[];
}

export class PrepareConvergedPolicyDependencyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PrepareConvergedPolicyDependencyError";
  }
}

export async function prepareConvergedPolicy(
  input: PrepareConvergedPolicyInput,
  dependencies: PrepareConvergedPolicyDependencies = {}
): Promise<PrepareConvergedPolicyResult> {
  const readTranscript = dependencies.readTranscriptEnvelopes;
  const validatePolicy =
    dependencies.validateConvergencePolicy ?? validateConvergencePolicy;

  if (readTranscript === undefined) {
    throw new PrepareConvergedPolicyDependencyError(
      "prepareConvergedPolicy requires readTranscriptEnvelopes dependency."
    );
  }

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
