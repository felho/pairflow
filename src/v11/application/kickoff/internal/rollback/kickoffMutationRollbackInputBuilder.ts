import type { ProtocolEnvelopeDraft } from "../../../../../types/protocol.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../../../types/protocol.js";
import type { ExecuteKickoffMutationRollbackInput } from "./kickoffMutationRollback.js";
import type { ResolvedKickoffTaskInput } from "../validation/kickoffTaskInputResolution.js";

export interface KickoffMutationPipelineInputForBuilders {
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
  readFile: (path: string, options: "utf8") => Promise<string>;
  appendEnvelope: (input: {
    transcriptPath: string;
    lockPath: string;
    now: Date;
    envelope: ProtocolEnvelopeDraft;
  }) => Promise<unknown>;
  onEnvelopeAppended?: (envelope: ProtocolEnvelope) => void;
  writeState: (
    statePath: string,
    state: BubbleStateSnapshot,
    options: {
      expectedFingerprint: string;
      expectedState: "RUNNING";
    }
  ) => Promise<unknown>;
}

export function buildKickoffMutationRollbackInput(input: {
  pipelineInput: KickoffMutationPipelineInputForBuilders;
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
