import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { AgentName } from "../../../types/bubble.js";
import type { ProtocolEnvelopeDraft } from "../../../core/protocol/transcriptStore.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import { executeKickoffMutation } from "./kickoffMutationExecution.js";
import { executeKickoffMutationRollback } from "./kickoffMutationRollback.js";

export interface ExecuteKickoffMutationPipelineInput {
  persistenceFailureCode: string;
  bubbleId: string;
  implementer: AgentName;
  task: ResolvedKickoffTaskInput;
  taskArtifactPath: string;
  bubbleTomlPath: string;
  nextBubbleToml: string;
  previousBubbleToml: string;
  previousTaskArtifact: string;
  transcriptPath: string;
  locksDir: string;
  now: Date;
  statePath: string;
  previousState: BubbleStateSnapshot;
  writtenStateFingerprint: string;
  writeFile: (
    path: string,
    data: string,
    options: { encoding: "utf8" }
  ) => Promise<unknown>;
  readFile: (
    path: string,
    options: "utf8"
  ) => Promise<string>;
  appendEnvelope: (input: {
    transcriptPath: string;
    lockPath: string;
    now: Date;
    envelope: ProtocolEnvelopeDraft;
  }) => Promise<unknown>;
  writeState: (
    statePath: string,
    state: BubbleStateSnapshot,
    options: {
      expectedFingerprint: string;
      expectedState: "RUNNING";
    }
  ) => Promise<unknown>;
}

export type ExecuteKickoffMutationPipelineResult =
  | {
      kind: "success";
    }
  | {
      kind: "mutation_failed_rolled_back";
    };

export interface ExecuteKickoffMutationPipelineDependencies {
  executeMutation?: typeof executeKickoffMutation;
  executeRollback?: typeof executeKickoffMutationRollback;
}

export async function executeKickoffMutationPipeline(
  input: ExecuteKickoffMutationPipelineInput,
  dependencies: ExecuteKickoffMutationPipelineDependencies = {}
): Promise<ExecuteKickoffMutationPipelineResult> {
  const executeMutation = dependencies.executeMutation ?? executeKickoffMutation;
  const executeRollback = dependencies.executeRollback ?? executeKickoffMutationRollback;

  let transcriptBackup: string | null = null;
  try {
    transcriptBackup = await executeMutation({
      bubbleId: input.bubbleId,
      implementer: input.implementer,
      task: input.task,
      taskArtifactPath: input.taskArtifactPath,
      bubbleTomlPath: input.bubbleTomlPath,
      nextBubbleToml: input.nextBubbleToml,
      transcriptPath: input.transcriptPath,
      locksDir: input.locksDir,
      now: input.now,
      writeFile: input.writeFile,
      readFile: input.readFile,
      appendEnvelope: input.appendEnvelope
    });
  } catch (error) {
    const rollbackErrors = await executeRollback({
      transcriptBackup,
      transcriptPath: input.transcriptPath,
      taskArtifactPath: input.taskArtifactPath,
      previousTaskArtifact: input.previousTaskArtifact,
      bubbleTomlPath: input.bubbleTomlPath,
      previousBubbleToml: input.previousBubbleToml,
      statePath: input.statePath,
      previousState: input.previousState,
      writtenStateFingerprint: input.writtenStateFingerprint,
      writeFile: input.writeFile,
      writeState: input.writeState
    });

    if (rollbackErrors.length > 0) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // reason_code=KICKOFF_MUTATION_ROLLBACK_FAILED context=kickoff_mutation_pipeline
      throw new Error(
        `${input.persistenceFailureCode}: mutation failed (${errorMessage}) and rollback failed (${rollbackErrors.join("; ")}).`
      );
    }

    return {
      kind: "mutation_failed_rolled_back"
    };
  }

  return {
    kind: "success"
  };
}
