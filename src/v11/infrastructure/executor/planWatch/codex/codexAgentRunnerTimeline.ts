import type { StructuredAgentRunnerOutput } from "../../../../shared/planWatchRunner/agentRunnerBridgeContract.js";
import type { CodexJsonEvent } from "./codexAgentRunnerStream.js";

export interface CodexTimelineRow {
  schemaVersion: 1;
  type: string;
  at: string;
  [key: string]: unknown;
}

const OUTPUT_PREVIEW_LINE_LIMIT = 20;
const MAX_UNRECOGNIZED_TIMELINE_ROWS = 20;

export function normalizeCodexTimeline(input: {
  events: readonly CodexJsonEvent[];
  finalOutput: StructuredAgentRunnerOutput | null;
  completedAt: string;
}): readonly CodexTimelineRow[] {
  const rows: CodexTimelineRow[] = [];
  let unrecognizedRows = 0;
  for (const event of input.events) {
    const row = normalizeEvent(event.value, input.completedAt, {
      allowUnrecognized: unrecognizedRows < MAX_UNRECOGNIZED_TIMELINE_ROWS
    });
    if (row !== undefined) {
      rows.push(row);
      if (row.type === "runner_event_unrecognized") {
        unrecognizedRows += 1;
      }
    }
  }
  if (input.finalOutput !== null) {
    rows.push({
      schemaVersion: 1,
      type: "runner_completed",
      at: input.completedAt,
      status: input.finalOutput.status,
      reasonCode: input.finalOutput.reasonCode,
      ...(input.finalOutput.summary !== undefined
        ? { summary: input.finalOutput.summary }
        : {})
    });
  }
  return rows;
}

function normalizeEvent(
  event: Record<string, unknown>,
  fallbackAt: string,
  options: { allowUnrecognized: boolean }
): CodexTimelineRow | undefined {
  const at = eventTimestamp(event, fallbackAt);
  if (event.type === "thread.started" && typeof event.thread_id === "string") {
    return {
      schemaVersion: 1,
      type: "codex_session_started",
      at,
      codexSessionId: event.thread_id
    };
  }
  const item = isRecord(event.item) ? event.item : undefined;
  const agentMessageRow = normalizeAgentMessageEvent(event, item, at);
  if (agentMessageRow !== undefined) {
    return agentMessageRow;
  }
  if (item?.type === "command_execution") {
    const command = typeof item.command === "string" ? item.command : "command";
    const status = typeof item.status === "string" ? item.status : undefined;
    const eventType = typeof event.type === "string" ? event.type : undefined;
    const completed =
      status === "completed" || eventType === "item.completed";
    if (completed) {
      return {
        schemaVersion: 1,
        type: "command_completed",
        at,
        command,
        exitCode: typeof item.exit_code === "number" ? item.exit_code : null,
        ...summarizeOutput(typeof item.output === "string" ? item.output : "")
      };
    }
    if (status === "in_progress" || eventType === "item.started") {
      return {
        schemaVersion: 1,
        type: "command_started",
        at,
        command,
        ...(typeof item.id === "string" ? { itemId: item.id } : {})
      };
    }
  }
  if (typeof event.type === "string" && options.allowUnrecognized) {
    return {
      schemaVersion: 1,
      type: "runner_event_unrecognized",
      at,
      rawType: event.type
    };
  }
  return undefined;
}

function normalizeAgentMessageEvent(
  event: Record<string, unknown>,
  item: Record<string, unknown> | undefined,
  at: string
): CodexTimelineRow | undefined {
  const summary = agentMessageSummary(event, item);
  if (summary !== undefined) {
    return {
      schemaVersion: 1,
      type: "runner_status",
      at,
      summary
    };
  }
  if (event.type === "agent_message" || item?.type === "agent_message") {
    return {
      schemaVersion: 1,
      type: "runner_event_malformed",
      at,
      rawType: "agent_message"
    };
  }
  return undefined;
}

function agentMessageSummary(
  event: Record<string, unknown>,
  item: Record<string, unknown> | undefined
): string | undefined {
  if (event.type === "agent_message" && typeof event.text === "string") {
    return event.text;
  }
  if (item?.type === "agent_message" && typeof item.text === "string") {
    return item.text;
  }
  if (item?.type === "agent_message" && Array.isArray(item.content)) {
    return extractTextContent(item.content);
  }
  return undefined;
}

function summarizeOutput(output: string): {
  outputLineCount: number;
  outputPreview?: string | undefined;
} {
  if (output.length === 0) {
    return { outputLineCount: 0 };
  }
  const lines = output.replace(/\r?\n$/u, "").split(/\r?\n/u);
  const preview = lines.slice(0, OUTPUT_PREVIEW_LINE_LIMIT).join("\n");
  return {
    outputLineCount: lines.length,
    outputPreview:
      lines.length > OUTPUT_PREVIEW_LINE_LIMIT
        ? `${preview}\n[${lines.length - OUTPUT_PREVIEW_LINE_LIMIT} lines omitted]`
        : preview
  };
}

function extractTextContent(content: readonly unknown[]): string | undefined {
  if (content.length === 0) {
    return undefined;
  }
  return content
    .map((entry) =>
      isRecord(entry) && typeof entry.text === "string" ? entry.text : ""
    )
    .join("") || undefined;
}

function eventTimestamp(event: Record<string, unknown>, fallbackAt: string): string {
  if (typeof event.timestamp === "string") {
    return event.timestamp;
  }
  if (typeof event.at === "string") {
    return event.at;
  }
  return fallbackAt;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
