import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { ProtocolEnvelopeDraft } from "../../../../../types/protocol.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";

export interface BuildKickoffTaskEnvelopeInput {
  bubbleId: string;
  implementer: AgentName;
  task: ResolvedKickoffTaskInput;
  taskArtifactPath: string;
}

function buildKickoffTaskPayloadMetadata(
  task: ResolvedKickoffTaskInput
): {
  source: ResolvedKickoffTaskInput["source"];
  source_path?: string;
} {
  return {
    source: task.source,
    ...(task.sourcePath !== undefined ? { source_path: task.sourcePath } : {})
  };
}

function buildKickoffTaskPayload(
  task: ResolvedKickoffTaskInput
): ProtocolEnvelopeDraft["payload"] {
  return {
    summary: task.content,
    metadata: buildKickoffTaskPayloadMetadata(task)
  };
}

export function buildKickoffTaskEnvelope(
  input: BuildKickoffTaskEnvelopeInput
): ProtocolEnvelopeDraft {
  return {
    bubble_id: input.bubbleId,
    sender: "orchestrator",
    recipient: input.implementer,
    type: "TASK",
    round: 1,
    payload: buildKickoffTaskPayload(input.task),
    refs: [input.taskArtifactPath]
  };
}
