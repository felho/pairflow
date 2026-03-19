import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { AgentName } from "../../../types/bubble.js";
import type { ProtocolEnvelopeDraft } from "../../../core/protocol/transcriptStore.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import type { executeKickoffMutation } from "./kickoffMutationExecution.js";
import type { executeKickoffMutationRollback } from "./kickoffMutationRollback.js";
import {
  buildKickoffMutationExecutionInput,
  buildKickoffMutationRollbackInput
} from "./kickoffMutationPipelineInputBuilders.js";
import { throwKickoffMutationRollbackFailure } from "./kickoffMutationRollbackFailure.js";
import {
  buildKickoffMutationPipelineRolledBackResult,
  buildKickoffMutationPipelineSuccessResult,
  resolveKickoffMutationPipelineDependencies
} from "./kickoffMutationPipelineFlowHelpers.js";

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

async function executeKickoffRollback(input: {
  pipelineInput: ExecuteKickoffMutationPipelineInput;
  transcriptBackup: string | null;
  executeRollback: typeof executeKickoffMutationRollback;
}): Promise<string[]> {
  return input.executeRollback(
    buildKickoffMutationRollbackInput({
      pipelineInput: input.pipelineInput,
      transcriptBackup: input.transcriptBackup
    })
  );
}

async function handleKickoffMutationFailure(input: {
  pipelineInput: ExecuteKickoffMutationPipelineInput;
  mutationError: unknown;
  transcriptBackup: string | null;
  executeRollback: typeof executeKickoffMutationRollback;
}): Promise<ExecuteKickoffMutationPipelineResult> {
  const rollbackErrors = await executeKickoffRollback({
    pipelineInput: input.pipelineInput,
    transcriptBackup: input.transcriptBackup,
    executeRollback: input.executeRollback
  });

  if (rollbackErrors.length > 0) {
    throwKickoffMutationRollbackFailure({
      persistenceFailureCode: input.pipelineInput.persistenceFailureCode,
      mutationError: input.mutationError,
      rollbackErrors
    });
  }

  return buildKickoffMutationPipelineRolledBackResult();
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
