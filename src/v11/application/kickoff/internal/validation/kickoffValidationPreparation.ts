import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import {
  type KickoffBubbleResultShape,
  type KickoffIdeationMarkers,
} from "./kickoffResultBuilders.js";
import {
  prepareKickoffBubbleEligibilityOrFailure,
  type KickoffEligibilityLoadedState,
  type KickoffEligibilityResolvedBubble
} from "../eligibility/kickoffBubbleEligibilityPreparation.js";
import { resolveKickoffTask } from "./kickoffTaskResolution.js";
import { buildKickoffTaskInvalidFailureResult } from "./kickoffValidationFailureBuilders.js";

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

async function prepareKickoffTaskOrFailure(input: {
  validationInput: PrepareKickoffValidationInput;
  resolvedBubbleId: string;
  state: KickoffEligibilityLoadedState["state"];
  markersBefore: KickoffIdeationMarkers;
  dependencies: Pick<ResolvedKickoffDependencies, "readFileFn" | "statFileFn">;
}): Promise<
  | {
      kind: "failure";
      result: {
        kind: "failure";
        result: KickoffBubbleResultShape;
      };
    }
  | {
      kind: "task";
      task: ResolvedKickoffTaskInput;
    }
> {
  const taskResolution = await resolveKickoffTask({
    ...(input.validationInput.task !== undefined
      ? { task: input.validationInput.task }
      : {}),
    ...(input.validationInput.taskFile !== undefined
      ? { taskFile: input.validationInput.taskFile }
      : {}),
    cwd: input.validationInput.cwd ?? process.cwd(),
    readFile: input.dependencies.readFileFn,
    statFile: input.dependencies.statFileFn
  });
  if (taskResolution.kind === "invalid") {
    return {
      kind: "failure",
      result: buildKickoffTaskInvalidFailureResult({
        resolvedBubbleId: input.resolvedBubbleId,
        state: input.state,
        markersBefore: input.markersBefore
      })
    };
  }

  return {
    kind: "task",
    task: taskResolution.task
  };
}

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
    markersBefore,
    dependencies: {
      readFileFn: dependencies.readFileFn,
      statFileFn: dependencies.statFileFn
    }
  });
  if (taskOrFailure.kind === "failure") {
    return taskOrFailure.result;
  }

  return {
    kind: "prepared",
    resolved,
    loadedState,
    state,
    markersBefore,
    task: taskOrFailure.task
  };
}
