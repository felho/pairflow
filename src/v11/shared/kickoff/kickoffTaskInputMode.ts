import { isNonEmptyString } from "../validation/primitives.js";

export type KickoffTaskInputMode =
  | {
      kind: "file";
      taskFile: string;
    }
  | {
      kind: "inline";
      task: string;
    };

function resolveKickoffTaskInputPresence(input: {
  task?: string;
  taskFile?: string;
}): {
  taskText: string | null;
  taskFile: string | null;
} {
  return {
    taskText: isNonEmptyString(input.task) ? input.task : null,
    taskFile: isNonEmptyString(input.taskFile) ? input.taskFile : null
  };
}

function buildKickoffInlineInputMode(input: {
  taskText: string | null;
  createValidationError: PairflowCreateCommandError;
}): KickoffTaskInputMode {
  if (input.taskText === null) {
    // reason_code=KICKOFF_TASK_INPUT_MISSING context=kickoff_task_input_validation
    throw input.createValidationError("Provide task text or task file path.");
  }

  return {
    kind: "inline",
    task: input.taskText
  };
}

export function resolveKickoffTaskInputMode(input: {
  task?: string;
  taskFile?: string;
  createValidationError: PairflowCreateCommandError;
}): KickoffTaskInputMode {
  const { taskText, taskFile } = resolveKickoffTaskInputPresence(input);
  if (taskText !== null && taskFile !== null) {
    // reason_code=KICKOFF_TASK_INPUT_CONFLICT context=kickoff_task_input_validation
    throw input.createValidationError(
      "Provide either task text or task file path, not both."
    );
  }
  if (taskText === null && taskFile === null) {
    // reason_code=KICKOFF_TASK_INPUT_MISSING context=kickoff_task_input_validation
    throw input.createValidationError("Provide task text or task file path.");
  }

  if (taskFile !== null) {
    return {
      kind: "file",
      taskFile
    };
  }

  return buildKickoffInlineInputMode({
    taskText,
    createValidationError: input.createValidationError
  });
}
