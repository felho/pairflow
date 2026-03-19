import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyResolution.js";
import { prepareKickoffEligibility } from "./kickoffEligibilityPreparation.js";
import {
  buildKickoffResolveBubbleInput,
} from "./kickoffValidationInputBuilders.js";
import {
  type KickoffBubbleResultShape,
  type KickoffIdeationMarkers
} from "./kickoffResultBuilders.js";
import {
  buildKickoffEligibilityFailureResult,
} from "./kickoffValidationFailureBuilders.js";
import { prepareKickoffTaskOrFailure } from "./kickoffTaskPreparation.js";

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
      markersBefore: KickoffIdeationMarkers;
      task: ResolvedKickoffTaskInput;
    };

export type KickoffPreparedValidation = Extract<
  PrepareKickoffValidationResult,
  { kind: "prepared" }
>;

function buildKickoffPreparedValidationResult(input: {
  resolved: ResolvedKickoffBubble;
  loadedState: LoadedKickoffState;
  state: LoadedKickoffState["state"];
  markersBefore: KickoffIdeationMarkers;
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

type PrepareKickoffEligibilityOrFailureResult =
  | {
      kind: "failure";
      result: PrepareKickoffValidationResult;
    }
  | {
      kind: "eligible";
      markersBefore: KickoffIdeationMarkers;
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
      result: buildKickoffEligibilityFailureResult({
        resolvedBubbleId: input.resolvedBubbleId,
        eligibilityFailureReason,
        state: input.state,
        markersBefore
      })
    };
  }

  return {
    kind: "eligible",
    markersBefore
  };
}

type PrepareKickoffBubbleEligibilityOrFailureResult =
  | {
      kind: "failure";
      result: PrepareKickoffValidationResult;
    }
  | {
      kind: "eligible";
      resolved: ResolvedKickoffBubble;
      loadedState: LoadedKickoffState;
      state: LoadedKickoffState["state"];
      markersBefore: KickoffIdeationMarkers;
    };

async function prepareKickoffBubbleEligibilityOrFailure(input: {
  validationInput: PrepareKickoffValidationInput;
  dependencies: ResolvedKickoffDependencies;
}): Promise<PrepareKickoffBubbleEligibilityOrFailureResult> {
  const resolved = await input.dependencies.resolveBubble(
    buildKickoffResolveBubbleInput(input.validationInput)
  );
  const loadedState = await input.dependencies.readState(
    resolved.bubblePaths.statePath
  );
  const state = loadedState.state;
  const eligibility = prepareKickoffEligibilityOrFailure({
    resolvedBubbleId: resolved.bubbleId,
    state,
    bubbleConfig: resolved.bubbleConfig
  });
  if (eligibility.kind === "failure") {
    return eligibility;
  }

  return {
    kind: "eligible",
    resolved,
    loadedState,
    state,
    markersBefore: eligibility.markersBefore
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
