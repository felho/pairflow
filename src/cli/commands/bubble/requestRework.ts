import { parseArgs } from "node:util";

import {
  asApprovalCommandError,
  emitRequestRework,
  type EmitRequestReworkResult
} from "../../../core/human/approval.js";

export interface BubbleRequestReworkCommandOptions {
  id: string;
  message: string;
  refs: string[];
  repo?: string;
  help: false;
}

export interface BubbleRequestReworkHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedBubbleRequestReworkCommandOptions =
  | BubbleRequestReworkCommandOptions
  | BubbleRequestReworkHelpCommandOptions;

export function getBubbleRequestReworkHelpText(): string {
  return [
    "Usage:",
    '  pairflow bubble request-rework --id <id> --message "<text>" [--repo <path>] [--ref <artifact-path>]...',
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --message <text>      Required rework request message",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleRequestReworkCommandOptions(
  args: string[]
): ParsedBubbleRequestReworkCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      message: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      ref: {
        type: "string",
        multiple: true
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  const refs = parsed.values.ref ?? [];
  const help = parsed.values.help ?? false;
  if (help) {
    return {
      refs,
      help: true
    };
  }

  const id = parsed.values.id;
  const message = parsed.values.message;
  if (id === undefined || message === undefined) {
    const missing: string[] = [];
    if (id === undefined) {
      missing.push("--id");
    }
    if (message === undefined) {
      missing.push("--message");
    }
    throw new Error(`Missing required options: ${missing.join(", ")}`);
  }

  return {
    id,
    message,
    refs,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    help: false
  };
}

export async function runBubbleRequestReworkCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitRequestReworkResult | null> {
  const options = parseBubbleRequestReworkCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await emitRequestRework({
      bubbleId: options.id,
      message: options.message,
      refs: options.refs,
      ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
      cwd
    });
  } catch (error) {
    asApprovalCommandError(error);
  }
}
