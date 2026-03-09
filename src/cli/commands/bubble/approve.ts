import { parseArgs } from "node:util";

import {
  asApprovalCommandError,
  emitApprove,
  type EmitApprovalDecisionResult
} from "../../../core/human/approval.js";

export interface BubbleApproveCommandOptions {
  id: string;
  overrideNonApprove: boolean;
  overrideReason?: string;
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
    "  pairflow bubble approve --id <id> [--override-non-approve] [--override-reason <text>] [--repo <path>] [--ref <artifact-path>]...",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --override-non-approve",
    "                        Required when latest autonomous recommendation is rework or inconclusive",
    "  --override-reason <text>",
    "                        Required with --override-non-approve; must be non-empty after trimming",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  Note: approval is accepted from READY_FOR_HUMAN_APPROVAL or META_REVIEW_FAILED (legacy READY_FOR_APPROVAL remains compatible).",
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
      "override-non-approve": {
        type: "boolean"
      },
      "override-reason": {
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
  const overrideReason = parsed.values["override-reason"];
  if (overrideReason !== undefined && overrideReason.trim().length === 0) {
    throw new Error(
      "APPROVAL_OVERRIDE_REASON_REQUIRED: --override-reason must be non-empty after trimming whitespace."
    );
  }
  if (id === undefined) {
    throw new Error("Missing required option: --id");
  }

  return {
    id,
    overrideNonApprove: parsed.values["override-non-approve"] ?? false,
    ...(overrideReason !== undefined ? { overrideReason } : {}),
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
      overrideNonApprove: options.overrideNonApprove,
      ...(options.overrideReason !== undefined
        ? { overrideReason: options.overrideReason }
        : {}),
      refs: options.refs,
      ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
      cwd
    });
  } catch (error) {
    asApprovalCommandError(error);
  }
}
