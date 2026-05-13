import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type {
  ProtocolEnvelope,
  ProtocolEnvelopeDraft
} from "../../../../shared/protocol/protocolEnvelopeContract.js";
import type { ResolvedKickoffTaskInput } from "../validation/kickoffTaskInputResolution.js";
import { renderKickoffTaskArtifact } from "../validation/kickoffTaskInputResolution.js";
import { appendKickoffMutationEnvelopeWithBackup } from "./kickoffMutationTranscriptAppend.js";

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
  onEnvelopeAppended?: (envelope: ProtocolEnvelope) => void;
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

export async function executeKickoffMutation(
  input: ExecuteKickoffMutationInput
): Promise<string> {
  await writeKickoffMutationArtifacts(input);
  const transcriptBackup = await appendKickoffMutationEnvelopeWithBackup(input);

  return transcriptBackup;
}
