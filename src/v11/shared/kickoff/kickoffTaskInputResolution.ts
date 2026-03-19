import { renderKickoffTaskArtifactFromInput } from "./kickoffTaskArtifactRendering.js";
import { assertKickoffTaskContentIsValid } from "./kickoffTaskContentValidation.js";
import { resolveKickoffTaskInputMode, type KickoffTaskInputMode } from "./kickoffTaskInputMode.js";
import { resolveKickoffTaskFromFileInput } from "./kickoffTaskFileInputResolution.js";

export interface ResolvedKickoffTaskInput {
  content: string;
  source: "inline" | "file";
  sourcePath?: string;
}

export class KickoffTaskInputValidationError extends Error {}

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
      cwd: input.cwd,
      createValidationError: (message) =>
        new KickoffTaskInputValidationError(message)
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
