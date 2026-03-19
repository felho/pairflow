import { runAutoConvergeFlow } from "../../application/pass/runAutoConvergeFlow.js";
import { runNormalPassFlow } from "../../application/pass/runNormalPassFlow.js";
import type {
  AutoConvergePassResult,
  NormalPassResult
} from "../../application/pass/passResultBuilder.js";
import { buildAutoConvergeFlowInput } from "./autoConvergeFlowInvocationBuilders.js";
import { buildNormalPassFlowInput } from "./normalPassFlowInvocationBuilders.js";
import {
  createAutoConvergeFlowDependencies,
  createNormalPassFlowDependencies,
  type PassFlowRuntimeDependencies
} from "./passFlowDependencyWiring.js";
import type { BuildFlowBaseInput } from "./flowInvocationBuilderBase.js";

export interface DispatchPassFlowInput extends BuildFlowBaseInput {
  onDownstreamRejected: (reason: string) => never;
}

export async function dispatchPassFlow(
  input: DispatchPassFlowInput,
  runtimeDependencies: PassFlowRuntimeDependencies
): Promise<AutoConvergePassResult | NormalPassResult> {
  const repeatCleanTrigger = input.passRouting.repeatCleanTrigger;
  if (repeatCleanTrigger.trigger) {
    return runAutoConvergeFlow(
      buildAutoConvergeFlowInput({
        summary: input.summary,
        refs: input.refs,
        now: input.now,
        nowIso: input.nowIso,
        findings: input.findings,
        hasFindings: input.hasFindings,
        noFindings: input.noFindings,
        resolved: input.resolved,
        bubbleIdentity: input.bubbleIdentity,
        handoff: input.handoff,
        reviewer: input.reviewer,
        implementer: input.implementer,
        state: input.state,
        loadedState: input.loadedState,
        passRouting: input.passRouting,
        createError: input.createError,
        onDownstreamRejected: input.onDownstreamRejected
      }),
      createAutoConvergeFlowDependencies(runtimeDependencies)
    );
  }

  return runNormalPassFlow(
    buildNormalPassFlowInput({
      now: input.now,
      nowIso: input.nowIso,
      summary: input.summary,
      refs: input.refs,
      hasFindings: input.hasFindings,
      noFindings: input.noFindings,
      findings: input.findings,
      resolved: input.resolved,
      bubbleIdentity: input.bubbleIdentity,
      handoff: input.handoff,
      reviewer: input.reviewer,
      implementer: input.implementer,
      state: input.state,
      loadedState: input.loadedState,
      passRouting: input.passRouting,
      createError: input.createError
    }),
    createNormalPassFlowDependencies(runtimeDependencies)
  );
}
