import { join } from "node:path";

import type {
  ConvergedStructuredFinding
} from "../../../../shared/converged/convergedCommandTypes.js";
import type { ResolvedBubbleWorkspace } from "../../../../ports/workspaceResolution.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/bubbleStateSnapshotTypes.js";
import {
  executeGateDelivery,
  type ConvergedDeliveryResult
} from "../gate/convergedGateDelivery.js";
import type {
  AppendProtocolEnvelopePort
} from "../../../../ports/transcript.js";
import type { EmitBubbleNotificationPort } from "../../../../ports/notifications.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../../../ports/tmuxDelivery.js";
import {
  buildDefaultConvergedExecutionDependencies
} from "../orchestration/convergedDefaultDependencies.js";
import type {
  ResolvedConvergedExecutionDependencies
} from "../orchestration/convergedDefaultDependencies.js";

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
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  applyMetaReviewGateOnConvergence?:
    ResolvedConvergedExecutionDependencies["applyMetaReviewGateOnConvergence"];
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  emitBubbleNotification?: EmitBubbleNotificationPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
}

export interface ExecuteConvergedExecutionResult {
  convergence: Awaited<ReturnType<ResolvedConvergedExecutionDependencies["appendProtocolEnvelope"]>>;
  gateResult: Awaited<ReturnType<ResolvedConvergedExecutionDependencies["applyMetaReviewGateOnConvergence"]>>;
  delivery: ConvergedDeliveryResult;
}

interface ResolvedExecutionDependencies {
  appendEnvelope: AppendProtocolEnvelopePort;
  applyGate: ResolvedConvergedExecutionDependencies["applyMetaReviewGateOnConvergence"];
  emitDelivery: EmitDeliveryNotificationAckPort;
  emitNotification: EmitBubbleNotificationPort;
  resolveMessageRef: ResolveDeliveryMessageRefPort;
}

function resolveExecutionDependencies(
  dependencies: ExecuteConvergedExecutionDependencies
): ResolvedExecutionDependencies {
  const resolved = buildDefaultConvergedExecutionDependencies(dependencies);
  return {
    appendEnvelope: resolved.appendProtocolEnvelope,
    applyGate: resolved.applyMetaReviewGateOnConvergence,
    emitDelivery: resolved.emitDeliveryNotificationAck,
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

async function applyMetaReviewGate(
  input: ExecuteConvergedExecutionInput,
  applyGate: ResolvedExecutionDependencies["applyGate"]
): Promise<Awaited<ReturnType<ResolvedExecutionDependencies["applyGate"]>>> {
  return applyGate({
    bubbleId: input.resolved.bubbleId,
    summary: input.summary,
    refs: input.refs,
    ...(input.findings !== undefined ? { findings: input.findings } : {}),
    repoPath: input.resolved.repoPath,
    cwd: input.resolved.bubblePaths.worktreePath,
    now: input.now
  });
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
  const gateResult = await applyMetaReviewGate(
    input,
    resolvedDependencies.applyGate
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
