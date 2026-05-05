import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { loadPairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import { processSpawn } from "../../shared/process/processSpawnDefaults.js";
import { buildCheckLauncherAvailabilityDefault } from "./attachBubbleLauncherAvailability.js";
import {
  buildAttachCommand,
  buildRemoteAttachCommand,
  resolveAttachLauncher
} from "./attachBubbleLauncherRuntime.js";
import { resolveAttachBubbleExecution } from "../../shared/bubbleAttachment/resolveAttachBubbleExecution.js";
import { statusCommandDependencyDefaults } from "../../shared/status/statusCommandDependencyDefaults.js";
import {
  AttachBubbleError,
  type AttachBubbleReasonCode,
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
    const child = processSpawn("bash", ["-lc", input.command], {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (child.stdout === null || child.stderr === null) {
      rejectPromise(new Error("spawned attach command did not expose pipe streams"));
      return;
    }

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
    const child = processSpawn("tmux", ["has-session", "-t", sessionName], {
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
    dependencies.readRemotePointer ?? statusCommandDependencyDefaults.readRemotePointer;

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

export { attachBubble as attachBubbleV11 };

function isBubbleLookupError(
  candidate: unknown
): candidate is Error & { name: "BubbleLookupError" } {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    "name" in candidate &&
    (candidate as { name?: unknown }).name === "BubbleLookupError"
  );
}

export function asAttachBubbleError(error: unknown): never {
  if (error instanceof AttachBubbleError) {
    throw error;
  }
  if (isBubbleLookupError(error)) {
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
