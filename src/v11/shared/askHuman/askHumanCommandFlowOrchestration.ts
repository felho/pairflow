import {
  buildAskHumanFlowInput
} from "./askHumanFlowInvocationBuilders.js";
import { buildAskHumanCommandFlowRuntimeDependencies } from "./askHumanCommandFlowRuntimeDependencies.js";
import { buildAskHumanRoutingInput } from "./askHumanRoutingInvocationBuilder.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput,
  AskHumanCommandOrchestrationResult
} from "./askHumanCommandOrchestrationContract.js";
import type { ResolvedAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolutionContract.js";

export async function runAskHumanCommandFlowOrchestration(
  input: AskHumanCommandOrchestrationInput,
  dependencies: AskHumanCommandOrchestrationDependencies,
  resolvedDependencies: ResolvedAskHumanCommandOrchestrationDependencies
): Promise<AskHumanCommandOrchestrationResult> {
  const routing = await resolvedDependencies.prepareAskHumanRouting(
    buildAskHumanRoutingInput({
      question: input.question,
      refs: input.refs,
      cwd: input.cwd,
      now: input.now,
      createError: input.createError
    })
  );

  return resolvedDependencies.runAskHumanFlow(
    buildAskHumanFlowInput({
      now: input.now,
      routing,
      createError: input.createError
    }),
    buildAskHumanCommandFlowRuntimeDependencies(dependencies)
  );
}
