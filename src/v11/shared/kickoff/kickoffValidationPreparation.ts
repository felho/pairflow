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

export async function prepareKickoffValidation(
  input: PrepareKickoffValidationInput,
  dependencies: ResolvedKickoffDependencies
): Promise<PrepareKickoffValidationResult> {
  const resolved = await dependencies.resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await dependencies.readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const preparedEligibility = prepareKickoffEligibility({
    bubbleConfig: resolved.bubbleConfig,
    state
  });
  const { markersBefore, eligibilityFailureReason } = preparedEligibility;
  if (eligibilityFailureReason !== null) {
    return {
      kind: "failure",
      result: buildKickoffFailureResult({
        bubbleId: resolved.bubbleId,
        reasonCode: eligibilityFailureReason,
        stateBefore: state,
        markersBefore
      })
    };
  }

  const taskResolution = await resolveKickoffTask({
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    cwd: input.cwd ?? process.cwd()
  });
  if (taskResolution.kind === "invalid") {
    return {
      kind: "failure",
      result: buildKickoffFailureResult({
        bubbleId: resolved.bubbleId,
        reasonCode: IDEATION_KICKOFF_TASK_INVALID,
        stateBefore: state,
        markersBefore
      })
    };
  }

  return {
    kind: "prepared",
    resolved,
    loadedState,
    state,
    markersBefore,
    task: taskResolution.task
  };
}
