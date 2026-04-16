import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../../config/bubbleConfig.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import {
  remoteStartModeEnvVar,
  remoteStartModeInnerRemoteActivation,
  remoteStartWorkspaceRootEnvVar
} from "../../../shared/bubble/remoteStartExecutionContext.js";
import type {
  ExecuteRemoteBubbleStartInput,
  ExecuteRemoteBubbleStartResult
} from "../../../application/start/startCommandContract.js";
import {
  isBubbleLifecycleState,
  type BubbleRemoteStateCache
} from "../../../../types/bubble.js";
import { buildBubbleTmuxSessionName } from "../../../shared/bubble/tmuxSessionName.js";

const sshTransportOptions = [
  ["BatchMode", "yes"],
  ["StrictHostKeyChecking", "yes"],
  ["ConnectTimeout", "10"],
  ["ConnectionAttempts", "1"]
] as const;
const remoteHomeDirectoryStartMarker = "__PAIRFLOW_REMOTE_HOME_START__";
const remoteHomeDirectoryEndMarker = "__PAIRFLOW_REMOTE_HOME_END__";
const remoteStateSnapshotStartMarker = "__PAIRFLOW_REMOTE_STATE_JSON_START__";
const remoteStateSnapshotEndMarker = "__PAIRFLOW_REMOTE_STATE_JSON_END__";

export type RemoteBubbleStartErrorCode =
  | "REMOTE_CONFIRMATION_INVALID"
  | "REMOTE_STATE_SNAPSHOT_INVALID";

export class RemoteBubbleStartError extends Error {
  public readonly code: RemoteBubbleStartErrorCode;
  public readonly details:
    | {
        receivedState?: string | null;
        receivedRound?: number | null;
      }
    | undefined;

  public constructor(input: {
    code: RemoteBubbleStartErrorCode;
    message: string;
    details?: {
      receivedState?: string | null;
      receivedRound?: number | null;
    };
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "RemoteBubbleStartError";
    this.code = input.code;
    this.details = input.details;
  }
}

function buildSshTarget(input: {
  host: string;
  user?: string;
}): string {
  return input.user !== undefined ? `${input.user}@${input.host}` : input.host;
}

function buildRemoteInstanceId(nowIso: string): string {
  return `inst_${nowIso.replace(/[-:.]/gu, "")}`;
}

export function isHomeRelativeRemotePath(path: string): boolean {
  return path === "~" || path.startsWith("~/");
}

export function resolveHomeRelativeRemotePath(input: {
  path: string;
  remoteHomeDirectory: string;
}): string {
  if (!isHomeRelativeRemotePath(input.path)) {
    return input.path;
  }

  const normalizedHome = input.remoteHomeDirectory.replace(/\/+$/u, "");
  if (input.path === "~") {
    return normalizedHome;
  }

  return `${normalizedHome}/${input.path.slice(2)}`;
}

export function quoteRemoteShellPath(path: string): string {
  return shellQuote(path);
}

function buildSshTransportArgs(): string[] {
  return sshTransportOptions.flatMap(([key, value]) => ["-o", `${key}=${value}`]);
}

export function buildSshCommandArgs(input: {
  target: string;
  script: string;
}): string[] {
  return [
    ...buildSshTransportArgs(),
    input.target,
    "bash",
    "-lc",
    input.script
  ];
}

export function buildScpCommandArgs(input: {
  sourcePath: string;
  destination: string;
}): string[] {
  return [
    "-rq",
    ...buildSshTransportArgs(),
    input.sourcePath,
    input.destination
  ];
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function describeTransportFailure(input: {
  command: "ssh" | "scp";
  exitCode: number;
  stdout: string;
  stderr: string;
}): string {
  const detailSource = input.stderr.trim().length > 0 ? input.stderr : input.stdout;
  return `${input.command} transport failed (exit ${input.exitCode}): ${summarizeTransportOutput(detailSource)}`;
}

export function assertSingleTokenPairflowCommand(command: string): string {
  if (command.trim().length === 0 || /\s/gu.test(command)) {
    throw new Error(
      "Remote pairflow_command must be a single executable token without whitespace; use pairflow_sync_command for compound shell workflows."
    );
  }
  return command;
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
    throw new Error(
      describeTransportFailure({
        command: "ssh",
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      })
    );
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
    throw new Error(
      `ssh remote home resolution returned invalid absolute path: ${remoteHomeDirectory || "<empty>"}`
    );
  }
  return remoteHomeDirectory;
}

export function buildScpUploadDestination(input: {
  target: string;
  remoteClonePath: string;
}): string {
  const normalizedPath = `${input.remoteClonePath.replace(/\/+$/u, "")}/`;
  // `scp` receives this as a direct argv entry, not via shell interpolation.
  // Keep the remote spec unquoted here so spaces/quotes remain literal path bytes.
  return `${input.target}:${normalizedPath}`;
}

export function rewriteRemoteBubbleTomlRepoPath(input: {
  bubbleTomlContent: string;
  remoteClonePath: string;
}): string {
  const parsed = parseBubbleConfigToml(input.bubbleTomlContent);
  return `${renderBubbleConfigToml({
    ...parsed,
    repo_path: input.remoteClonePath
  })}\n`;
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
      throw new Error(
        describeTransportFailure({
          command: "scp",
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr
        })
      );
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function buildCloneRemoteRepositoryScript(input: {
  originUrl: string;
  remoteClonePath: string;
  bubbleBranch: string;
  baseBranch: string;
}): string {
  const remoteParent = dirname(input.remoteClonePath);
  const quotedBubbleBranch = shellQuote(input.bubbleBranch);
  const quotedBaseBranch = shellQuote(input.baseBranch);
  const quotedOriginBaseRef = shellQuote(`origin/${input.baseBranch}`);
  return [
    "set -euo pipefail",
    `mkdir -p ${quoteRemoteShellPath(remoteParent)}`,
    `if [ -e ${quoteRemoteShellPath(input.remoteClonePath)} ]; then`,
    `  printf '%s\\n' ${shellQuote(`Remote clone path already exists: ${input.remoteClonePath}`)}`,
    "  exit 32",
    "fi",
    `git clone ${shellQuote(input.originUrl)} ${quoteRemoteShellPath(input.remoteClonePath)}`,
    `cd ${quoteRemoteShellPath(input.remoteClonePath)}`,
    `git checkout -B ${quotedBubbleBranch} ${quotedOriginBaseRef} || git checkout -B ${quotedBubbleBranch} ${quotedBaseBranch}`
  ].join("\n");
}

async function cloneRemoteRepository(input: {
  target: string;
  originUrl: string;
  remoteClonePath: string;
  bubbleBranch: string;
  baseBranch: string;
}): Promise<void> {
  const script = buildCloneRemoteRepositoryScript(input);
  await runSshCommand({
    target: input.target,
    script
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

export function buildRemoteInnerStartScript(input: {
  pairflowCommand: string;
  bubbleId: string;
  remoteClonePath: string;
}): string {
  const quotedRemoteClonePath = quoteRemoteShellPath(input.remoteClonePath);
  const pairflowCommand = assertSingleTokenPairflowCommand(input.pairflowCommand);
  return [
    "set -euo pipefail",
    `cd ${quotedRemoteClonePath}`,
    `export PAIRFLOW_WORKTREE_ROOT=${quotedRemoteClonePath}`,
    `export ${remoteStartModeEnvVar}=${shellQuote(remoteStartModeInnerRemoteActivation)}`,
    `export ${remoteStartWorkspaceRootEnvVar}=${quotedRemoteClonePath}`,
    `${shellQuote(pairflowCommand)} bubble start --id ${shellQuote(input.bubbleId)} --repo ${quotedRemoteClonePath}`
  ].join("\n");
}

async function runRemoteInnerStart(input: {
  target: string;
  pairflowCommand: string;
  bubbleId: string;
  remoteClonePath: string;
}): Promise<void> {
  const script = buildRemoteInnerStartScript(input);
  await runSshCommand({
    target: input.target,
    script
  });
}

async function readRemoteStateSnapshot(input: {
  target: string;
  statePath: string;
}): Promise<Record<string, unknown>> {
  const script = buildReadRemoteStateSnapshotScript(input.statePath);
  const result = await runSshCommand({
    target: input.target,
    script
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
      cause: error
    });
  }
}

export function buildReadRemoteHomeDirectoryScript(): string {
  return [
    "set -euo pipefail",
    `printf '%s\\n' ${shellQuote(remoteHomeDirectoryStartMarker)}`,
    "printf '%s\\n' \"$HOME\"",
    `printf '%s\\n' ${shellQuote(remoteHomeDirectoryEndMarker)}`
  ].join("\n");
}

export function buildReadRemoteStateSnapshotScript(statePath: string): string {
  return [
    "set -euo pipefail",
    `printf '%s\\n' ${shellQuote(remoteStateSnapshotStartMarker)}`,
    `cat ${quoteRemoteShellPath(statePath)}`,
    `printf '\\n%s\\n' ${shellQuote(remoteStateSnapshotEndMarker)}`
  ].join("\n");
}

function extractMarkerEnvelopePayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  payloadLabel: string;
}): string {
  const markerPattern = new RegExp(
    `${input.startMarker}\\r?\\n([\\s\\S]*?)\\r?\\n${input.endMarker}`,
    "gu"
  );
  const matches = [...input.stdout.matchAll(markerPattern)];
  if (matches.length !== 1) {
    throw new Error(
      `${input.payloadLabel} returned stdout without exactly one marker envelope.`
      + ` stdout_summary=${summarizeTransportOutput(input.stdout)}`
    );
  }
  return matches[0]?.[1] ?? "";
}

export function extractRemoteHomeDirectoryPayload(stdout: string): string {
  return extractMarkerEnvelopePayload({
    stdout,
    startMarker: remoteHomeDirectoryStartMarker,
    endMarker: remoteHomeDirectoryEndMarker,
    payloadLabel: "Remote home directory resolution"
  });
}

export function extractRemoteStateSnapshotPayload(stdout: string): string {
  return extractMarkerEnvelopePayload({
    stdout,
    startMarker: remoteStateSnapshotStartMarker,
    endMarker: remoteStateSnapshotEndMarker,
    payloadLabel: "Remote start confirmation"
  });
}

export function normalizeRemoteStateSnapshotForCache(input: {
  bubbleId: string;
  snapshot: Record<string, unknown>;
  fallbackMaxRounds: number;
  checkedAt: string;
}): BubbleRemoteStateCache {
  const { snapshot } = input;
  if (!isBubbleLifecycleState(snapshot.state)) {
    throw new RemoteBubbleStartError({
      code: "REMOTE_STATE_SNAPSHOT_INVALID",
      message:
        `Remote start returned invalid state snapshot for bubble ${input.bubbleId}: missing valid lifecycle state.`
    });
  }
  if (snapshot.state !== "RUNNING") {
    throw new RemoteBubbleStartError({
      code: "REMOTE_CONFIRMATION_INVALID",
      message:
        `Remote start confirmation for bubble ${input.bubbleId} expected RUNNING but received ${snapshot.state}.`,
      details: {
        receivedState: snapshot.state,
        receivedRound:
          typeof snapshot.round === "number" && Number.isInteger(snapshot.round)
            ? snapshot.round
            : null
      }
    });
  }

  const round = snapshot.round;
  if (typeof round !== "number" || !Number.isInteger(round) || round < 0) {
    throw new RemoteBubbleStartError({
      code: "REMOTE_STATE_SNAPSHOT_INVALID",
      message:
        `Remote start returned invalid state snapshot for bubble ${input.bubbleId}: missing valid round.`
    });
  }

  const activeRole = snapshot.active_role;
  if (
    activeRole !== undefined
    && activeRole !== null
    && activeRole !== "implementer"
    && activeRole !== "reviewer"
  ) {
    throw new RemoteBubbleStartError({
      code: "REMOTE_STATE_SNAPSHOT_INVALID",
      message:
        `Remote start returned invalid state snapshot for bubble ${input.bubbleId}: invalid active role.`
    });
  }

  const rawMaxRounds = snapshot.max_rounds;
  const maxRounds =
    typeof rawMaxRounds === "number"
      && Number.isInteger(rawMaxRounds)
      && rawMaxRounds > 0
      ? rawMaxRounds
      : input.fallbackMaxRounds;

  return {
    lastCheckedAt: input.checkedAt,
    state: snapshot.state,
    round,
    maxRounds,
    implementerStatus: activeRole === "implementer" ? "running" : "idle",
    reviewerStatus: activeRole === "reviewer" ? "running" : "idle"
  };
}

export async function executeRemoteBubbleStart(
  input: ExecuteRemoteBubbleStartInput
): Promise<ExecuteRemoteBubbleStartResult> {
  const target = buildSshTarget({
    host: input.remoteTarget.host,
    ...(input.remoteTarget.user !== undefined ? { user: input.remoteTarget.user } : {})
  });

  const warnings: string[] = [];
  if (input.remoteTarget.pairflowSyncCommand !== undefined) {
    const warning = await runPairflowSyncHook({
      target,
      syncCommand: input.remoteTarget.pairflowSyncCommand
    });
    if (warning !== undefined) {
      warnings.push(warning);
    }
  }

  const remoteClonePath =
    isHomeRelativeRemotePath(input.remoteClonePath)
      ? resolveHomeRelativeRemotePath({
          path: input.remoteClonePath,
          remoteHomeDirectory: await resolveRemoteHomeDirectory(target)
        })
      : input.remoteClonePath;

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
