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

type KickoffTaskContentValidationIssue = "empty" | "placeholder";

function resolveKickoffTaskContentValidationIssue(
  content: string
): KickoffTaskContentValidationIssue | null {
  if (content.trim().length === 0) {
    return "empty";
  }
  if (isIdeationPlaceholderTaskContent(content)) {
    return "placeholder";
  }
  return null;
}

function assertKickoffTaskContentIsValid(input: {
  content: string;
  errors: {
    empty: () => KickoffTaskInputValidationError;
    placeholder: () => KickoffTaskInputValidationError;
  };
}): void {
  const issue = resolveKickoffTaskContentValidationIssue(input.content);
  if (issue === "empty") {
    // reason_code=KICKOFF_TASK_CONTENT_EMPTY context=kickoff_task_input_validation
    throw input.errors.empty();
  }
  if (issue === "placeholder") {
    // reason_code=KICKOFF_TASK_CONTENT_PLACEHOLDER_MARKER context=kickoff_task_input_validation
    throw input.errors.placeholder();
  }
}

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

type KickoffTaskInputMode =
  | {
      kind: "file";
      taskFile: string;
    }
  | {
      kind: "inline";
      task: string;
    };

function resolveKickoffTaskInputMode(input: {
  task?: string;
  taskFile?: string;
}): KickoffTaskInputMode {
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
    return {
      kind: "file",
      taskFile: input.taskFile as string
    };
  }

  return {
    kind: "inline",
    task: input.task as string
  };
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
  const mode = resolveKickoffTaskInputMode(input);

  if (mode.kind === "file") {
    return resolveKickoffTaskFromFileInput({
      taskFile: mode.taskFile,
      cwd: input.cwd
    });
  }

  return resolveKickoffTaskFromInlineInput({
    task: mode.task
  });
}
