import { join } from "node:path";

import type { AgentName } from "../../../types/bubble.js";
import type { ProtocolEnvelopeDraft } from "../../../core/protocol/transcriptStore.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";
import { renderKickoffTaskArtifact } from "./kickoffTaskInputResolution.js";
import { buildKickoffTaskEnvelope } from "./kickoffTaskEnvelope.js";

export interface ExecuteKickoffMutationInput {
  bubbleId: string;
  implementer: AgentName;
  task: ResolvedKickoffTaskInput;
  taskArtifactPath: string;
  bubbleTomlPath: string;
  nextBubbleToml: string;
  transcriptPath: string;
  locksDir: string;
  now: Date;
  writeFile: (
    path: string,
    data: string,
    options: { encoding: "utf8" }
  ) => Promise<unknown>;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
  appendEnvelope: (input: {
    transcriptPath: string;
    lockPath: string;
    now: Date;
    envelope: ProtocolEnvelopeDraft;
  }) => Promise<unknown>;
}

async function writeKickoffMutationArtifacts(
  input: ExecuteKickoffMutationInput
): Promise<void> {
  await input.writeFile(
    input.taskArtifactPath,
    renderKickoffTaskArtifact(input.task),
    {
      encoding: "utf8"
    }
  );
  await input.writeFile(
    input.bubbleTomlPath,
    input.nextBubbleToml,
    { encoding: "utf8" }
  );
}

function buildKickoffMutationEnvelopeAppendInput(
  input: ExecuteKickoffMutationInput
): Parameters<ExecuteKickoffMutationInput["appendEnvelope"]>[0] {
  return {
    transcriptPath: input.transcriptPath,
    lockPath: join(input.locksDir, `${input.bubbleId}.lock`),
    now: input.now,
    envelope: buildKickoffMutationTaskEnvelope(input)
  };
}

function buildKickoffMutationTaskEnvelope(
  input: ExecuteKickoffMutationInput
): ReturnType<typeof buildKickoffTaskEnvelope> {
  return buildKickoffTaskEnvelope({
    bubbleId: input.bubbleId,
    implementer: input.implementer,
    task: input.task,
    taskArtifactPath: input.taskArtifactPath
  });
}

function readKickoffTranscriptBackup(
  input: ExecuteKickoffMutationInput
): Promise<string> {
  return input.readFile(input.transcriptPath, "utf8");
}

async function appendKickoffMutationEnvelope(
  input: ExecuteKickoffMutationInput
): Promise<void> {
  await input.appendEnvelope(
    buildKickoffMutationEnvelopeAppendInput(input)
  );
}

export async function executeKickoffMutation(
  input: ExecuteKickoffMutationInput
): Promise<string> {
  await writeKickoffMutationArtifacts(input);
  const transcriptBackup = await readKickoffTranscriptBackup(input);
  await appendKickoffMutationEnvelope(input);

  return transcriptBackup;
}
