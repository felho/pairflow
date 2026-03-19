import type { BubbleStateSnapshot } from "../../../types/bubble.js";

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
  if (input.transcriptBackup !== null) {
    await input.writeFile(input.transcriptPath, input.transcriptBackup, {
      encoding: "utf8"
    }).catch((rollbackError) => {
      rollbackErrors.push(
        `transcript rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
      );
    });
  }

  await input.writeFile(input.taskArtifactPath, input.previousTaskArtifact, {
    encoding: "utf8"
  }).catch((rollbackError) => {
    rollbackErrors.push(
      `task artifact rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
    );
  });

  await input.writeFile(input.bubbleTomlPath, input.previousBubbleToml, {
    encoding: "utf8"
  }).catch((rollbackError) => {
    rollbackErrors.push(
      `bubble.toml rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
    );
  });

  await input.writeState(
    input.statePath,
    input.previousState,
    {
      expectedFingerprint: input.writtenStateFingerprint,
      expectedState: "RUNNING"
    }
  ).catch((rollbackError) => {
    rollbackErrors.push(
      `state rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
    );
  });

  return rollbackErrors;
}
