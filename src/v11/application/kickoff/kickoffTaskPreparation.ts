import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import { resolveKickoffTask } from "./kickoffTaskResolution.js";
import type {
  KickoffBubbleResultShape,
  KickoffIdeationMarkers
} from "./kickoffResultBuilders.js";
import { buildKickoffTaskInvalidFailureResult } from "./kickoffValidationFailureBuilders.js";

interface KickoffTaskPreparationValidationInput {
  task?: string;
  taskFile?: string;
  cwd?: string;
}

interface PrepareKickoffTaskOrFailureInput {
  validationInput: KickoffTaskPreparationValidationInput;
  resolvedBubbleId: string;
  state: BubbleStateSnapshot;
  markersBefore: KickoffIdeationMarkers;
  dependencies: Pick<ResolvedKickoffDependencies, "readFileFn" | "statFileFn">;
}

export type PrepareKickoffTaskOrFailureResult =
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
    };

export async function prepareKickoffTaskOrFailure(
  input: PrepareKickoffTaskOrFailureInput
): Promise<PrepareKickoffTaskOrFailureResult> {
  const taskResolution = await resolveKickoffTask(
    {
      ...(input.validationInput.task !== undefined
        ? { task: input.validationInput.task }
        : {}),
      ...(input.validationInput.taskFile !== undefined
        ? { taskFile: input.validationInput.taskFile }
        : {}),
      cwd: input.validationInput.cwd ?? process.cwd(),
      readFile: input.dependencies.readFileFn,
      statFile: input.dependencies.statFileFn
    }
  );
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
