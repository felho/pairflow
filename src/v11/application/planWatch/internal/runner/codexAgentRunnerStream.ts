import type { StructuredAgentRunnerOutput } from "./agentRunnerBridgeContract.js";
import { parseStructuredAgentRunnerRecord } from "./agentRunnerBridgeResult.js";

export interface ParsedCodexStream {
  rawLines: readonly string[];
  events: readonly CodexJsonEvent[];
  malformed: boolean;
  finalOutput: StructuredAgentRunnerOutput | null;
  codexSessionId?: string | undefined;
}

export interface CodexJsonEvent {
  line: string;
  value: Record<string, unknown>;
}

export function parseCodexJsonlStream(stdout: string): ParsedCodexStream {
  const rawLines = stdout.split(/\r?\n/u).filter((line) => line.length > 0);
  const events: CodexJsonEvent[] = [];
  let malformed = false;
  let finalOutput: StructuredAgentRunnerOutput | null = null;
  let codexSessionId: string | undefined;

  for (const line of rawLines) {
    const parsed = parseJsonObject(line);
    if (parsed === null) {
      malformed = true;
      continue;
    }
    events.push({ line, value: parsed });
    codexSessionId ??= extractCodexSessionId(parsed);
    const messageText = extractAgentMessageText(parsed);
    if (messageText === undefined) {
      continue;
    }
    const structured = parseStructuredMessageText(messageText);
    if (structured !== null) {
      finalOutput = structured;
    }
  }

  return {
    rawLines,
    events,
    malformed,
    finalOutput: malformed ? null : finalOutput,
    ...(codexSessionId !== undefined ? { codexSessionId } : {})
  };
}

function parseStructuredMessageText(text: string): StructuredAgentRunnerOutput | null {
  const parsed = parseJsonObject(text);
  if (parsed === null) {
    return null;
  }
  return parseStructuredAgentRunnerRecord(parsed);
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractAgentMessageText(event: Record<string, unknown>): string | undefined {
  if (event.type === "agent_message" && typeof event.text === "string") {
    return event.text;
  }
  const item = event.item;
  if (!isRecord(item)) {
    return undefined;
  }
  if (item.type === "agent_message" && typeof item.text === "string") {
    return item.text;
  }
  if (
    item.type === "agent_message"
    && Array.isArray(item.content)
    && item.content.length > 0
  ) {
    return item.content
      .map((entry) =>
        isRecord(entry) && typeof entry.text === "string" ? entry.text : ""
      )
      .join("");
  }
  return undefined;
}

function extractCodexSessionId(event: Record<string, unknown>): string | undefined {
  if (event.type !== "thread.started") {
    return undefined;
  }
  return typeof event.thread_id === "string" && event.thread_id.length > 0
    ? event.thread_id
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
