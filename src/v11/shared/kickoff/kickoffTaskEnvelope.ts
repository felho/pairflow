import type { AgentName } from "../../../types/bubble.js";
import type { ProtocolEnvelopeDraft } from "../../../core/protocol/transcriptStore.js";
import type { ResolvedKickoffTaskInput } from "./kickoffTaskInputResolution.js";

export interface BuildKickoffTaskEnvelopeInput {
  bubbleId: string;
  implementer: AgentName;
  task: ResolvedKickoffTaskInput;
  taskArtifactPath: string;
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
    payload: {
      summary: input.task.content,
      metadata: {
        source: input.task.source,
        ...(input.task.sourcePath !== undefined
          ? { source_path: input.task.sourcePath }
          : {})
      }
    },
    refs: [input.taskArtifactPath]
  };
}
