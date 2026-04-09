import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";

import { SchemaValidationError } from "../../shared/validation/primitives.js";
import { DEFAULT_ATTACH_LAUNCHER } from "../../../config/defaults.js";
import {
  loadPairflowGlobalConfig,
} from "../../../config/pairflowConfig.js";
import type { AttachLauncher } from "../../../types/bubble.js";
import {
  BubbleLookupError,
  attachDefaults
} from "../../../core/bubble/attachDefaults.js";
import { buildBubbleTmuxSessionName } from "../../shared/bubble/tmuxSessionName.js";
import { buildCheckLauncherAvailabilityDefault } from "./attachBubbleLauncherAvailability.js";
import {
  buildAttachCommand,
  resolveAttachLauncher
} from "./attachBubbleLauncherRuntime.js";
import {
  AttachBubbleError,
  type AttachBubbleDependencies,
  type AttachBubbleInput,
  type AttachBubbleResult,
  type AttachCommandExecutionInput,
  type AttachCommandExecutionResult,
  type AttachCommandExecutor
} from "./attachBubbleContract.js";

export type {
  AttachBubbleDependencies,
  AttachBubbleInput,
  AttachBubbleReasonCode,
  AttachBubbleResult,
  AttachBubbleV11Dependencies,
  AttachBubbleV11Input,
  AttachBubbleV11Result,
  AttachCommandExecutionInput,
  AttachCommandExecutionResult,
  AttachCommandExecutor,
  AttachLauncherFailureClass,
  LauncherAvailabilityChecker,
  LauncherAvailabilityInput,
  TmuxSessionChecker
} from "./attachBubbleContract.js";
export { AttachBubbleError } from "./attachBubbleContract.js";

export { AttachBubbleError as AttachBubbleErrorV11 };

export const executeAttachCommand: AttachCommandExecutor = async (
  input: AttachCommandExecutionInput
): Promise<AttachCommandExecutionResult> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("bash", ["-lc", input.command], {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (exitCode) => {
      resolvePromise({
        exitCode: exitCode ?? 1,
        stdout,
        stderr
      });
    });
  });

async function checkTmuxSessionExistsDefault(sessionName: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const child = spawn("tmux", ["has-session", "-t", sessionName], {
      stdio: ["ignore", "ignore", "ignore"]
    });

    child.on("error", () => {
      resolvePromise(false);
    });

    child.on("close", (exitCode) => {
      resolvePromise(exitCode === 0);
    });
  });
}

async function writeYamlFileDefault(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export async function attachBubble(
  input: AttachBubbleInput,
  dependencies: AttachBubbleDependencies = {}
): Promise<AttachBubbleResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? attachDefaults.resolveBubbleById;
  const checkSession =
    dependencies.checkTmuxSessionExists ?? checkTmuxSessionExistsDefault;
  const writeYaml = dependencies.writeYamlFile ?? writeYamlFileDefault;
  const runCommand = dependencies.executeAttachCommand ?? executeAttachCommand;
  const checkLauncherAvailability =
    dependencies.checkLauncherAvailability ??
    buildCheckLauncherAvailabilityDefault(runCommand);
  const loadGlobalConfig =
    dependencies.loadPairflowGlobalConfig ??
    loadPairflowGlobalConfig;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const tmuxSessionName = buildBubbleTmuxSessionName(resolved.bubbleId);
  const sessionExists = await checkSession(tmuxSessionName);
  if (!sessionExists) {
    throw new AttachBubbleError(
      `Tmux session "${tmuxSessionName}" does not exist. Start the bubble runtime first.`,
      {
        context: {
          bubbleId: resolved.bubbleId,
          reason: "tmux_session_missing",
          repoPath: resolved.repoPath,
          tmuxSessionName
        },
        reasonCode: "TMUX_SESSION_MISSING"
      }
    );
  }

  let globalAttachLauncher: AttachLauncher | undefined;
  if (resolved.bubbleConfig.attach_launcher === undefined) {
    try {
      globalAttachLauncher = (await loadGlobalConfig()).attach_launcher;
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        globalAttachLauncher = undefined;
      } else {
        const reason = error instanceof Error ? error.message : String(error);
        throw new AttachBubbleError(
          `Failed to load global Pairflow config for '${resolved.bubbleId}': ${reason}`,
          {
            context: {
              bubbleId: resolved.bubbleId,
              reason: "load_global_config_failed",
              repoPath: resolved.repoPath
            }
          }
        );
      }
    }
  }

  const launcherRequested =
    resolved.bubbleConfig.attach_launcher ??
    globalAttachLauncher ??
    DEFAULT_ATTACH_LAUNCHER;
  const attachCommand = buildAttachCommand(tmuxSessionName);
  const launcherResolution = await resolveAttachLauncher({
    launcherRequested,
    context: {
      tmuxSessionName,
      repoPath: resolved.repoPath,
      attachCommand,
      executeAttachCommand: runCommand,
      writeYamlFile: writeYaml
    },
    checkLauncherAvailability
  });

  return {
    bubbleId: resolved.bubbleId,
    tmuxSessionName,
    launcherRequested,
    launcherUsed: launcherResolution.launcherUsed,
    ...(launcherResolution.attachCommand !== undefined
      ? { attachCommand: launcherResolution.attachCommand }
      : {})
  };
}

export { attachBubble as attachBubbleV11 };

export function asAttachBubbleError(error: unknown): never {
  if (error instanceof AttachBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new AttachBubbleError(error.message, {
      context: {
        reason: "bubble_lookup_error"
      }
    });
  }
  if (error instanceof Error) {
    throw new AttachBubbleError(error.message, {
      context: {
        reason: "unexpected_attach_error"
      }
    });
  }
  throw error;
}

export { asAttachBubbleError as asAttachBubbleErrorV11 };
