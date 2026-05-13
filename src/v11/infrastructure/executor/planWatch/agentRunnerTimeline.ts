import type { StructuredAgentRunnerOutput } from "../../../shared/planWatchRunner/agentRunnerBridgeContract.js";
import type { CodexJsonEvent } from "./codex/codexAgentRunnerStream.js";
import type { CodexTimelineRow } from "./codex/codexAgentRunnerTimeline.js";
import { normalizeCodexTimeline } from "./codex/codexAgentRunnerTimeline.js";

export type AgentRunnerTimelineRow = CodexTimelineRow;

export function normalizeAgentRunnerTimeline(input: {
  events: readonly CodexJsonEvent[];
  finalOutput: StructuredAgentRunnerOutput | null;
  completedAt: string;
}): readonly AgentRunnerTimelineRow[] {
  return normalizeCodexTimeline(input);
}
