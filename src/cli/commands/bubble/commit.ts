import { parseArgs } from "node:util";

import {
  commitBubble,
  asBubbleCommitError
} from "../../../v11/application/commit/commitCommandApi.js";
import type { CommitBubbleResult } from "../../../v11/application/commit/commitCommandContract.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../../../v11/infrastructure/executor/workspace/bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../v11/infrastructure/state/stateStore.js";
import { runGit } from "../../../v11/infrastructure/workspace/git.js";

const defaultCommitBubbleDependencies = {
  appendProtocolEnvelope,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById,
  runGit,
  writeStateSnapshot
} as const;

export interface BubbleCommitCommandOptions {
  id: string;
  refs: string[];
  repo?: string;
  message?: string;
  auto: boolean;
  help: false;
}

export interface BubbleCommitHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedBubbleCommitCommandOptions =
  | BubbleCommitCommandOptions
  | BubbleCommitHelpCommandOptions;

export function getBubbleCommitHelpText(): string {
  return [
    "Usage:",
    '  pairflow bubble commit --id <id> [--repo <path>] [--message "<text>"] [--ref <artifact-path>]... [--auto]',
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --message <text>      Optional git commit message override",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  --auto                Auto-stage all worktree changes and auto-generate done-package when missing/empty",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Requires state APPROVED_FOR_COMMIT.",
    "  Without --auto, commit expects staged files + non-empty artifacts/done-package.md."
  ].join("\n");
}

export function parseBubbleCommitCommandOptions(
  args: string[]
): ParsedBubbleCommitCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      message: {
        type: "string"
      },
      auto: {
        type: "boolean"
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
  if (parsed.values.help ?? false) {
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
    ...(parsed.values.message !== undefined ? { message: parsed.values.message } : {}),
    auto: parsed.values.auto ?? false,
    help: false
  };
}

export async function runBubbleCommitCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<CommitBubbleResult | null> {
  const options = parseBubbleCommitCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await commitBubble({
      bubbleId: options.id,
      refs: options.refs,
      repoPath: options.repo,
      message: options.message,
      auto: options.auto,
      cwd
    }, defaultCommitBubbleDependencies);
  } catch (error) {
    asBubbleCommitError(error);
  }
}
