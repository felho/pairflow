import { join } from "node:path";

import {
  buildDefaultConvergedExecutionDependencies
} from "./convergedFlowInvocationBuilders.js";
import type {
  ResolvedConvergedExecutionDependencies
} from "./convergedFlowInvocationBuilders.js";
import type {
  ConvergedStructuredFinding
} from "../../shared/converged/convergedCommandTypes.js";
import type { ResolvedBubbleWorkspace } from "../../shared/ports/workspaceResolution.js";
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
  appendProtocolEnvelope?: ResolvedConvergedExecutionDependencies["appendProtocolEnvelope"];
  applyMetaReviewGateOnConvergence?: ResolvedConvergedExecutionDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?: ResolvedConvergedExecutionDependencies["recoverMetaReviewGateFromSnapshot"];
  emitTmuxDeliveryNotification?: ResolvedConvergedExecutionDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?: ResolvedConvergedExecutionDependencies["emitBubbleNotification"];
  resolveDeliveryMessageRef?: ResolvedConvergedExecutionDependencies["resolveDeliveryMessageRef"];
}

export interface ExecuteConvergedExecutionResult {
  convergence: Awaited<ReturnType<ResolvedConvergedExecutionDependencies["appendProtocolEnvelope"]>>;
  gateResult: Awaited<ReturnType<ResolvedConvergedExecutionDependencies["applyMetaReviewGateOnConvergence"]>>;
  delivery: ConvergedDeliveryResult;
}

interface ResolvedExecutionDependencies {
  appendEnvelope: ResolvedConvergedExecutionDependencies["appendProtocolEnvelope"];
  applyGate: ResolvedConvergedExecutionDependencies["applyMetaReviewGateOnConvergence"];
  recoverGate: ResolvedConvergedExecutionDependencies["recoverMetaReviewGateFromSnapshot"];
  emitDelivery: ResolvedConvergedExecutionDependencies["emitTmuxDeliveryNotification"];
  emitNotification: ResolvedConvergedExecutionDependencies["emitBubbleNotification"];
  resolveMessageRef: ResolvedConvergedExecutionDependencies["resolveDeliveryMessageRef"];
}

function resolveExecutionDependencies(
  dependencies: ExecuteConvergedExecutionDependencies
): ResolvedExecutionDependencies {
  const resolved = buildDefaultConvergedExecutionDependencies(dependencies);
  return {
    appendEnvelope: resolved.appendProtocolEnvelope,
    applyGate: resolved.applyMetaReviewGateOnConvergence,
    recoverGate: resolved.recoverMetaReviewGateFromSnapshot,
    emitDelivery: resolved.emitTmuxDeliveryNotification,
    emitNotification: resolved.emitBubbleNotification,
    resolveMessageRef: resolved.resolveDeliveryMessageRef
  };
}

async function appendConvergenceEnvelope(
  input: ExecuteConvergedExecutionInput,
  appendEnvelope: ResolvedExecutionDependencies["appendEnvelope"]
): Promise<Awaited<ReturnType<ResolvedExecutionDependencies["appendEnvelope"]>>> {
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
  applyGate: ResolvedExecutionDependencies["applyGate"],
  recoverGate: ResolvedExecutionDependencies["recoverGate"]
): Promise<Awaited<ReturnType<ResolvedExecutionDependencies["applyGate"]>>> {
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
