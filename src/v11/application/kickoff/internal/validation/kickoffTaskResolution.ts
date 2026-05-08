import {
  KickoffTaskInputValidationError,
  type ResolvedKickoffTaskInput,
  resolveKickoffTaskInput
} from "./kickoffTaskInputResolution.js";
import type {
  KickoffReadFile,
  KickoffStatFile
} from "./kickoffDependencyContract.js";

export interface ResolveKickoffTaskInput {
  task?: string;
  taskFile?: string;
  cwd: string;
  readFile: KickoffReadFile;
  statFile: KickoffStatFile;
}

export type ResolveKickoffTaskResult =
  | {
      kind: "resolved";
      task: ResolvedKickoffTaskInput;
    }
  | {
      kind: "invalid";
    };

function buildKickoffTaskInputResolutionInput(
  input: ResolveKickoffTaskInput
): Parameters<typeof resolveKickoffTaskInput>[0] {
  return {
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    cwd: input.cwd,
    readFile: input.readFile,
    statFile: input.statFile
  };
}

function buildKickoffResolvedTaskResult(input: {
  task: ResolvedKickoffTaskInput;
}): ResolveKickoffTaskResult {
  return {
    kind: "resolved",
    task: input.task
  };
}

function buildKickoffInvalidTaskResult(): ResolveKickoffTaskResult {
  return {
    kind: "invalid"
  };
}

export async function resolveKickoffTask(
  input: ResolveKickoffTaskInput
): Promise<ResolveKickoffTaskResult> {
  try {
    const task = await resolveKickoffTaskInput(
      buildKickoffTaskInputResolutionInput(input)
    );
    return buildKickoffResolvedTaskResult({
      task
    });
  } catch (error) {
    if (error instanceof KickoffTaskInputValidationError) {
      return buildKickoffInvalidTaskResult();
    }
    throw error;
  }
}
