import type {
  KickoffReadFile,
  KickoffStatFile
} from "./kickoffDependencyContract.js";
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
  readFile: KickoffReadFile;
  statFile: KickoffStatFile;
}): Promise<ResolvedKickoffTaskInput> {
  if (input.mode.kind === "file") {
    return resolveKickoffTaskFromFileInput({
      taskFile: input.mode.taskFile,
      cwd: input.cwd,
      readFile: input.readFile,
      statFile: input.statFile,
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

function renderKickoffTaskSourceLine(task: ResolvedKickoffTaskInput): string {
  return task.source === "file"
    ? `Source: file (${task.sourcePath})`
    : "Source: inline text";
}

export function renderKickoffTaskArtifact(task: ResolvedKickoffTaskInput): string {
  return `# Bubble Task\n\n${renderKickoffTaskSourceLine(task)}\n\n${task.content}\n`;
}

export async function resolveKickoffTaskInput(input: {
  task?: string;
  taskFile?: string;
  cwd: string;
  readFile: KickoffReadFile;
  statFile: KickoffStatFile;
}): Promise<ResolvedKickoffTaskInput> {
  return resolveKickoffTaskFromInputMode({
    mode: resolveKickoffTaskInputMode({
      ...input,
      createValidationError: (message) =>
        new KickoffTaskInputValidationError(toErrorMessage(message))
    }),
    cwd: input.cwd,
    readFile: input.readFile,
    statFile: input.statFile
  });
}
