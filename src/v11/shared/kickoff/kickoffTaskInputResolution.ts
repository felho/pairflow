import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { renderKickoffTaskArtifactFromInput } from "./kickoffTaskArtifactRendering.js";
import { assertKickoffTaskContentIsValid } from "./kickoffTaskContentValidation.js";
import { resolveKickoffTaskInputMode, type KickoffTaskInputMode } from "./kickoffTaskInputMode.js";

export interface ResolvedKickoffTaskInput {
  content: string;
  source: "inline" | "file";
  sourcePath?: string;
}

export class KickoffTaskInputValidationError extends Error {}

async function resolveKickoffTaskFromFileInput(input: {
  taskFile: string;
  cwd: string;
}): Promise<ResolvedKickoffTaskInput> {
  const candidatePath = resolve(input.cwd, input.taskFile);
  const taskStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      // reason_code=KICKOFF_TASK_FILE_NOT_FOUND context=kickoff_task_input_validation
      throw new KickoffTaskInputValidationError(
        `Task file does not exist: ${candidatePath}`
      );
    }
    throw error;
  });
  if (!taskStats.isFile()) {
    // reason_code=KICKOFF_TASK_FILE_NOT_REGULAR context=kickoff_task_input_validation
    throw new KickoffTaskInputValidationError(
      `Task path is not a file: ${candidatePath}`
    );
  }

  const content = await readFile(candidatePath, "utf8");
  const normalizedContent = content.trimEnd();
  assertKickoffTaskContentIsValid({
    content: normalizedContent,
    errors: {
      empty: () => {
        // reason_code=KICKOFF_TASK_FILE_EMPTY context=kickoff_task_input_validation
        return new KickoffTaskInputValidationError(
          `Task file is empty: ${candidatePath}`
        );
      },
      placeholder: () => {
        // reason_code=KICKOFF_TASK_FILE_PLACEHOLDER_MARKER context=kickoff_task_input_validation
        return new KickoffTaskInputValidationError(
          `Task file still contains ideation placeholder marker: ${candidatePath}`
        );
      }
    }
  });

  return {
    content: normalizedContent,
    source: "file",
    sourcePath: candidatePath
  };
}

function resolveKickoffTaskFromInlineInput(input: {
  task: string;
}): ResolvedKickoffTaskInput {
  const taskText = input.task.trim();
  assertKickoffTaskContentIsValid({
    content: taskText,
    errors: {
      empty: () => {
        // reason_code=KICKOFF_TASK_INLINE_EMPTY context=kickoff_task_input_validation
        return new KickoffTaskInputValidationError("Task cannot be empty.");
      },
      placeholder: () => {
        // reason_code=KICKOFF_TASK_INLINE_PLACEHOLDER_MARKER context=kickoff_task_input_validation
        return new KickoffTaskInputValidationError(
          "Task text still contains ideation placeholder marker."
        );
      }
    }
  });
  return {
    content: taskText,
    source: "inline"
  };
}

async function resolveKickoffTaskFromInputMode(input: {
  mode: KickoffTaskInputMode;
  cwd: string;
}): Promise<ResolvedKickoffTaskInput> {
  if (input.mode.kind === "file") {
    return resolveKickoffTaskFromFileInput({
      taskFile: input.mode.taskFile,
      cwd: input.cwd
    });
  }

  return resolveKickoffTaskFromInlineInput({
    task: input.mode.task
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
