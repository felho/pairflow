import { parseArgs } from "node:util";

import {
  asBubbleStatusError,
  getBubbleStatus,
  type BubbleStatusView
} from "../../../core/bubble/statusBubble.js";

export interface BubbleStatusCommandOptions {
  id: string;
  repo?: string;
  json: boolean;
  help: false;
}

export interface BubbleStatusHelpCommandOptions {
  help: true;
}

export type ParsedBubbleStatusCommandOptions =
  | BubbleStatusCommandOptions
  | BubbleStatusHelpCommandOptions;

export function getBubbleStatusHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble status --id <id> [--repo <path>] [--json]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleStatusCommandOptions(
  args: string[]
): ParsedBubbleStatusCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      json: {
        type: "boolean"
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  if (parsed.values.help ?? false) {
    return { help: true };
  }

  const id = parsed.values.id;
  if (id === undefined) {
    throw new Error("Missing required option: --id");
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    json: parsed.values.json ?? false,
    help: false
  };
}

export function renderBubbleStatusText(status: BubbleStatusView): string {
  const lines: string[] = [
    `Bubble: ${status.bubbleId}`,
    `State: ${status.state} (round ${status.round})`,
    `Active: ${status.activeAgent ?? "-"} (${status.activeRole ?? "-"}) since ${status.activeSince ?? "-"}`,
    `Last command: ${status.lastCommandAt ?? "-"}`,
    `Watchdog: ${status.watchdog.monitored ? "on" : "off"} timeout=${status.watchdog.timeoutMinutes}m remaining=${status.watchdog.remainingSeconds ?? "-"}s expired=${status.watchdog.expired ? "yes" : "no"}`,
    `Inbox pending: questions=${status.pendingInboxItems.humanQuestions}, approvals=${status.pendingInboxItems.approvalRequests}, total=${status.pendingInboxItems.total}`,
    `Transcript: messages=${status.transcript.totalMessages}, last=${status.transcript.lastMessageType ?? "-"} @ ${status.transcript.lastMessageTs ?? "-"}`
  ];

  return lines.join("\n");
}

export async function runBubbleStatusCommand(
  args: string[] | BubbleStatusCommandOptions,
  cwd: string = process.cwd()
): Promise<BubbleStatusView | null> {
  const options =
    Array.isArray(args) ? parseBubbleStatusCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  try {
    return await getBubbleStatus({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asBubbleStatusError(error);
  }
}
