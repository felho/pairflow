import { parseArgs } from "node:util";

import { extractBubbleV11 } from "./emitExtractV11.js";
import type { ExtractCommandResult } from "./extractCommandContract.js";

export interface BubbleExtractCommandOptions {
  id: string;
  paths: string[];
  repo?: string;
  commit: boolean;
  message?: string;
  json: boolean;
  help: false;
}

export interface BubbleExtractHelpCommandOptions {
  help: true;
}

export type ParsedBubbleExtractCommandOptions =
  | BubbleExtractCommandOptions
  | BubbleExtractHelpCommandOptions;

export function getBubbleExtractHelpText(): string {
  return [
    "Usage:",
    '  pairflow bubble extract --id <id> --path <artifact-path> [--path <artifact-path>...] [--repo <path>] [--commit] [--message "<text>"] [--json]',
    "",
    "Options:",
    "  --id <id>             Ideation bubble id",
    "  --path <path>         Explicit selected artifact path (repeatable)",
    "  --repo <path>         Optional target repository path (defaults to cwd ancestry lookup)",
    "  --commit              Record intent to commit selected paths in a later implementation phase",
    "  --message <text>      Optional commit message intent; requires --commit",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Requires ideation.mode=true in bubble metadata.",
    "  This contract validates command and checkout preconditions only; file transfer and git commit execution are not implemented in this phase.",
    "  Existing target-path conflicts are fail-closed successor validation owned by the path-selection phase."
  ].join("\n");
}

export function parseBubbleExtractCommandOptions(
  args: string[]
): ParsedBubbleExtractCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      path: {
        type: "string",
        multiple: true
      },
      repo: {
        type: "string"
      },
      commit: {
        type: "boolean"
      },
      message: {
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
  if (id === undefined || id.trim().length === 0) {
    throw new Error(
      "EXTRACT_ID_REQUIRED: Missing required option: --id. context: command_name=extract."
    );
  }

  const paths = parsed.values.path ?? [];
  if (paths.length === 0) {
    throw new Error(
      "EXTRACT_PATH_REQUIRED: Missing required option: --path. context: command_name=extract."
    );
  }

  const commit = parsed.values.commit ?? false;
  if (parsed.values.message !== undefined && !commit) {
    throw new Error(
      "EXTRACT_MESSAGE_REQUIRES_COMMIT: --message requires --commit. context: command_name=extract."
    );
  }

  return {
    id,
    paths,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    commit,
    ...(parsed.values.message !== undefined ? { message: parsed.values.message } : {}),
    json: parsed.values.json ?? false,
    help: false
  };
}

export function renderBubbleExtractText(result: ExtractCommandResult): string {
  const pathCount = result.paths.length;
  if (result.status === "implementation_deferred") {
    return [
      `Extract preconditions passed for ${result.bubbleId}: ${pathCount} selected path(s).`,
      "Transfer is not implemented in this phase; no files were copied, staged, or committed.",
      `reason=${result.reasonCode}`
    ].join(" ");
  }

  return [
    `Extract failed for ${result.bubbleId}: ${result.reasonCode}.`,
    "No files were copied, staged, or committed."
  ].join(" ");
}

export async function runBubbleExtractCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<ExtractCommandResult | null> {
  const options = parseBubbleExtractCommandOptions(args);
  if (options.help) {
    return null;
  }

  return extractBubbleV11({
    id: options.id,
    paths: options.paths,
    ...(options.repo !== undefined ? { repo: options.repo } : {}),
    commit: options.commit,
    ...(options.message !== undefined ? { message: options.message } : {}),
    json: options.json,
    cwd
  });
}
