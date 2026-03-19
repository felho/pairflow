import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import { WorkspaceResolutionError } from "../bubble/workspaceResolution.js";
import {
  toMetaReviewGateError,
  type MetaReviewGateRoute
} from "../bubble/metaReviewGate.js";
import type { PairflowCommandPathAssessment } from "../runtime/pairflowCommand.js";
import type {
  AgentName,
  BubbleStateSnapshot
} from "../../types/bubble.js";
import { type ProtocolEnvelope } from "../../types/protocol.js";
import {
  runConvergedFlow,
  type RunConvergedFlowDependencies
} from "../../v11/application/converged/runConvergedFlow.js";
import { prepareConvergedRouting } from "../../v11/application/converged/convergedRoutingPreparation.js";
import { prepareConvergedPolicy } from "../../v11/application/converged/convergedPolicyPreparation.js";
import { prepareConvergedValidation } from "../../v11/application/converged/convergedValidationPreparation.js";
import { executeConvergedExecution } from "../../v11/application/converged/convergedExecution.js";
import { finalizeConvergedFlow } from "../../v11/application/converged/convergedFinalization.js";

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
}

export interface EmitConvergedDependencies {
  emitTmuxDeliveryNotification?: RunConvergedFlowDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?: RunConvergedFlowDependencies["emitBubbleNotification"];
  applyMetaReviewGateOnConvergence?: RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?: RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"];
}

export interface EmitConvergedResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  gateRoute: MetaReviewGateRoute;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}

export class ConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConvergedCommandError";
  }
}

export function resolveMetaReviewRolloutBlockingReasonCodes(input: {
  gateRoute: MetaReviewGateRoute;
  metaReviewWarnings: Array<{ reason_code: string }>;
  commandPathStatus: PairflowCommandPathAssessment;
}): string[] {
  const codes = new Set<string>();

  if (input.gateRoute === "human_gate_run_failed") {
    codes.add("META_REVIEW_GATE_RUN_FAILED");
  }
  if (input.gateRoute === "human_gate_dispatch_failed") {
    codes.add("META_REVIEW_GATE_REWORK_DISPATCH_FAILED");
  }
  if (
    input.commandPathStatus.profile === "self_host"
    && input.commandPathStatus.status === "stale"
  ) {
    codes.add("PAIRFLOW_COMMAND_PATH_STALE");
  }
  if (
    input.commandPathStatus.profile === "self_host"
    && input.commandPathStatus.status === "unknown"
    && input.commandPathStatus.reasonCode === "PAIRFLOW_COMMAND_PATH_UNRESOLVED"
  ) {
    codes.add("PAIRFLOW_COMMAND_PATH_UNRESOLVED");
  }
  if (
    input.commandPathStatus.profile === "external"
    && input.commandPathStatus.reasonCode === "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
  ) {
    codes.add("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
  }
  for (const warning of input.metaReviewWarnings) {
    if (warning.reason_code === "META_REVIEW_RUNNER_ERROR") {
      codes.add("META_REVIEW_RUNNER_ERROR");
    }
  }

  return [...codes].sort((left, right) => left.localeCompare(right));
}

export async function emitConvergedFromWorkspace(
  input: EmitConvergedInput,
  dependencies: EmitConvergedDependencies = {}
): Promise<EmitConvergedResult> {
  const now = input.now ?? new Date();
  const summary = requireNonEmptyString(
    input.summary,
    "Convergence summary",
    (message) => new ConvergedCommandError(message)
  );
  const refs = normalizeStringList(input.refs ?? []);
  return runConvergedFlow(
    {
      summary,
      refs,
      now,
      ...(input.cwd !== undefined
        ? { cwd: input.cwd }
        : {}),
      ...(input.expectedStateFingerprint !== undefined
        ? { expectedStateFingerprint: input.expectedStateFingerprint }
        : {}),
      ...(input.expectedRound !== undefined
        ? { expectedRound: input.expectedRound }
        : {}),
      ...(input.expectedReviewer !== undefined
        ? { expectedReviewer: input.expectedReviewer }
        : {}),
      createError: (message) => new ConvergedCommandError(message),
      resolveMetaReviewRolloutBlockingReasonCodes
    },
    {
      prepareConvergedRouting,
      prepareConvergedPolicy,
      prepareConvergedValidation,
      executeConvergedExecution,
      finalizeConvergedFlow,
      ...(dependencies.applyMetaReviewGateOnConvergence !== undefined
        ? {
            applyMetaReviewGateOnConvergence:
              dependencies.applyMetaReviewGateOnConvergence
          }
        : {}),
      ...(dependencies.recoverMetaReviewGateFromSnapshot !== undefined
        ? {
            recoverMetaReviewGateFromSnapshot:
              dependencies.recoverMetaReviewGateFromSnapshot
          }
        : {}),
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? {
            emitTmuxDeliveryNotification:
              dependencies.emitTmuxDeliveryNotification
          }
        : {}),
      ...(dependencies.emitBubbleNotification !== undefined
        ? { emitBubbleNotification: dependencies.emitBubbleNotification }
        : {})
    }
  );
}

export function asConvergedCommandError(error: unknown): never {
  if (error instanceof ConvergedCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new ConvergedCommandError(error.message);
  }

  if (error instanceof Error && error.name === "MetaReviewGateError") {
    const gateError = toMetaReviewGateError(error);
    throw new ConvergedCommandError(gateError.message);
  }

  if (error instanceof Error) {
    throw new ConvergedCommandError(error.message);
  }

  throw error;
}
