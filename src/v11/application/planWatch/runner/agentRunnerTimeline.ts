import type { StructuredAgentRunnerOutput } from "./agentRunnerBridgeContract.js";
import type { CodexJsonEvent } from "./codexAgentRunnerStream.js";
import type { CodexTimelineRow } from "./codexAgentRunnerTimeline.js";
import { normalizeCodexTimeline } from "./codexAgentRunnerTimeline.js";

export type AgentRunnerTimelineRow = CodexTimelineRow;

export function normalizeAgentRunnerTimeline(input: {
  events: readonly CodexJsonEvent[];
  finalOutput: StructuredAgentRunnerOutput | null;
  completedAt: string;
}): readonly AgentRunnerTimelineRow[] {
  return normalizeCodexTimeline(input);
}
