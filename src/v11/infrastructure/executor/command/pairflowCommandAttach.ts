import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";

import { loadPairflowGlobalConfig } from "../../../../config/pairflowConfig.js";
import { readRemotePointer } from "../../artifact/bubble/remoteExecutionArtifacts.js";
import {
  BubbleLookupError
} from "../workspace/bubbleLookup.js";
import {
  AttachBubbleError,
  type AttachBubbleReasonCode,
  type AttachBubbleDependencies,
  type AttachBubbleInput,
  type AttachBubbleResult,
  type AttachCommandExecutionInput,
  type AttachCommandExecutionResult,
  type AttachCommandExecutor
} from "./pairflowCommandAttachContract.js";
import {
  buildAttachCommand,
  buildRemoteAttachCommand,
  resolveAttachLauncher
} from "./pairflowCommandAttachLauncherRuntime.js";
import { buildCheckLauncherAvailabilityDefault } from "./pairflowCommandAttachLauncherAvailability.js";
import { resolveAttachBubbleExecution } from "../../../shared/bubbleAttachment/resolveAttachBubbleExecution.js";

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
  const resolveBubble = dependencies.resolveBubbleById;
  if (resolveBubble === undefined) {
    throw new AttachBubbleError(
      "Attach bubble requires resolveBubbleById dependency.",
      {
        context: {
          reason: "resolve_bubble_dependency_missing"
        }
      }
    );
  }
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
  const readRemotePointerArtifact =
    dependencies.readRemotePointer ?? readRemotePointer;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const resolvedExecution = await resolveAttachBubbleExecution({
    request: input,
    resolved,
    checkTmuxSessionExists: checkSession,
    loadPairflowGlobalConfig: loadGlobalConfig,
    readRemotePointer: readRemotePointerArtifact,
    buildAttachCommand,
    buildRemoteAttachCommand,
    createAttachError: ({ message, options }) =>
      new AttachBubbleError(message, {
        ...(options?.context !== undefined ? { context: options.context } : {}),
        ...(options?.reasonCode !== undefined
          ? { reasonCode: options.reasonCode as AttachBubbleReasonCode }
          : {})
      }),
    isAttachError: (error): error is AttachBubbleError =>
      error instanceof AttachBubbleError
  });

  const launcherResolution = await resolveAttachLauncher({
    launcherRequested: resolvedExecution.launcherRequested,
    context: {
      tmuxSessionName: resolvedExecution.tmuxSessionName,
      repoPath: resolved.repoPath,
      attachCommand: resolvedExecution.attachCommand,
      executeAttachCommand: runCommand,
      writeYamlFile: writeYaml
    },
    checkLauncherAvailability
  });

  return {
    bubbleId: resolved.bubbleId,
    tmuxSessionName: resolvedExecution.tmuxSessionName,
    launcherRequested: resolvedExecution.launcherRequested,
    launcherUsed: launcherResolution.launcherUsed,
    ...(launcherResolution.attachCommand !== undefined
      ? { attachCommand: launcherResolution.attachCommand }
      : {}),
    ...(resolvedExecution.diagnostics !== undefined
      ? { diagnostics: resolvedExecution.diagnostics }
      : {})
  };
}

export type { AttachBubbleResult } from "./pairflowCommandAttachContract.js";

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

