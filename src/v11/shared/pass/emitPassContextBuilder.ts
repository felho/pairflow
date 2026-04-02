import type { AgentRole } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent } from "../../../types/protocol.js";
import type { ActorEmitContextSnapshot } from "../../../core/bubble/actorEmitContext.js";
import { preparePassRouting, type PreparePassRoutingDependencies } from "../../application/pass/passRoutingPreparation.js";
import type { BuildFlowBaseInput } from "./flowInvocationBuilderBase.js";
import { createPassRoutingDependencies } from "./passFlowDependencyWiring.js";
import { buildPassRoutingInput, type BuildPassRoutingInputInput } from "./passRoutingInvocationBuilders.js";
import { normalizePassCommandInput } from "./passCommandInputNormalization.js";
import { normalizePassCommandPayload } from "./passCommandPayloadNormalization.js";
import { preparePassWorkspaceContext } from "./passWorkspaceContextPreparation.js";

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
}

export interface BuildEmitPassContextDependencies {
  normalizePassCommandInput: typeof normalizePassCommandInput;
  normalizePassCommandPayload: typeof normalizePassCommandPayload;
  preparePassWorkspaceContext: typeof preparePassWorkspaceContext;
  buildPassRoutingInput: (input: BuildPassRoutingInputInput) => ReturnType<typeof buildPassRoutingInput>;
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
  buildPassRoutingInput,
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
  });
  const resolved = workspaceContext.resolved;
  const bubbleIdentity = workspaceContext.bubbleIdentity;
  const loadedState = workspaceContext.loadedState;
  const state = workspaceContext.state;
  const handoff = workspaceContext.handoff;
  const implementer = workspaceContext.implementer;
  const reviewer = workspaceContext.reviewer;

  const passRouting = await dependencies.preparePassRouting(
    dependencies.buildPassRoutingInput({
      senderRole: handoff.senderRole,
      round: handoff.envelopeRound,
      summary,
      refs,
      findings,
      hasFindings,
      noFindings,
      findingsPayloadInvalid: normalizedPayload.findingsPayloadInvalid,
      bubbleConfig: resolved.bubbleConfig,
      worktreePath: resolved.bubblePaths.worktreePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      reviewer,
      implementer,
      createError: input.createError,
      ...(input.commandInput.intent !== undefined
        ? { inputIntent: input.commandInput.intent }
        : {})
    }),
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
    passRouting,
    createError: input.createError
  };
}
