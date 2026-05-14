import { join } from "node:path";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type {
  AppendProtocolEnvelopeInput,
  AppendProtocolEnvelopePort
} from "../../../../ports/transcript.js";
import type {
  ProtocolEnvelope
} from "../../../../shared/protocol/protocolEnvelopeContract.js";
import type { ResolvedKickoffTaskInput } from "../validation/kickoffTaskInputResolution.js";
import { buildKickoffTaskEnvelope } from "../validation/kickoffTaskEnvelope.js";

export interface AppendKickoffMutationEnvelopeWithBackupInput {
  bubbleId: string;
  implementer: AgentName;
  task: ResolvedKickoffTaskInput;
  taskArtifactPath: string;
  transcriptPath: string;
  locksDir: string;
  now: Date;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
  appendEnvelope: AppendProtocolEnvelopePort;
  onEnvelopeAppended?: (envelope: ProtocolEnvelope<"TASK">) => void;
}

function buildKickoffMutationTaskEnvelope(input: {
  bubbleId: string;
  implementer: AgentName;
  task: ResolvedKickoffTaskInput;
  taskArtifactPath: string;
}): ReturnType<typeof buildKickoffTaskEnvelope> {
  return buildKickoffTaskEnvelope({
    bubbleId: input.bubbleId,
    implementer: input.implementer,
    task: input.task,
    taskArtifactPath: input.taskArtifactPath
  });
}

function buildKickoffMutationEnvelopeAppendInput(
  input: AppendKickoffMutationEnvelopeWithBackupInput
): AppendProtocolEnvelopeInput<"TASK"> {
  return {
    transcriptPath: input.transcriptPath,
    lockPath: join(input.locksDir, `${input.bubbleId}.lock`),
    now: input.now,
    envelope: buildKickoffMutationTaskEnvelope({
      bubbleId: input.bubbleId,
      implementer: input.implementer,
      task: input.task,
      taskArtifactPath: input.taskArtifactPath
    })
  };
}

export async function appendKickoffMutationEnvelopeWithBackup(
  input: AppendKickoffMutationEnvelopeWithBackupInput
): Promise<string> {
  const transcriptBackup = await input.readFile(input.transcriptPath, "utf8");
  const appendResult = await input.appendEnvelope(
    buildKickoffMutationEnvelopeAppendInput(input)
  );
  if (input.onEnvelopeAppended !== undefined) {
    input.onEnvelopeAppended(appendResult.envelope);
  }
  return transcriptBackup;
}
