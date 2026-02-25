import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";

import {
  asStartBubbleError,
  startBubble,
  type StartBubbleResult
} from "../../../core/bubble/startBubble.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { registerRepoInRegistry } from "../../../core/repo/registry.js";

export interface BubbleStartCommandOptions {
  id: string;
  repo?: string;
  attach: boolean;
  help: false;
}

export interface BubbleStartHelpCommandOptions {
  help: true;
}

export type ParsedBubbleStartCommandOptions =
  | BubbleStartCommandOptions
  | BubbleStartHelpCommandOptions;

export interface BubbleStartCommandDependencies {
  startBubble?: typeof startBubble;
  resolveBubbleById?: typeof resolveBubbleById;
  registerRepoInRegistry?: typeof registerRepoInRegistry;
  reportRegistryRegistrationWarning?:
    | ((message: string) => void)
    | undefined;
}

export function getBubbleStartHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble start --id <id> [--repo <path>] [--attach]",
    "  Starts CREATED bubbles or reattaches runtime-state bubbles after restart.",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --attach              Auto-attach/switch to the bubble tmux session after start",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleStartCommandOptions(
  args: string[]
): ParsedBubbleStartCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      attach: {
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
    attach: parsed.values.attach ?? false,
    help: false
  };
}

async function runTmuxAttach(sessionName: string): Promise<void> {
  const args =
    process.env.TMUX !== undefined && process.env.TMUX.length > 0
      ? ["switch-client", "-t", sessionName]
      : ["attach-session", "-t", sessionName];
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn("tmux", args, {
      stdio: "inherit"
    });
    child.on("error", rejectPromise);
    child.on("close", (exitCode) => {
      if ((exitCode ?? 1) !== 0) {
        rejectPromise(
          new Error(
            `Failed to attach tmux session ${sessionName} (exit ${exitCode ?? 1}).`
          )
        );
        return;
      }
      resolvePromise();
    });
  });
}

export async function runBubbleStartCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleStartCommandDependencies = {}
): Promise<StartBubbleResult | null> {
  const options = parseBubbleStartCommandOptions(args);
  if (options.help) {
    return null;
  }

  const resolveBubble =
    dependencies.resolveBubbleById ?? resolveBubbleById;
  const register = dependencies.registerRepoInRegistry ?? registerRepoInRegistry;
  const runStartBubble = dependencies.startBubble ?? startBubble;
  const reportWarning =
    dependencies.reportRegistryRegistrationWarning ??
    ((message: string) => {
      process.stderr.write(`${message}\n`);
    });

  try {
    const resolvedBubble = await resolveBubble({
      bubbleId: options.id,
      ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
      cwd
    });
    const resolvedBubbleRepoPath = resolvePath(cwd, resolvedBubble.repoPath);
    const canonicalBubbleRepoPath = await realpath(resolvedBubbleRepoPath).catch(
      (error: NodeJS.ErrnoException) => {
        const reason = error instanceof Error ? error.message : String(error);
        reportWarning(
          `Pairflow warning: skipping repository auto-registration for bubble start (${resolvedBubbleRepoPath}) because canonical path resolution failed: ${reason}`
        );
        return null;
      }
    );
    if (canonicalBubbleRepoPath !== null) {
      try {
        await register({
          repoPath: canonicalBubbleRepoPath
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        reportWarning(
          `Pairflow warning: failed to auto-register repository for bubble start (${canonicalBubbleRepoPath}): ${reason}`
        );
      }
    }
    const repoPathForStart = canonicalBubbleRepoPath ?? resolvedBubbleRepoPath;

    const result = await runStartBubble({
      bubbleId: options.id,
      repoPath: repoPathForStart,
      cwd
    });
    if (options.attach) {
      await runTmuxAttach(result.tmuxSessionName);
    }
    return result;
  } catch (error) {
    asStartBubbleError(error);
  }
}
