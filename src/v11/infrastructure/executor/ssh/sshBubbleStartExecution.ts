import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

import { buildBubbleTmuxSessionName } from "../../../shared/bubble/tmuxSessionName.js";
import type { BubbleRemoteStateCache } from "../../../../types/bubble.js";
import { normalizeRemoteStateSnapshotForCache } from "./sshBubbleStartState.js";
import {
  RemoteBubbleStartError,
  buildCloneRemoteRepositoryScript,
  buildReadRemoteHomeDirectoryScript,
  buildReadRemoteStateSnapshotScript,
  buildRemoteInnerStartScript,
  buildRemoteInstanceId,
  buildScpCommandArgs,
  buildScpUploadDestination,
  buildSshCommandArgs,
  buildSshTarget,
  describeTransportFailure,
  extractRemoteHomeDirectoryPayload,
  extractRemoteStateSnapshotPayload,
  isHomeRelativeRemotePath,
  resolveHomeRelativeRemotePath,
  rewriteRemoteBubbleTomlRepoPath
} from "./sshBubbleStartShared.js";

interface RemoteStartControlFile {
  relativePath: string;
  content: string;
}

interface ExecuteRemoteBubbleStartInput {
  bubbleId: string;
  bubbleConfig: {
    bubble_branch: string;
    base_branch: string;
    max_rounds: number;
  };
  remoteTarget: {
    host: string;
    user?: string;
    pairflowCommand: string;
    pairflowSyncCommand?: string;
  };
  originUrl: string;
  remoteClonePath: string;
  controlFiles: RemoteStartControlFile[];
}

interface ExecuteRemoteBubbleStartResult {
  remoteClonePath: string;
  tmuxSessionName: string;
  startedAt: string;
  instanceId: string;
  remoteState: BubbleRemoteStateCache;
  warnings?: string[];
}

async function runCommand(
  command: string,
  args: string[]
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
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
    child.on("error", rejectPromise);
    child.on("close", (exitCode) => {
      resolvePromise({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });
  });
}

async function runSshCommand(input: {
  target: string;
  script: string;
  allowFailure?: boolean;
}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const result = await runCommand("ssh", buildSshCommandArgs(input));
  if (result.exitCode !== 0 && !input.allowFailure) {
    throw new RemoteBubbleStartError({
      code: "REMOTE_START_TRANSPORT_FAILED",
      message: describeTransportFailure({
        command: "ssh",
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }),
      context: {
        transport_command: "ssh",
        exit_code: result.exitCode,
        target: input.target
      }
    });
  }
  return result;
}

async function resolveRemoteHomeDirectory(target: string): Promise<string> {
  const result = await runSshCommand({
    target,
    script: buildReadRemoteHomeDirectoryScript()
  });
  const remoteHomeDirectory =
    extractRemoteHomeDirectoryPayload(result.stdout).trim();
  if (!remoteHomeDirectory.startsWith("/")) {
    throw new RemoteBubbleStartError({
      code: "REMOTE_HOME_DIRECTORY_INVALID",
      message:
        `ssh remote home resolution returned invalid absolute path: ${remoteHomeDirectory || "<empty>"}`,
      context: {
        target,
        remote_home_directory: remoteHomeDirectory || null
      }
    });
  }
  return remoteHomeDirectory;
}

function normalizeControlFilesForRemoteClonePath(input: {
  bubbleId: string;
  remoteClonePath: string;
  controlFiles: ExecuteRemoteBubbleStartInput["controlFiles"];
}): ExecuteRemoteBubbleStartInput["controlFiles"] {
  const bubbleTomlRelativePath = `.pairflow/bubbles/${input.bubbleId}/bubble.toml`;
  return input.controlFiles.map((file) => {
    if (file.relativePath !== bubbleTomlRelativePath) {
      return file;
    }
    return {
      ...file,
      content: rewriteRemoteBubbleTomlRepoPath({
        bubbleTomlContent: file.content,
        remoteClonePath: input.remoteClonePath
      })
    };
  });
}

async function uploadControlFiles(input: {
  target: string;
  remoteClonePath: string;
  controlFiles: ExecuteRemoteBubbleStartInput["controlFiles"];
}): Promise<void> {
  const tempRoot = await mkdtemp(join(tmpdir(), "pairflow-remote-start-upload-"));
  try {
    for (const file of input.controlFiles) {
      const localPath = join(tempRoot, file.relativePath);
      await mkdir(dirname(localPath), { recursive: true });
      await writeFile(localPath, file.content, "utf8");
    }

    const result = await runCommand(
      "scp",
      buildScpCommandArgs({
        sourcePath: `${tempRoot}/.`,
        destination: buildScpUploadDestination({
          target: input.target,
          remoteClonePath: input.remoteClonePath
        })
      })
    );
    if (result.exitCode !== 0) {
      throw new RemoteBubbleStartError({
        code: "REMOTE_START_TRANSPORT_FAILED",
        message: describeTransportFailure({
          command: "scp",
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr
        }),
        context: {
          transport_command: "scp",
          exit_code: result.exitCode,
          target: input.target,
          remote_clone_path: input.remoteClonePath
        }
      });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function cloneRemoteRepository(input: {
  target: string;
  originUrl: string;
  remoteClonePath: string;
  bubbleBranch: string;
  baseBranch: string;
}): Promise<void> {
  await runSshCommand({
    target: input.target,
    script: buildCloneRemoteRepositoryScript(input)
  });
}

async function runPairflowSyncHook(input: {
  target: string;
  syncCommand: string;
}): Promise<string | undefined> {
  const result = await runSshCommand({
    target: input.target,
    script: input.syncCommand,
    allowFailure: true
  });
  if (result.exitCode === 0) {
    return undefined;
  }

  const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.exitCode}`;
  return `Pairflow warning: remote sync hook failed but start will continue: ${detail}`;
}

async function runRemoteInnerStart(input: {
  target: string;
  pairflowCommand: string;
  bubbleId: string;
  remoteClonePath: string;
}): Promise<void> {
  await runSshCommand({
    target: input.target,
    script: buildRemoteInnerStartScript(input)
  });
}

async function readRemoteStateSnapshot(input: {
  target: string;
  statePath: string;
}): Promise<Record<string, unknown>> {
  const result = await runSshCommand({
    target: input.target,
    script: buildReadRemoteStateSnapshotScript(input.statePath)
  });
  try {
    return JSON.parse(extractRemoteStateSnapshotPayload(result.stdout)) as Record<string, unknown>;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteBubbleStartError({
      code: "REMOTE_STATE_SNAPSHOT_INVALID",
      message:
        "Remote start confirmation returned invalid JSON payload inside the marker envelope: "
        + `${reason}.`,
      context: {
        target: input.target,
        state_path: input.statePath
      },
      cause: error
    });
  }
}

async function collectRemoteStartWarnings(input: {
  target: string;
  pairflowSyncCommand: string | undefined;
}): Promise<string[]> {
  if (input.pairflowSyncCommand === undefined) {
    return [];
  }

  const warning = await runPairflowSyncHook({
    target: input.target,
    syncCommand: input.pairflowSyncCommand
  });
  return warning === undefined ? [] : [warning];
}

async function resolveEffectiveRemoteClonePath(input: {
  target: string;
  remoteClonePath: string;
}): Promise<string> {
  if (!isHomeRelativeRemotePath(input.remoteClonePath)) {
    return input.remoteClonePath;
  }

  return resolveHomeRelativeRemotePath({
    path: input.remoteClonePath,
    remoteHomeDirectory: await resolveRemoteHomeDirectory(input.target)
  });
}

export async function executeRemoteBubbleStart(
  input: ExecuteRemoteBubbleStartInput
): Promise<ExecuteRemoteBubbleStartResult> {
  const target = buildSshTarget({
    host: input.remoteTarget.host,
    ...(input.remoteTarget.user !== undefined ? { user: input.remoteTarget.user } : {})
  });
  const warnings = await collectRemoteStartWarnings({
    target,
    pairflowSyncCommand: input.remoteTarget.pairflowSyncCommand
  });
  const remoteClonePath = await resolveEffectiveRemoteClonePath({
    target,
    remoteClonePath: input.remoteClonePath
  });

  await cloneRemoteRepository({
    target,
    originUrl: input.originUrl,
    remoteClonePath,
    bubbleBranch: input.bubbleConfig.bubble_branch,
    baseBranch: input.bubbleConfig.base_branch
  });
  await uploadControlFiles({
    target,
    remoteClonePath,
    controlFiles: normalizeControlFilesForRemoteClonePath({
      bubbleId: input.bubbleId,
      remoteClonePath,
      controlFiles: input.controlFiles
    })
  });
  await runRemoteInnerStart({
    target,
    pairflowCommand: input.remoteTarget.pairflowCommand,
    bubbleId: input.bubbleId,
    remoteClonePath
  });

  const remoteStateSnapshot = await readRemoteStateSnapshot({
    target,
    statePath: join(
      remoteClonePath,
      ".pairflow",
      "bubbles",
      input.bubbleId,
      "state.json"
    )
  });
  const nowIso = new Date().toISOString();

  return {
    remoteClonePath,
    tmuxSessionName: buildBubbleTmuxSessionName(input.bubbleId),
    startedAt: nowIso,
    instanceId: buildRemoteInstanceId(nowIso),
    remoteState: normalizeRemoteStateSnapshotForCache({
      bubbleId: input.bubbleId,
      snapshot: remoteStateSnapshot,
      fallbackMaxRounds: input.bubbleConfig.max_rounds,
      checkedAt: nowIso
    }),
    ...(warnings.length > 0 ? { warnings } : {})
  };
}
