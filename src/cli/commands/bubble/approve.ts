import { parseArgs } from "node:util";

import {
  asApprovalCommandError,
  emitApprove,
  type EmitApprovalDecisionResult
} from "../../../core/human/approval.js";

export interface BubbleApproveCommandOptions {
  id: string;
  refs: string[];
  repo?: string;
  help: false;
}

export interface BubbleApproveHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedBubbleApproveCommandOptions =
  | BubbleApproveCommandOptions
  | BubbleApproveHelpCommandOptions;

export function getBubbleApproveHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble approve --id <id> [--repo <path>] [--ref <artifact-path>]...",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleApproveCommandOptions(
  args: string[]
): ParsedBubbleApproveCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
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
  if (id === undefined) {
    throw new Error("Missing required option: --id");
  }

  return {
    id,
    refs,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    help: false
  };
}

export async function runBubbleApproveCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitApprovalDecisionResult | null> {
  const options = parseBubbleApproveCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await emitApprove({
      bubbleId: options.id,
      refs: options.refs,
      ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
      cwd
    });
  } catch (error) {
    asApprovalCommandError(error);
  }
}
