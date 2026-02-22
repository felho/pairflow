import { parseArgs } from "node:util";

import {
  asHumanReplyCommandError,
  emitHumanReply,
  type EmitHumanReplyResult
} from "../../../core/human/reply.js";

export interface BubbleReplyCommandOptions {
  id: string;
  message: string;
  refs: string[];
  repo?: string;
  help: false;
}

export interface BubbleReplyHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedBubbleReplyCommandOptions =
  | BubbleReplyCommandOptions
  | BubbleReplyHelpCommandOptions;

export function getBubbleReplyHelpText(): string {
  return [
    "Usage:",
    '  pairflow bubble reply --id <id> --message "<text>" [--repo <path>] [--ref <artifact-path>]...',
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --message <text>      Required human reply",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleReplyCommandOptions(
  args: string[]
): ParsedBubbleReplyCommandOptions {
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

export async function runBubbleReplyCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitHumanReplyResult | null> {
  const options = parseBubbleReplyCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await emitHumanReply({
      bubbleId: options.id,
      message: options.message,
      refs: options.refs,
      ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
      cwd
    });
  } catch (error) {
    asHumanReplyCommandError(error);
  }
}
