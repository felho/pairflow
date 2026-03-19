import {
  KickoffTaskInputValidationError,
  type ResolvedKickoffTaskInput,
  resolveKickoffTaskInput
} from "./kickoffTaskInputResolution.js";

export interface ResolveKickoffTaskInput {
  task?: string;
  taskFile?: string;
  cwd: string;
}

export type ResolveKickoffTaskResult =
  | {
      kind: "resolved";
      task: ResolvedKickoffTaskInput;
    }
  | {
      kind: "invalid";
    };

export async function resolveKickoffTask(
  input: ResolveKickoffTaskInput
): Promise<ResolveKickoffTaskResult> {
  try {
    const task = await resolveKickoffTaskInput({
      ...(input.task !== undefined ? { task: input.task } : {}),
      ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
      cwd: input.cwd
    });
    return {
      kind: "resolved",
      task
    };
  } catch (error) {
    if (error instanceof KickoffTaskInputValidationError) {
      return {
        kind: "invalid"
      };
    }
    throw error;
  }
}
