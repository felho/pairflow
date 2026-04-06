import { join } from "node:path";

import { appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef,
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type {
  ConvergedStructuredFinding
} from "../../shared/converged/convergedCommandTypes.js";
import type { ResolvedBubbleWorkspace } from "../../infrastructure/executor/workspace/workspaceResolution.js";
import type { AgentName, BubbleStateSnapshot } from "../../../types/bubble.js";
import {
  executeGateDelivery,
  type ConvergedDeliveryResult
} from "./convergedGateDelivery.js";

export interface ExecuteConvergedExecutionInput {
  resolved: ResolvedBubbleWorkspace;
  state: BubbleStateSnapshot;
  reviewer: AgentName;
  implementer: AgentName;
  summary: string;
  refs: string[];
  findings?: ConvergedStructuredFinding[];
  now: Date;
  convergencePolicyDiagnostics: string[];
  gatePipelineDiagnostics: string[];
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
  delivery: ConvergedDeliveryResult;
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
  const advisoryFindingsOpenTotal = input.findings?.length ?? 0;
  const metadata: Record<string, unknown> = {
    advisory_findings_open_total: advisoryFindingsOpenTotal
  };
  if (input.convergencePolicyDiagnostics.length > 0) {
    metadata.convergence_policy_diagnostics = input.convergencePolicyDiagnostics;
  }
  if (input.gatePipelineDiagnostics.length > 0) {
    metadata.gate_pipeline_diagnostics = input.gatePipelineDiagnostics;
  }
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
        ...(input.findings !== undefined && input.findings.length > 0
          ? { findings: input.findings }
          : {}),
        metadata
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
      ...(input.findings !== undefined ? { findings: input.findings } : {}),
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
  const delivery = await executeGateDelivery({
    resolved: input.resolved,
    implementer: input.implementer,
    reviewer: input.reviewer,
    gateResult,
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
