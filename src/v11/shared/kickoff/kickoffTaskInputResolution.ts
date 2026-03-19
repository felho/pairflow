import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { isNonEmptyString } from "../../../core/validation.js";

export interface ResolvedKickoffTaskInput {
  content: string;
  source: "inline" | "file";
  sourcePath?: string;
}

export class KickoffTaskInputValidationError extends Error {}

const IDEATION_PLACEHOLDER_CONTENT_MARKER = /metadata_source:\s*ideation_placeholder/iu;

function isIdeationPlaceholderTaskContent(content: string): boolean {
  return IDEATION_PLACEHOLDER_CONTENT_MARKER.test(content);
}

export function renderKickoffTaskArtifact(task: ResolvedKickoffTaskInput): string {
  const sourceLine =
    task.source === "file"
      ? `Source: file (${task.sourcePath})`
      : "Source: inline text";

  return `# Bubble Task\n\n${sourceLine}\n\n${task.content}\n`;
}

export async function resolveKickoffTaskInput(input: {
  task?: string;
  taskFile?: string;
  cwd: string;
}): Promise<ResolvedKickoffTaskInput> {
  const hasTaskText = isNonEmptyString(input.task);
  const hasTaskFile = isNonEmptyString(input.taskFile);
  if (hasTaskText && hasTaskFile) {
    // reason_code=KICKOFF_TASK_INPUT_CONFLICT context=kickoff_task_input_validation
    throw new KickoffTaskInputValidationError(
      "Provide either task text or task file path, not both."
    );
  }
  if (!hasTaskText && !hasTaskFile) {
    // reason_code=KICKOFF_TASK_INPUT_MISSING context=kickoff_task_input_validation
    throw new KickoffTaskInputValidationError("Provide task text or task file path.");
  }

  if (hasTaskFile) {
    const candidatePath = resolve(input.cwd, input.taskFile as string);
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
    if (normalizedContent.trim().length === 0) {
      // reason_code=KICKOFF_TASK_FILE_EMPTY context=kickoff_task_input_validation
      throw new KickoffTaskInputValidationError(`Task file is empty: ${candidatePath}`);
    }
    if (isIdeationPlaceholderTaskContent(normalizedContent)) {
      // reason_code=KICKOFF_TASK_FILE_PLACEHOLDER_MARKER context=kickoff_task_input_validation
      throw new KickoffTaskInputValidationError(
        `Task file still contains ideation placeholder marker: ${candidatePath}`
      );
    }

    return {
      content: normalizedContent,
      source: "file",
      sourcePath: candidatePath
    };
  }

  const taskText = (input.task as string).trim();
  if (taskText.length === 0) {
    // reason_code=KICKOFF_TASK_INLINE_EMPTY context=kickoff_task_input_validation
    throw new KickoffTaskInputValidationError("Task cannot be empty.");
  }
  if (isIdeationPlaceholderTaskContent(taskText)) {
    // reason_code=KICKOFF_TASK_INLINE_PLACEHOLDER_MARKER context=kickoff_task_input_validation
    throw new KickoffTaskInputValidationError(
      "Task text still contains ideation placeholder marker."
    );
  }
  return {
    content: taskText,
    source: "inline"
  };
}
