import { parseArgs } from "node:util";

import {
  asOpenBubbleErrorV11 as asOpenBubbleError,
  openBubbleV11 as openBubble,
  type OpenBubbleResult
} from "./emitOpenV11.js";

export interface BubbleOpenCommandOptions {
  id: string;
  repo?: string;
  help: false;
}

export interface BubbleOpenHelpCommandOptions {
  help: true;
}

export type ParsedBubbleOpenCommandOptions =
  | BubbleOpenCommandOptions
  | BubbleOpenHelpCommandOptions;

export function getBubbleOpenHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble open --id <id> [--repo <path>]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Local open uses bubble open_command, then ~/.pairflow/config.toml open_command, then default cursor {{worktree_path}}.",
    "  Remote open uses bubble open_remote_command, then ~/.pairflow/config.toml open_remote_command, then the built-in VS Code Remote SSH folder URI."
  ].join("\n");
}

export function formatBubbleOpenResultText(result: OpenBubbleResult): string {
  if (result.workspaceKind === "remote_clone") {
    const authority =
      result.remoteAuthority === undefined
        ? ""
        : ` authority=${result.remoteAuthority}`;
    return `Opened bubble ${result.bubbleId}: remote clone${authority} path=${result.workspacePath}`;
  }

  return `Opened bubble ${result.bubbleId}: worktree ${result.workspacePath}`;
}

export function parseBubbleOpenCommandOptions(
  args: string[]
): ParsedBubbleOpenCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
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
    throw new Error(
      "OPEN_ID_REQUIRED: Missing required option: --id. context: command_name=open."
    );
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    help: false
  };
}

export async function runBubbleOpenCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<OpenBubbleResult | null> {
  const options = parseBubbleOpenCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await openBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asOpenBubbleError(error);
  }
}
