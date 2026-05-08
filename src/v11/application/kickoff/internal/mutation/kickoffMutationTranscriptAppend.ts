import { join } from "node:path";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type {
  ProtocolEnvelope,
  ProtocolEnvelopeDraft
} from "../../../../../types/protocol.js";
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
  appendEnvelope: (input: {
    transcriptPath: string;
    lockPath: string;
    now: Date;
    envelope: ProtocolEnvelopeDraft;
  }) => Promise<unknown>;
  onEnvelopeAppended?: (envelope: ProtocolEnvelope) => void;
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
): Parameters<AppendKickoffMutationEnvelopeWithBackupInput["appendEnvelope"]>[0] {
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
  const appendedEnvelope =
    typeof appendResult === "object" && appendResult !== null
      ? (appendResult as { envelope?: unknown }).envelope
      : undefined;
  if (input.onEnvelopeAppended !== undefined && appendedEnvelope !== undefined) {
    input.onEnvelopeAppended(appendedEnvelope as ProtocolEnvelope);
  }
  return transcriptBackup;
}
