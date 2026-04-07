import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import {
  type KickoffBubbleResultShape,
  type KickoffIdeationMarkers,
} from "./kickoffResultBuilders.js";
import { buildKickoffPreparedValidationResult } from "./kickoffPreparedValidationResult.js";
import { prepareKickoffTaskOrFailure } from "./kickoffTaskPreparation.js";
import {
  prepareKickoffBubbleEligibilityOrFailure,
  type KickoffEligibilityLoadedState,
  type KickoffEligibilityResolvedBubble
} from "./kickoffBubbleEligibilityPreparation.js";

export interface PrepareKickoffValidationInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
}

export type PrepareKickoffValidationResult =
  | {
      kind: "failure";
      result: KickoffBubbleResultShape;
    }
  | {
      kind: "prepared";
      resolved: KickoffEligibilityResolvedBubble;
      loadedState: KickoffEligibilityLoadedState;
      state: KickoffEligibilityLoadedState["state"];
      markersBefore: KickoffIdeationMarkers;
      task: ResolvedKickoffTaskInput;
    };

export type KickoffPreparedValidation = Extract<
  PrepareKickoffValidationResult,
  { kind: "prepared" }
>;

export async function prepareKickoffValidation(
  input: PrepareKickoffValidationInput,
  dependencies: ResolvedKickoffDependencies
): Promise<PrepareKickoffValidationResult> {
  const bubbleEligibility = await prepareKickoffBubbleEligibilityOrFailure({
    validationInput: input,
    dependencies
  });
  if (bubbleEligibility.kind === "failure") {
    return bubbleEligibility.result;
  }
  const { resolved, loadedState, state, markersBefore } = bubbleEligibility;

  const taskOrFailure = await prepareKickoffTaskOrFailure({
    validationInput: input,
    resolvedBubbleId: resolved.bubbleId,
    state,
    markersBefore
  });
  if (taskOrFailure.kind === "failure") {
    return taskOrFailure.result;
  }

  return buildKickoffPreparedValidationResult({
    resolved,
    loadedState,
    state,
    markersBefore,
    task: taskOrFailure.task
  });
}
