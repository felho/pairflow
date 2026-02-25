import { parseArgs } from "node:util";

import {
  asBubbleWatchdogError,
  runBubbleWatchdog,
  type BubbleWatchdogResult
} from "../../../core/bubble/watchdogBubble.js";

export interface BubbleWatchdogCommandOptions {
  id: string;
  repo?: string;
  json: boolean;
  help: false;
}

export interface BubbleWatchdogHelpCommandOptions {
  help: true;
}

export type ParsedBubbleWatchdogCommandOptions =
  | BubbleWatchdogCommandOptions
  | BubbleWatchdogHelpCommandOptions;

export function getBubbleWatchdogHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble watchdog --id <id> [--repo <path>] [--json]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Triggers watchdog escalation when active agent is idle beyond timeout."
  ].join("\n");
}

export function parseBubbleWatchdogCommandOptions(
  args: string[]
): ParsedBubbleWatchdogCommandOptions {
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

export function renderBubbleWatchdogText(result: BubbleWatchdogResult): string {
  if (result.escalated) {
    return `Watchdog escalated for ${result.bubbleId}: ${result.envelope?.id ?? "unknown"} -> WAITING_HUMAN`;
  }
  const suffix = result.stuckRetried === true ? " [stuck input retried]" : "";
  return `Watchdog check for ${result.bubbleId}: no escalation (${result.reason})${suffix}`;
}

export async function runBubbleWatchdogCommand(
  args: string[] | BubbleWatchdogCommandOptions,
  cwd: string = process.cwd()
): Promise<BubbleWatchdogResult | null> {
  const options = Array.isArray(args) ? parseBubbleWatchdogCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  try {
    return await runBubbleWatchdog({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asBubbleWatchdogError(error);
  }
}
