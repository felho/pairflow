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

async function resolveKickoffTaskFromInputMode(input: {
  mode: KickoffTaskInputMode;
  cwd: string;
}): Promise<ResolvedKickoffTaskInput> {
  if (input.mode.kind === "file") {
    return resolveKickoffTaskFromFileInput({
      taskFile: input.mode.taskFile,
      cwd: input.cwd,
      createValidationError: (message) =>
        new KickoffTaskInputValidationError(message)
    });
  }

  return resolveKickoffTaskFromInlineInput({
    task: input.mode.task,
    createValidationError: (message) =>
      new KickoffTaskInputValidationError(message)
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
        new KickoffTaskInputValidationError(message)
    }),
    cwd: input.cwd
  });
}
