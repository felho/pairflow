import { assertKickoffTaskContentIsValid } from "./kickoffTaskContentValidation.js";

interface ResolveKickoffTaskFromInlineInputResult {
  content: string;
  source: "inline";
}

export function resolveKickoffTaskFromInlineInput(input: {
  task: string;
  createValidationError: PairflowCreateCommandError;
}): ResolveKickoffTaskFromInlineInputResult {
  const taskText = input.task.trim();
  assertKickoffTaskContentIsValid({
    content: taskText,
    errors: {
      empty: () => {
        // reason_code=KICKOFF_TASK_INLINE_EMPTY context=kickoff_task_input_validation
        return input.createValidationError("Task cannot be empty.");
      },
      placeholder: () => {
        // reason_code=KICKOFF_TASK_INLINE_PLACEHOLDER_MARKER context=kickoff_task_input_validation
        return input.createValidationError(
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
