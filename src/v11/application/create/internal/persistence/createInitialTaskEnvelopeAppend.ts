import { join } from "node:path";

import type { BubblePaths } from "../../../../shared/bubble/bubblePaths.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { AppendProtocolEnvelopePort } from "../../../../ports/transcript.js";

export interface CreateInitialTaskEnvelopeTaskInput {
  content: string;
  source: "inline" | "file" | "ideation_placeholder";
  sourcePath?: string;
}

export interface CreateInitialTaskEnvelopeAppendInput {
  bubbleId: string;
  createdAt: Date;
  paths: BubblePaths;
  config: BubbleConfig;
  round: number;
  task: CreateInitialTaskEnvelopeTaskInput;
  appendEnvelope: AppendProtocolEnvelopePort;
  createError: (message: string) => Error;
}

export async function appendInitialTaskEnvelope(
  input: CreateInitialTaskEnvelopeAppendInput
): Promise<void> {
  try {
    await input.appendEnvelope({
      transcriptPath: input.paths.transcriptPath,
      lockPath: join(input.paths.locksDir, `${input.bubbleId}.lock`),
      now: input.createdAt,
      envelope: {
        bubble_id: input.bubbleId,
        sender: "orchestrator",
        recipient: input.config.agents.implementer,
        type: "TASK",
        round: input.round,
        payload: {
          summary: input.task.content,
          metadata: {
            source: input.task.source,
            ...(input.task.sourcePath !== undefined
              ? { source_path: input.task.sourcePath }
              : {})
          }
        },
        refs: [input.paths.taskArtifactPath]
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw input.createError(
      `Failed to append initial TASK envelope for bubble ${input.bubbleId}. Root error: ${reason}`
    );
  }
}
