import { parseArgs } from "node:util";

import {
  asBubbleInboxError,
  getBubbleInbox,
  type BubbleInboxView
} from "../../../core/bubble/inboxBubble.js";

export interface BubbleInboxCommandOptions {
  id: string;
  repo?: string;
  json: boolean;
  help: false;
}

export interface BubbleInboxHelpCommandOptions {
  help: true;
}

export type ParsedBubbleInboxCommandOptions =
  | BubbleInboxCommandOptions
  | BubbleInboxHelpCommandOptions;

export function getBubbleInboxHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble inbox --id <id> [--repo <path>] [--json]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Shows unresolved HUMAN_QUESTION and APPROVAL_REQUEST items."
  ].join("\n");
}

export function parseBubbleInboxCommandOptions(
  args: string[]
): ParsedBubbleInboxCommandOptions {
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

export function renderBubbleInboxText(view: BubbleInboxView): string {
  const lines = [
    `Bubble: ${view.bubbleId}`,
    `State: ${view.state}`,
    `Pending inbox items: questions=${view.pending.humanQuestions}, approvals=${view.pending.approvalRequests}, total=${view.pending.total}`
  ];

  if (view.items.length === 0) {
    lines.push("No pending inbox items.");
    return lines.join("\n");
  }

  lines.push("Items:");
  view.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.type} ${item.envelopeId} round=${item.round} from=${item.sender} at=${item.ts}`
    );
    lines.push(`   ${item.summary}`);
  });

  return lines.join("\n");
}

export async function runBubbleInboxCommand(
  args: string[] | BubbleInboxCommandOptions,
  cwd: string = process.cwd()
): Promise<BubbleInboxView | null> {
  const options = Array.isArray(args) ? parseBubbleInboxCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  try {
    return await getBubbleInbox({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asBubbleInboxError(error);
  }
}
