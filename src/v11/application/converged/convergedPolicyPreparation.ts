import { type ReadTranscriptEnvelopesPort } from "../../ports/transcript.js";
import {
  validateConvergencePolicy,
  type ConvergencePolicyResult
} from "../../../v11/domain/convergence/policy.js";import type {
  AgentName
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  BubbleReviewLoopMode,
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
  effectiveLoopMode: BubbleReviewLoopMode;
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

export interface PrepareConvergedPolicyDependencyErrorContext {
  source: "prepare_converged_policy";
  missingDependency: "readTranscriptEnvelopes";
  transcriptPath: string;
}

export class PrepareConvergedPolicyDependencyError extends Error {
  public readonly context:
    | PrepareConvergedPolicyDependencyErrorContext
    | undefined;

  public constructor(
    input:
      | string
      | {
        message: string;
        context?: PrepareConvergedPolicyDependencyErrorContext | undefined;
      }
  ) {
    const normalized =
      typeof input === "string" ? { message: input, context: undefined } : input;
    super(normalized.message);
    this.name = "PrepareConvergedPolicyDependencyError";
    this.context = normalized.context;
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
    throw new PrepareConvergedPolicyDependencyError({
      message: "prepareConvergedPolicy requires readTranscriptEnvelopes dependency.",
      context: {
        source: "prepare_converged_policy",
        missingDependency: "readTranscriptEnvelopes",
        transcriptPath: input.transcriptPath
      }
    });
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
    severity_gate_round: input.severityGateRound,
    effectiveLoopMode: input.effectiveLoopMode
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
