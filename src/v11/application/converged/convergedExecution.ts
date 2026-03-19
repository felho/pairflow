import { join } from "node:path";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef,
  type EmitTmuxDeliveryNotificationResult
} from "../../../core/runtime/tmuxDelivery.js";
import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../../core/bubble/metaReviewGate.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { AgentName, BubbleStateSnapshot } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type DeliveryTargetRole,
  type ProtocolEnvelope
} from "../../../types/protocol.js";

export interface ExecuteConvergedExecutionInput {
  resolved: ResolvedBubbleWorkspace;
  state: BubbleStateSnapshot;
  reviewer: AgentName;
  implementer: AgentName;
  summary: string;
  refs: string[];
  now: Date;
  convergencePolicyDiagnostics: string[];
}

export interface ExecuteConvergedExecutionDependencies {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  applyMetaReviewGateOnConvergence?: typeof applyMetaReviewGateOnConvergence;
  recoverMetaReviewGateFromSnapshot?: typeof recoverMetaReviewGateFromSnapshot;
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef;
}

export interface ExecuteConvergedExecutionResult {
  convergence: Awaited<ReturnType<typeof appendProtocolEnvelope>>;
  gateResult: Awaited<ReturnType<typeof applyMetaReviewGateOnConvergence>>;
  delivery: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}

function withDeliveryTargetRole(
  envelope: ProtocolEnvelope,
  role: DeliveryTargetRole
): ProtocolEnvelope {
  const existingMetadata =
    typeof envelope.payload.metadata === "object" &&
    envelope.payload.metadata !== null
      ? envelope.payload.metadata
      : {};
  return {
    ...envelope,
    payload: {
      ...envelope.payload,
      metadata: {
        ...existingMetadata,
        [deliveryTargetRoleMetadataKey]: role
      }
    }
  };
}

function resolveAggregateConvergedDeliveryReason(
  deliveries: EmitTmuxDeliveryNotificationResult[]
): string | undefined {
  const failedDeliveries = deliveries.filter((delivery) => !delivery.delivered);
  if (failedDeliveries.length === 0) {
    return undefined;
  }
  if (failedDeliveries.length < deliveries.length) {
    return "partial_delivery_failed";
  }

  const reasonPriority: Array<NonNullable<EmitTmuxDeliveryNotificationResult["reason"]>> = [
    "delivery_unconfirmed",
    "tmux_send_failed",
    "registry_read_failed",
    "unsupported_recipient",
    "no_runtime_session"
  ];
  for (const reason of reasonPriority) {
    if (failedDeliveries.some((delivery) => delivery.reason === reason)) {
      return reason;
    }
  }

  return failedDeliveries.find((delivery) => delivery.reason !== undefined)?.reason;
}

interface ResolvedExecutionDependencies {
  appendEnvelope: typeof appendProtocolEnvelope;
  applyGate: typeof applyMetaReviewGateOnConvergence;
  recoverGate: typeof recoverMetaReviewGateFromSnapshot;
  emitDelivery: typeof emitTmuxDeliveryNotification;
  emitNotification: typeof emitBubbleNotification;
  resolveMessageRef: typeof resolveDeliveryMessageRef;
}

function resolveExecutionDependencies(
  dependencies: ExecuteConvergedExecutionDependencies
): ResolvedExecutionDependencies {
  return {
    appendEnvelope: dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope,
    applyGate:
      dependencies.applyMetaReviewGateOnConvergence ?? applyMetaReviewGateOnConvergence,
    recoverGate:
      dependencies.recoverMetaReviewGateFromSnapshot ?? recoverMetaReviewGateFromSnapshot,
    emitDelivery:
      dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification,
    emitNotification:
      dependencies.emitBubbleNotification ?? emitBubbleNotification,
    resolveMessageRef:
      dependencies.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef
  };
}

async function appendConvergenceEnvelope(
  input: ExecuteConvergedExecutionInput,
  appendEnvelope: typeof appendProtocolEnvelope
): Promise<Awaited<ReturnType<typeof appendProtocolEnvelope>>> {
  const lockPath = join(input.resolved.bubblePaths.locksDir, `${input.resolved.bubbleId}.lock`);
  return appendEnvelope({
    transcriptPath: input.resolved.bubblePaths.transcriptPath,
    lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.resolved.bubbleId,
      sender: input.reviewer,
      recipient: "orchestrator",
      type: "CONVERGENCE",
      round: input.state.round,
      payload: {
        summary: input.summary,
        ...(input.convergencePolicyDiagnostics.length > 0
          ? {
              metadata: {
                convergence_policy_diagnostics: input.convergencePolicyDiagnostics
              }
            }
          : {})
      },
      refs: input.refs
    }
  });
}

async function applyMetaReviewGateWithRecovery(
  input: ExecuteConvergedExecutionInput,
  applyGate: typeof applyMetaReviewGateOnConvergence,
  recoverGate: typeof recoverMetaReviewGateFromSnapshot
): Promise<Awaited<ReturnType<typeof applyMetaReviewGateOnConvergence>>> {
  try {
    return await applyGate({
      bubbleId: input.resolved.bubbleId,
      summary: input.summary,
      refs: input.refs,
      repoPath: input.resolved.repoPath,
      cwd: input.resolved.bubblePaths.worktreePath,
      now: input.now
    });
  } catch (error) {
    try {
      return await recoverGate({
        bubbleId: input.resolved.bubbleId,
        summary: input.summary,
        refs: input.refs,
        repoPath: input.resolved.repoPath,
        cwd: input.resolved.bubblePaths.worktreePath,
        now: input.now
      });
    } catch {
      throw error;
    }
  }
}

function buildConvergedDelivery(
  deliveries: EmitTmuxDeliveryNotificationResult[],
  retried: boolean
): ExecuteConvergedExecutionResult["delivery"] {
  const failedDeliveryCount = deliveries.filter((delivery) => !delivery.delivered).length;
  const aggregatedDeliveryReason = resolveAggregateConvergedDeliveryReason(deliveries);
  return failedDeliveryCount === 0
    ? {
        delivered: true,
        retried
      }
    : {
        delivered: false,
        ...(aggregatedDeliveryReason !== undefined
          ? { reason: aggregatedDeliveryReason }
          : {}),
        retried
      };
}

async function executeGateDelivery(
  input: ExecuteConvergedExecutionInput,
  gateResult: Awaited<ReturnType<typeof applyMetaReviewGateOnConvergence>>,
  dependencies: Pick<ResolvedExecutionDependencies, "emitDelivery" | "resolveMessageRef">
): Promise<ExecuteConvergedExecutionResult["delivery"]> {
  const gateRef = dependencies.resolveMessageRef({
    bubbleId: input.resolved.bubbleId,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: gateResult.gateEnvelope
  });
  const emitDeliverySafe = async (
    envelope: ProtocolEnvelope,
    options?: {
      initialDelayMs?: number;
      deliveryAttempts?: number;
    }
  ): Promise<EmitTmuxDeliveryNotificationResult> =>
    dependencies.emitDelivery({
      bubbleId: input.resolved.bubbleId,
      bubbleConfig: input.resolved.bubbleConfig,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope,
      messageRef: gateRef,
      ...(options?.initialDelayMs !== undefined
        ? { initialDelayMs: options.initialDelayMs }
        : {}),
      ...(options?.deliveryAttempts !== undefined
        ? { deliveryAttempts: options.deliveryAttempts }
        : {})
    }).catch(() => ({
      delivered: false,
      message: "",
      reason: "tmux_send_failed"
    }));

  const recipientEnvelopes =
    gateResult.gateEnvelope.type === "APPROVAL_REQUEST"
      ? [
          gateResult.gateEnvelope,
          withDeliveryTargetRole({
            ...gateResult.gateEnvelope,
            recipient: input.implementer
          }, "implementer"),
          withDeliveryTargetRole({
            ...gateResult.gateEnvelope,
            recipient: input.reviewer
          }, "reviewer")
        ]
      : [gateResult.gateEnvelope];
  let deliveryResults = await Promise.all(
    recipientEnvelopes.map((envelope) => emitDeliverySafe(envelope))
  );
  let deliveryRetried = false;

  const primaryAutoReworkDelivery = deliveryResults[0];
  const shouldRetryAutoReworkDelivery =
    gateResult.route === "auto_rework" &&
    recipientEnvelopes.length === 1 &&
    primaryAutoReworkDelivery !== undefined &&
    !primaryAutoReworkDelivery.delivered &&
    (
      primaryAutoReworkDelivery.reason === "delivery_unconfirmed" ||
      primaryAutoReworkDelivery.reason === "tmux_send_failed"
    );
  if (shouldRetryAutoReworkDelivery) {
    deliveryRetried = true;
    deliveryResults = [
      await emitDeliverySafe(recipientEnvelopes[0]!, {
        // Auto-rework target pane can still be spinning up after gate routing.
        // Give the CLI extra warm-up + probe attempts before giving up.
        initialDelayMs: 5000,
        deliveryAttempts: 6
      })
    ];
  }

  return buildConvergedDelivery(deliveryResults, deliveryRetried);
}

export async function executeConvergedExecution(
  input: ExecuteConvergedExecutionInput,
  dependencies: ExecuteConvergedExecutionDependencies = {}
): Promise<ExecuteConvergedExecutionResult> {
  const resolvedDependencies = resolveExecutionDependencies(dependencies);
  const convergence = await appendConvergenceEnvelope(
    input,
    resolvedDependencies.appendEnvelope
  );
  const gateResult = await applyMetaReviewGateWithRecovery(
    input,
    resolvedDependencies.applyGate,
    resolvedDependencies.recoverGate
  );
  const delivery = await executeGateDelivery(input, gateResult, {
    emitDelivery: resolvedDependencies.emitDelivery,
    resolveMessageRef: resolvedDependencies.resolveMessageRef
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void resolvedDependencies.emitNotification(input.resolved.bubbleConfig, "converged");

  return {
    convergence,
    gateResult,
    delivery
  };
}
