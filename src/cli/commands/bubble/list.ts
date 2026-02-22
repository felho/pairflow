import { parseArgs } from "node:util";

import {
  asBubbleListError,
  listBubbles,
  type BubbleListView
} from "../../../core/bubble/listBubbles.js";

export interface BubbleListCommandOptions {
  repo?: string;
  json: boolean;
  help: false;
}

export interface BubbleListHelpCommandOptions {
  help: true;
}

export type ParsedBubbleListCommandOptions =
  | BubbleListCommandOptions
  | BubbleListHelpCommandOptions;

export function getBubbleListHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble list [--repo <path>] [--json]",
    "",
    "Options:",
    "  --repo <path>         Optional repository path (defaults to git top-level from cwd)",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleListCommandOptions(
  args: string[]
): ParsedBubbleListCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
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

  return {
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    json: parsed.values.json ?? false,
    help: false
  };
}

export function renderBubbleListText(view: BubbleListView): string {
  const lines: string[] = [
    `Repository: ${view.repoPath}`,
    `Bubbles: total=${view.total}`,
    `Runtime sessions: registered=${view.runtimeSessions.registered}, stale=${view.runtimeSessions.stale}`,
    `States: CREATED=${view.byState.CREATED}, PREPARING_WORKSPACE=${view.byState.PREPARING_WORKSPACE}, RUNNING=${view.byState.RUNNING}, WAITING_HUMAN=${view.byState.WAITING_HUMAN}, READY_FOR_APPROVAL=${view.byState.READY_FOR_APPROVAL}, APPROVED_FOR_COMMIT=${view.byState.APPROVED_FOR_COMMIT}, COMMITTED=${view.byState.COMMITTED}, DONE=${view.byState.DONE}, FAILED=${view.byState.FAILED}, CANCELLED=${view.byState.CANCELLED}`
  ];

  if (view.bubbles.length === 0) {
    lines.push("No bubbles found.");
    return lines.join("\n");
  }

  lines.push("Bubble details:");
  for (const bubble of view.bubbles) {
    const session = bubble.runtimeSession?.tmuxSessionName ?? "-";
    lines.push(
      `- ${bubble.bubbleId}: state=${bubble.state}, round=${bubble.round}, active=${bubble.activeAgent ?? "-"}(${bubble.activeRole ?? "-"}), session=${session}`
    );
  }

  return lines.join("\n");
}

export async function runBubbleListCommand(
  args: string[] | BubbleListCommandOptions,
  cwd: string = process.cwd()
): Promise<BubbleListView | null> {
  const options = Array.isArray(args) ? parseBubbleListCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  try {
    return await listBubbles({
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asBubbleListError(error);
  }
}
