import { renderKickoffTaskArtifactFromInput } from "./kickoffTaskArtifactRendering.js";
import { resolveKickoffTaskInputMode, type KickoffTaskInputMode } from "./kickoffTaskInputMode.js";
import { resolveKickoffTaskFromFileInput } from "./kickoffTaskFileInputResolution.js";
import { resolveKickoffTaskFromInlineInput } from "./kickoffTaskInlineInputResolution.js";

export interface ResolvedKickoffTaskInput {
  content: string;
  source: "inline" | "file";
  sourcePath?: string;
}

export class KickoffTaskInputValidationError extends Error {}

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

async function resolveKickoffTaskFromInputMode(input: {
  mode: KickoffTaskInputMode;
  cwd: string;
}): Promise<ResolvedKickoffTaskInput> {
  if (input.mode.kind === "file") {
    return resolveKickoffTaskFromFileInput({
      taskFile: input.mode.taskFile,
      cwd: input.cwd,
      createValidationError: (message) =>
        new KickoffTaskInputValidationError(toErrorMessage(message))
    });
  }

  return resolveKickoffTaskFromInlineInput({
    task: input.mode.task,
    createValidationError: (message) =>
      new KickoffTaskInputValidationError(toErrorMessage(message))
  });
}

export function renderKickoffTaskArtifact(task: ResolvedKickoffTaskInput): string {
  return renderKickoffTaskArtifactFromInput(task);
}

export async function resolveKickoffTaskInput(input: {
  task?: string;
  taskFile?: string;
  cwd: string;
}): Promise<ResolvedKickoffTaskInput> {
  return resolveKickoffTaskFromInputMode({
    mode: resolveKickoffTaskInputMode({
      ...input,
      createValidationError: (message) =>
        new KickoffTaskInputValidationError(toErrorMessage(message))
    }),
    cwd: input.cwd
  });
}
