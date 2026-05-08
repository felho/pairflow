import type { BuildFlowBaseInput } from "./flowInvocationBuilderBase.js";
import { buildAutoConvergeFlowInput } from "../autoConverge/autoConvergeFlowInvocationBuilders.js";
import { buildNormalPassFlowInput } from "./normalPassFlowInvocationBuilders.js";
import {
  createAutoConvergeFlowDependencies,
  createNormalPassFlowDependencies
} from "../../passFlowDependencyWiring.js";
import type { PassFlowRuntimeDependencies } from "./passFlowRuntimeDependenciesContract.js";
import type {
  AutoConvergePassResult,
  NormalPassResult
} from "./passResultBuilder.js";
import { runAutoConvergeFlow } from "../autoConverge/runAutoConvergeFlow.js";
import { runNormalPassFlow } from "./runNormalPassFlow.js";

export interface DispatchPassFlowInput extends BuildFlowBaseInput {
  onDownstreamRejected: (reason: string) => never;
}

export interface PassFlowDispatchDependencies {
  runAutoConvergeFlow: typeof runAutoConvergeFlow;
  runNormalPassFlow: typeof runNormalPassFlow;
  buildAutoConvergeFlowInput: typeof buildAutoConvergeFlowInput;
  buildNormalPassFlowInput: typeof buildNormalPassFlowInput;
  createAutoConvergeFlowDependencies: typeof createAutoConvergeFlowDependencies;
  createNormalPassFlowDependencies: typeof createNormalPassFlowDependencies;
}

const defaultDependencies: PassFlowDispatchDependencies = {
  runAutoConvergeFlow,
  runNormalPassFlow,
  buildAutoConvergeFlowInput,
  buildNormalPassFlowInput,
  createAutoConvergeFlowDependencies,
  createNormalPassFlowDependencies
};

export async function dispatchPassFlow(
  input: DispatchPassFlowInput,
  runtimeDependencies: PassFlowRuntimeDependencies,
  dependencies: PassFlowDispatchDependencies = defaultDependencies
): Promise<AutoConvergePassResult | NormalPassResult> {
  const repeatCleanTrigger = input.passRouting.repeatCleanTrigger;
  if (repeatCleanTrigger.trigger) {
    return dependencies.runAutoConvergeFlow(
      dependencies.buildAutoConvergeFlowInput({
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
        ...(input.activation !== undefined
          ? { activation: input.activation }
          : {}),
        passRouting: input.passRouting,
        createError: input.createError,
        onDownstreamRejected: input.onDownstreamRejected
      }),
      dependencies.createAutoConvergeFlowDependencies(runtimeDependencies)
    );
  }

  return dependencies.runNormalPassFlow(
    dependencies.buildNormalPassFlowInput({
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
      ...(input.activation !== undefined
        ? { activation: input.activation }
        : {}),
      passRouting: input.passRouting,
      createError: input.createError
    }),
    dependencies.createNormalPassFlowDependencies(runtimeDependencies)
  );
}
