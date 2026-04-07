import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { AgentName } from "../../../types/bubble.js";
import type {
  ProtocolEnvelope,
  ProtocolEnvelopeDraft
} from "../../../types/protocol.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import type { executeKickoffMutation } from "./kickoffMutationExecution.js";
import type { executeKickoffMutationRollback } from "./kickoffMutationRollback.js";

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
