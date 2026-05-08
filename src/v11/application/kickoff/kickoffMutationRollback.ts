import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import { executeKickoffRollbackStep } from "./kickoffRollbackStepExecution.js";

export interface ExecuteKickoffMutationRollbackInput {
  transcriptBackup: string | null;
  transcriptPath: string;
  taskArtifactPath: string;
  previousTaskArtifact: string;
  bubbleTomlPath: string;
  previousBubbleToml: string;
  statePath: string;
  previousState: BubbleStateSnapshot;
  writtenStateFingerprint: string;
  writeFile: (
    path: string,
    data: string,
    options: { encoding: "utf8" }
  ) => Promise<unknown>;
  writeState: (
    statePath: string,
    state: BubbleStateSnapshot,
    options: {
      expectedFingerprint: string;
      expectedState: "RUNNING";
    }
  ) => Promise<unknown>;
}

export async function executeKickoffMutationRollback(
  input: ExecuteKickoffMutationRollbackInput
): Promise<string[]> {
  const rollbackErrors: string[] = [];
  const transcriptBackup = input.transcriptBackup;
  if (transcriptBackup !== null) {
    await executeKickoffRollbackStep({
      rollbackErrors,
      target: "transcript",
      run: () =>
        input.writeFile(input.transcriptPath, transcriptBackup, {
          encoding: "utf8"
        })
    });
  }

  await executeKickoffRollbackStep({
    rollbackErrors,
    target: "task artifact",
    run: () =>
      input.writeFile(input.taskArtifactPath, input.previousTaskArtifact, {
        encoding: "utf8"
      })
  });

  await executeKickoffRollbackStep({
    rollbackErrors,
    target: "bubble.toml",
    run: () =>
      input.writeFile(input.bubbleTomlPath, input.previousBubbleToml, {
        encoding: "utf8"
      })
  });

  await executeKickoffRollbackStep({
    rollbackErrors,
    target: "state",
    run: () =>
      input.writeState(
        input.statePath,
        input.previousState,
        {
          expectedFingerprint: input.writtenStateFingerprint,
          expectedState: "RUNNING"
        }
      )
  });

  return rollbackErrors;
}
