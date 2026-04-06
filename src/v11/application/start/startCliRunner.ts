import { spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";

import {
  asStartBubbleErrorV11 as asStartBubbleError,
  startBubbleV11 as startBubble,
  type StartBubbleV11Result as StartBubbleResult
} from "./emitStartV11.js";
import {
  IDEATION_METADATA_PARSE_WARNING
} from "../../shared/ideation/ideationReasonCodes.js";
import {
  hasIdeationMetadataParseWarning
} from "../../domain/ideation/ideationMetadata.js";
import {
  resolveBubbleById,
  type ResolvedBubbleById
} from "../../../core/bubble/bubbleLookup.js";
import { registerRepoInRegistry } from "../../../core/repo/registry.js";
import { parseBubbleStartCommandOptions } from "./startCliOptions.js";

export interface BubbleStartCommandDependencies {
  startBubble?: typeof startBubble;
  resolveBubbleById?: typeof resolveBubbleById;
  registerRepoInRegistry?: typeof registerRepoInRegistry;
  reportRegistryRegistrationWarning?:
    | ((message: string) => void)
    | undefined;
}

interface ResolvedBubbleStartDependencies {
  resolveBubble: typeof resolveBubbleById;
  register: typeof registerRepoInRegistry;
  runStartBubble: typeof startBubble;
  reportWarning: (message: string) => void;
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

function resolveBubbleStartDependencies(
  dependencies: BubbleStartCommandDependencies
): ResolvedBubbleStartDependencies {
  return {
    resolveBubble: dependencies.resolveBubbleById ?? resolveBubbleById,
    register: dependencies.registerRepoInRegistry ?? registerRepoInRegistry,
    runStartBubble: dependencies.startBubble ?? startBubble,
    reportWarning:
      dependencies.reportRegistryRegistrationWarning ??
      ((message: string) => {
        process.stderr.write(`${message}\n`);
      })
  };
}

function warnOnIdeationMetadataParseFailure(input: {
  bubbleId: string;
  bubbleConfig: ResolvedBubbleById["bubbleConfig"];
  reportWarning: (message: string) => void;
}): void {
  if (hasIdeationMetadataParseWarning(input.bubbleConfig)) {
    input.reportWarning(
      `${IDEATION_METADATA_PARSE_WARNING}: bubble ${input.bubbleId} has invalid ideation metadata; falling back to legacy start path.`
    );
  }
}

async function canonicalizeBubbleRepoPath(input: {
  resolvedBubbleRepoPath: string;
  reportWarning: (message: string) => void;
}): Promise<string | null> {
  return realpath(input.resolvedBubbleRepoPath).catch(
    (error: NodeJS.ErrnoException) => {
      const reason = error instanceof Error ? error.message : String(error);
      input.reportWarning(
        `Pairflow warning: skipping repository auto-registration for bubble start (${input.resolvedBubbleRepoPath}) because canonical path resolution failed: ${reason}`
      );
      return null;
    }
  );
}

async function registerStartRepoBestEffort(input: {
  repoPath: string | null;
  register: typeof registerRepoInRegistry;
  reportWarning: (message: string) => void;
}): Promise<void> {
  if (input.repoPath === null) {
    return;
  }
  try {
    await input.register({
      repoPath: input.repoPath
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    input.reportWarning(
      `Pairflow warning: failed to auto-register repository for bubble start (${input.repoPath}): ${reason}`
    );
  }
}

async function runStartAndAttachIfRequested(input: {
  bubbleId: string;
  repoPathForStart: string;
  cwd: string;
  attach: boolean;
  runStartBubble: typeof startBubble;
}): Promise<StartBubbleResult> {
  const result = await input.runStartBubble({
    bubbleId: input.bubbleId,
    repoPath: input.repoPathForStart,
    cwd: input.cwd
  });
  if (input.attach) {
    await runTmuxAttach(result.tmuxSessionName);
  }
  return result;
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

  const resolvedDependencies = resolveBubbleStartDependencies(dependencies);

  try {
    const resolvedBubble = await resolvedDependencies.resolveBubble({
      bubbleId: options.id,
      ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
      cwd
    });
    warnOnIdeationMetadataParseFailure({
      bubbleId: options.id,
      bubbleConfig: resolvedBubble.bubbleConfig,
      reportWarning: resolvedDependencies.reportWarning
    });

    const resolvedBubbleRepoPath = resolvePath(cwd, resolvedBubble.repoPath);
    const canonicalBubbleRepoPath = await canonicalizeBubbleRepoPath({
      resolvedBubbleRepoPath,
      reportWarning: resolvedDependencies.reportWarning
    });
    await registerStartRepoBestEffort({
      repoPath: canonicalBubbleRepoPath,
      register: resolvedDependencies.register,
      reportWarning: resolvedDependencies.reportWarning
    });
    const repoPathForStart = canonicalBubbleRepoPath ?? resolvedBubbleRepoPath;
    return runStartAndAttachIfRequested({
      bubbleId: options.id,
      repoPathForStart,
      cwd,
      attach: options.attach,
      runStartBubble: resolvedDependencies.runStartBubble
    });
  } catch (error) {
    asStartBubbleError(error);
  }
}
