import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { AgentName } from "../../../types/bubble.js";
import type { ProtocolEnvelopeDraft } from "../../../core/protocol/transcriptStore.js";
import type { ExecuteKickoffMutationInput } from "./kickoffMutationExecution.js";
import type { ExecuteKickoffMutationRollbackInput } from "./kickoffMutationRollback.js";
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

function resolveKickoffMutationPipelineDependencies(
  dependencies: ExecuteKickoffMutationPipelineDependencies
): {
  executeMutation: typeof executeKickoffMutation;
  executeRollback: typeof executeKickoffMutationRollback;
} {
  return {
    executeMutation: dependencies.executeMutation ?? executeKickoffMutation,
    executeRollback: dependencies.executeRollback ?? executeKickoffMutationRollback
  };
}

function buildKickoffMutationPipelineSuccessResult(): ExecuteKickoffMutationPipelineResult {
  return {
    kind: "success"
  };
}

function buildKickoffMutationExecutionInput(
  input: ExecuteKickoffMutationPipelineInput
): ExecuteKickoffMutationInput {
  return {
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
  };
}

function buildKickoffMutationRollbackInput(input: {
  pipelineInput: ExecuteKickoffMutationPipelineInput;
  transcriptBackup: string | null;
}): ExecuteKickoffMutationRollbackInput {
  return {
    transcriptBackup: input.transcriptBackup,
    transcriptPath: input.pipelineInput.transcriptPath,
    taskArtifactPath: input.pipelineInput.taskArtifactPath,
    previousTaskArtifact: input.pipelineInput.previousTaskArtifact,
    bubbleTomlPath: input.pipelineInput.bubbleTomlPath,
    previousBubbleToml: input.pipelineInput.previousBubbleToml,
    statePath: input.pipelineInput.statePath,
    previousState: input.pipelineInput.previousState,
    writtenStateFingerprint: input.pipelineInput.writtenStateFingerprint,
    writeFile: input.pipelineInput.writeFile,
    writeState: input.pipelineInput.writeState
  };
}

function formatKickoffMutationRollbackFailure(input: {
  persistenceFailureCode: string;
  mutationError: unknown;
  rollbackErrors: string[];
}): string {
  const errorMessage =
    input.mutationError instanceof Error
      ? input.mutationError.message
      : String(input.mutationError);
  return `${input.persistenceFailureCode}: mutation failed (${errorMessage}) and rollback failed (${input.rollbackErrors.join("; ")}).`;
}

async function handleKickoffMutationFailure(input: {
  pipelineInput: ExecuteKickoffMutationPipelineInput;
  mutationError: unknown;
  transcriptBackup: string | null;
  executeRollback: typeof executeKickoffMutationRollback;
}): Promise<ExecuteKickoffMutationPipelineResult> {
  const rollbackErrors = await input.executeRollback(
    buildKickoffMutationRollbackInput({
      pipelineInput: input.pipelineInput,
      transcriptBackup: input.transcriptBackup
    })
  );

  if (rollbackErrors.length > 0) {
    // reason_code=KICKOFF_MUTATION_ROLLBACK_FAILED context=kickoff_mutation_pipeline
    throw new Error(
      formatKickoffMutationRollbackFailure({
        persistenceFailureCode: input.pipelineInput.persistenceFailureCode,
        mutationError: input.mutationError,
        rollbackErrors
      })
    );
  }

  return {
    kind: "mutation_failed_rolled_back"
  };
}

async function executeKickoffMutationWithRollbackGuard(input: {
  pipelineInput: ExecuteKickoffMutationPipelineInput;
  executeMutation: typeof executeKickoffMutation;
  executeRollback: typeof executeKickoffMutationRollback;
}): Promise<ExecuteKickoffMutationPipelineResult> {
  let transcriptBackup: string | null = null;
  try {
    transcriptBackup = await input.executeMutation(
      buildKickoffMutationExecutionInput(input.pipelineInput)
    );
  } catch (error) {
    return handleKickoffMutationFailure({
      pipelineInput: input.pipelineInput,
      mutationError: error,
      transcriptBackup,
      executeRollback: input.executeRollback
    });
  }

  return buildKickoffMutationPipelineSuccessResult();
}

export async function executeKickoffMutationPipeline(
  input: ExecuteKickoffMutationPipelineInput,
  dependencies: ExecuteKickoffMutationPipelineDependencies = {}
): Promise<ExecuteKickoffMutationPipelineResult> {
  const resolvedDependencies =
    resolveKickoffMutationPipelineDependencies(dependencies);

  return executeKickoffMutationWithRollbackGuard({
    pipelineInput: input,
    executeMutation: resolvedDependencies.executeMutation,
    executeRollback: resolvedDependencies.executeRollback
  });
}
