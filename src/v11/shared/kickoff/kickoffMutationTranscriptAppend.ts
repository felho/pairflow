import { join } from "node:path";

import type { ProtocolEnvelopeDraft } from "../../../core/protocol/transcriptStore.js";
import type { AgentName } from "../../../types/bubble.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import { buildKickoffTaskEnvelope } from "./kickoffTaskEnvelope.js";

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
  await input.appendEnvelope(
    buildKickoffMutationEnvelopeAppendInput(input)
  );
  return transcriptBackup;
}
