import { IDEATION_KICKOFF_TASK_INVALID } from "../../../core/bubble/ideation.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import { prepareKickoffEligibility } from "./kickoffEligibilityPreparation.js";
import { resolveKickoffTask } from "./kickoffTaskResolution.js";
import {
  buildKickoffFailureResult,
  type KickoffBubbleResultShape
} from "./kickoffResultBuilders.js";

export interface PrepareKickoffValidationInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
}

type ResolvedKickoffBubble = Awaited<
  ReturnType<ResolvedKickoffDependencies["resolveBubble"]>
>;

type LoadedKickoffState = Awaited<
  ReturnType<ResolvedKickoffDependencies["readState"]>
>;

export type PrepareKickoffValidationResult =
  | {
      kind: "failure";
      result: KickoffBubbleResultShape;
    }
  | {
      kind: "prepared";
      resolved: ResolvedKickoffBubble;
      loadedState: LoadedKickoffState;
      state: LoadedKickoffState["state"];
      markersBefore: {
        ideation_mode: boolean;
        ideation_task_pending: boolean;
      };
      task: ResolvedKickoffTaskInput;
    };

export type KickoffPreparedValidation = Extract<
  PrepareKickoffValidationResult,
  { kind: "prepared" }
>;

function buildKickoffResolveBubbleInput(
  input: PrepareKickoffValidationInput
): Parameters<ResolvedKickoffDependencies["resolveBubble"]>[0] {
  return {
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  };
}

function buildKickoffValidationFailureResult(input: {
  resolvedBubbleId: string;
  reasonCode: string;
  stateBefore: LoadedKickoffState["state"];
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
}): PrepareKickoffValidationResult {
  return {
    kind: "failure",
    result: buildKickoffFailureResult({
      bubbleId: input.resolvedBubbleId,
      reasonCode: input.reasonCode,
      stateBefore: input.stateBefore,
      markersBefore: input.markersBefore
    })
  };
}

function buildKickoffTaskResolutionInput(
  input: PrepareKickoffValidationInput
): Parameters<typeof resolveKickoffTask>[0] {
  return {
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    cwd: input.cwd ?? process.cwd()
  };
}

function buildKickoffPreparedValidationResult(input: {
  resolved: ResolvedKickoffBubble;
  loadedState: LoadedKickoffState;
  state: LoadedKickoffState["state"];
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  task: ResolvedKickoffTaskInput;
}): KickoffPreparedValidation {
  return {
    kind: "prepared",
    resolved: input.resolved,
    loadedState: input.loadedState,
    state: input.state,
    markersBefore: input.markersBefore,
    task: input.task
  };
}

type PrepareKickoffTaskOrFailureResult =
  | {
      kind: "failure";
      result: PrepareKickoffValidationResult;
    }
  | {
      kind: "task";
      task: ResolvedKickoffTaskInput;
    };

async function prepareKickoffTaskOrFailure(input: {
  validationInput: PrepareKickoffValidationInput;
  resolvedBubbleId: string;
  state: LoadedKickoffState["state"];
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
}): Promise<PrepareKickoffTaskOrFailureResult> {
  const taskResolution = await resolveKickoffTask(
    buildKickoffTaskResolutionInput(input.validationInput)
  );
  if (taskResolution.kind === "invalid") {
    return {
      kind: "failure",
      result: buildKickoffValidationFailureResult({
        resolvedBubbleId: input.resolvedBubbleId,
        reasonCode: IDEATION_KICKOFF_TASK_INVALID,
        stateBefore: input.state,
        markersBefore: input.markersBefore
      })
    };
  }

  return {
    kind: "task",
    task: taskResolution.task
  };
}

type PrepareKickoffEligibilityOrFailureResult =
  | {
      kind: "failure";
      result: PrepareKickoffValidationResult;
    }
  | {
      kind: "eligible";
      markersBefore: {
        ideation_mode: boolean;
        ideation_task_pending: boolean;
      };
    };

function prepareKickoffEligibilityOrFailure(input: {
  resolvedBubbleId: string;
  state: LoadedKickoffState["state"];
  bubbleConfig: ResolvedKickoffBubble["bubbleConfig"];
}): PrepareKickoffEligibilityOrFailureResult {
  const preparedEligibility = prepareKickoffEligibility({
    bubbleConfig: input.bubbleConfig,
    state: input.state
  });
  const { markersBefore, eligibilityFailureReason } = preparedEligibility;
  if (eligibilityFailureReason !== null) {
    return {
      kind: "failure",
      result: buildKickoffValidationFailureResult({
        resolvedBubbleId: input.resolvedBubbleId,
        reasonCode: eligibilityFailureReason,
        stateBefore: input.state,
        markersBefore
      })
    };
  }

  return {
    kind: "eligible",
    markersBefore
  };
}

export async function prepareKickoffValidation(
  input: PrepareKickoffValidationInput,
  dependencies: ResolvedKickoffDependencies
): Promise<PrepareKickoffValidationResult> {
  const resolved = await dependencies.resolveBubble(
    buildKickoffResolveBubbleInput(input)
  );
  const loadedState = await dependencies.readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const eligibility = prepareKickoffEligibilityOrFailure({
    resolvedBubbleId: resolved.bubbleId,
    state,
    bubbleConfig: resolved.bubbleConfig
  });
  if (eligibility.kind === "failure") {
    return eligibility.result;
  }
  const markersBefore = eligibility.markersBefore;

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
