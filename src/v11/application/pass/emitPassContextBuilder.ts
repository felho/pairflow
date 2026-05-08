import type {
  AgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent } from "../../../types/protocol.js";
import {
  type ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import { normalizePassCommandInput } from "./passCommandInputNormalization.js";
import { normalizePassCommandPayload } from "./passCommandPayloadNormalization.js";
import { normalizeBubbleReviewPolicy } from "../../shared/reviewPolicy/reviewPolicyRuntime.js";
import type { BuildFlowBaseInput } from "./flowInvocationBuilderBase.js";
import { createPassRoutingDependencies } from "./passFlowDependencyWiring.js";
import { preparePassWorkspaceContext } from "./passWorkspaceContextPreparation.js";
import type {
  PreparePassWorkspaceContextDependencies
} from "./passWorkspaceContextPreparation.js";
import {
  preparePassRouting,
  type PreparePassRoutingDependencies,
  type PreparePassRoutingInput
} from "./passRoutingPreparation.js";

export interface EmitPassContextCommandInput {
  summary: string;
  refs?: string[];
  intent?: PassIntent;
  findings?: Finding[];
  noFindings?: boolean;
  cwd?: string;
  authoritativeContext?: ActorEmitContextSnapshot;
  now?: Date;
}

export interface BuildEmitPassContextInput {
  commandInput: EmitPassContextCommandInput;
  createError: PairflowCreateCommandError;
  inferDefaultPassIntent: (activeRole: AgentRole) => PassIntent;
  workspaceContextDependencies?: PreparePassWorkspaceContextDependencies;
}

export interface BuildEmitPassContextDependencies {
  normalizePassCommandInput: typeof normalizePassCommandInput;
  normalizePassCommandPayload: typeof normalizePassCommandPayload;
  preparePassWorkspaceContext: typeof preparePassWorkspaceContext;
  preparePassRouting: (
    input: Parameters<typeof preparePassRouting>[0],
    dependencies: PreparePassRoutingDependencies
  ) => ReturnType<typeof preparePassRouting>;
  createPassRoutingDependencies: typeof createPassRoutingDependencies;
}

const defaultDependencies: BuildEmitPassContextDependencies = {
  normalizePassCommandInput,
  normalizePassCommandPayload,
  preparePassWorkspaceContext,
  preparePassRouting,
  createPassRoutingDependencies
};

export async function buildEmitPassContext(
  input: BuildEmitPassContextInput,
  dependencies: BuildEmitPassContextDependencies = defaultDependencies
): Promise<BuildFlowBaseInput> {
  const normalizedCommandInput = dependencies.normalizePassCommandInput({
    summary: input.commandInput.summary,
    refs: input.commandInput.refs,
    now: input.commandInput.now,
    createError: input.createError
  });
  const now = normalizedCommandInput.now;
  const nowIso = now.toISOString();
  const summary = normalizedCommandInput.summary;
  const refs = normalizedCommandInput.refs;

  const normalizedPayload = dependencies.normalizePassCommandPayload({
    findings: input.commandInput.findings,
    noFindings: input.commandInput.noFindings
  });
  const findings = normalizedPayload.findings;
  const hasFindings = normalizedPayload.hasFindings;
  const noFindings = normalizedPayload.noFindings;

  const workspaceContext = await dependencies.preparePassWorkspaceContext({
    cwd: input.commandInput.cwd,
    authoritativeContext: input.commandInput.authoritativeContext,
    now,
    nowIso,
    createError: input.createError
  }, input.workspaceContextDependencies);
  const resolved = workspaceContext.resolved;
  const normalizedReviewPolicy = normalizeBubbleReviewPolicy(resolved.bubbleConfig);
  const bubbleIdentity = workspaceContext.bubbleIdentity;
  const loadedState = workspaceContext.loadedState;
  const state = workspaceContext.state;
  const handoff = workspaceContext.handoff;
  const implementer = workspaceContext.implementer;
  const reviewer = workspaceContext.reviewer;
  const activation =
    handoff.senderRole === "implementer"
      ? workspaceContext.activation
      : undefined;

  const passRouting = await dependencies.preparePassRouting(
    {
      senderRole: handoff.senderRole,
      round: handoff.envelopeRound,
      summary,
      refs,
      findings,
      hasFindings,
      noFindings,
      findingsPayloadInvalid: normalizedPayload.findingsPayloadInvalid,
      reviewerBlockingMinSeverity:
        normalizedReviewPolicy.reviewer_blocking_min_severity,
      bubbleConfig: {
        review_artifact_type: resolved.bubbleConfig.review_artifact_type,
        severity_gate_round: resolved.bubbleConfig.severity_gate_round,
        ...(resolved.bubbleConfig.accuracy_critical !== undefined
          ? { accuracy_critical: resolved.bubbleConfig.accuracy_critical }
          : {})
      },
      worktreePath: resolved.worktreePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      reviewer,
      implementer,
      createError: input.createError,
      ...(input.commandInput.intent !== undefined
        ? { inputIntent: input.commandInput.intent }
        : {})
    } satisfies PreparePassRoutingInput,
    dependencies.createPassRoutingDependencies(input.inferDefaultPassIntent)
  );

  return {
    summary,
    refs,
    now,
    nowIso,
    findings,
    hasFindings,
    noFindings,
    resolved,
    bubbleIdentity,
    handoff,
    reviewer,
    implementer,
    state,
    loadedState,
    ...(activation !== undefined ? { activation } : {}),
    passRouting,
    createError: input.createError
  };
}
