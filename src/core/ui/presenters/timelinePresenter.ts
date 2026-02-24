import { resolveBubbleById } from "../../bubble/bubbleLookup.js";
import { readTranscriptEnvelopes } from "../../protocol/transcriptStore.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { UiTimelineEntry } from "../../../types/ui.js";

export interface ReadBubbleTimelineInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export function presentTimeline(envelopes: ProtocolEnvelope[]): UiTimelineEntry[] {
  return envelopes.map((envelope) => ({
    id: envelope.id,
    ts: envelope.ts,
    round: envelope.round,
    type: envelope.type,
    sender: envelope.sender,
    recipient: envelope.recipient,
    payload: envelope.payload,
    refs: envelope.refs
  }));
}

export async function readBubbleTimeline(
  input: ReadBubbleTimelineInput
): Promise<UiTimelineEntry[]> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const envelopes = await readTranscriptEnvelopes(
    resolved.bubblePaths.transcriptPath,
    {
      allowMissing: true,
      toleratePartialFinalLine: true
    }
  );

  return presentTimeline(envelopes);
}
