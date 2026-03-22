import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { assertKickoffTaskContentIsValid } from "./kickoffTaskContentValidation.js";

interface ResolveKickoffTaskFromFileInputResult {
  content: string;
  source: "file";
  sourcePath: string;
}

export async function resolveKickoffTaskFromFileInput(input: {
  taskFile: string;
  cwd: string;
  createValidationError: PairflowCreateCommandError;
}): Promise<ResolveKickoffTaskFromFileInputResult> {
  const candidatePath = resolve(input.cwd, input.taskFile);
  const taskStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      // reason_code=KICKOFF_TASK_FILE_NOT_FOUND context=kickoff_task_input_validation
      throw input.createValidationError(`Task file does not exist: ${candidatePath}`);
    }
    throw error;
  });
  if (!taskStats.isFile()) {
    // reason_code=KICKOFF_TASK_FILE_NOT_REGULAR context=kickoff_task_input_validation
    throw input.createValidationError(`Task path is not a file: ${candidatePath}`);
  }

  const content = await readFile(candidatePath, "utf8");
  const normalizedContent = content.trimEnd();
  assertKickoffTaskContentIsValid({
    content: normalizedContent,
    errors: {
      empty: () => {
        // reason_code=KICKOFF_TASK_FILE_EMPTY context=kickoff_task_input_validation
        return input.createValidationError(`Task file is empty: ${candidatePath}`);
      },
      placeholder: () => {
        // reason_code=KICKOFF_TASK_FILE_PLACEHOLDER_MARKER context=kickoff_task_input_validation
        return input.createValidationError(
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
