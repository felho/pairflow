import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  UiServiceProcessInfo,
  UiServiceProcessStore,
  UiServiceSpawnInput,
  UiServiceSpawnResult,
  UiServiceState,
  UiServiceStateReadResult
} from "../../ports/uiServiceProcessStore.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface UiServiceLockMetadata {
  pid: number;
  createdAt: string;
}

const lockWaitTimeoutMs = 30000;
const invalidLockStaleAfterMs = 5000;

function parseState(raw: string): UiServiceState {
  const parsed: unknown = JSON.parse(raw);
  if (!isObject(parsed)) {
    throw new Error("state root must be an object");
  }
  const requiredStringFields = [
    "repoPath",
    "host",
    "url",
    "startedAt",
    "cwd",
    "executablePath",
    "processStartTime",
    "identityToken"
  ] as const;
  for (const field of requiredStringFields) {
    if (typeof parsed[field] !== "string" || parsed[field].length === 0) {
      throw new Error(`UI_SERVICE_STATE_INVALID: missing required string field context=${JSON.stringify({ field })}`);
    }
  }
  if (!Number.isInteger(parsed.pid) || Number(parsed.pid) <= 0) {
    throw new Error("UI_SERVICE_STATE_INVALID: missing required positive integer field context={\"field\":\"pid\"}");
  }
  if (!Number.isInteger(parsed.port) || Number(parsed.port) < 0) {
    throw new Error("UI_SERVICE_STATE_INVALID: missing required integer field context={\"field\":\"port\"}");
  }
  if (parsed.stateVersion !== 1) {
    throw new Error("UI_SERVICE_STATE_INVALID: unsupported stateVersion context={\"field\":\"stateVersion\"}");
  }
  if (
    !Array.isArray(parsed.command)
    || !parsed.command.every((part) => typeof part === "string")
  ) {
    throw new Error("UI_SERVICE_STATE_INVALID: missing required string array field context={\"field\":\"command\"}");
  }
  return parsed as unknown as UiServiceState;
}

function execFileCapture(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString("utf8"));
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed: ${Buffer.concat(stderr).toString("utf8").trim()}`
          )
        );
      }
    });
  });
}

async function inspectProcess(pid: number): Promise<UiServiceProcessInfo | null> {
  try {
    const output = await execFileCapture("ps", [
      "ww",
      "-p",
      String(pid),
      "-o",
      "lstart=",
      "-o",
      "command="
    ]);
    const trimmed = output.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const match = /^(?<start>\S+\s+\S+\s+\d+\s+\d+:\d+:\d+\s+\d{4})\s+(?<command>.*)$/u.exec(trimmed);
    if (
      match?.groups === undefined
      || match.groups.start === undefined
      || match.groups.command === undefined
    ) {
      return null;
    }
    return {
      pid,
      processStartTime: match.groups.start,
      command: match.groups.command
    };
  } catch {
    return null;
  }
}

async function waitForPort(host: string, port: number): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await isPortOpen(host, port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `UI_SERVICE_START_TIMEOUT: service did not begin listening context=${JSON.stringify({ host, port })}`
  );
}

async function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    socket.setTimeout(250);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function stopSpawnedChild(pid: number): Promise<void> {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (await inspectProcess(pid) === null) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // The process may have exited after the final inspection.
  }
}

function parseLockMetadata(raw: string): UiServiceLockMetadata | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isObject(parsed)
      || !Number.isInteger(parsed.pid)
      || Number(parsed.pid) <= 0
      || typeof parsed.createdAt !== "string"
      || Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      return null;
    }
    return {
      pid: Number(parsed.pid),
      createdAt: parsed.createdAt
    };
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    return nodeError.code !== "ESRCH";
  }
}

function processMatchesState(
  state: UiServiceState,
  processInfo: UiServiceProcessInfo
): boolean {
  const command = processInfo.command.trim().replace(/\s+/gu, " ");
  const expected = state.command.join(" ").trim().replace(/\s+/gu, " ");
  return (
    processInfo.processStartTime === state.processStartTime
    && (command === expected
      || command.includes(`--service-token ${state.identityToken}`))
  );
}

async function shouldRemoveStaleLock(lockPath: string): Promise<boolean> {
  try {
    const raw = await readFile(lockPath, "utf8");
    const metadata = parseLockMetadata(raw);
    if (metadata !== null) {
      return !isProcessAlive(metadata.pid);
    }
    const lockStat = await stat(lockPath);
    return Date.now() - lockStat.mtimeMs >= invalidLockStaleAfterMs;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    return nodeError.code === "ENOENT";
  }
}

async function isActiveLockPresent(lockPath: string): Promise<boolean> {
  try {
    const raw = await readFile(lockPath, "utf8");
    const metadata = parseLockMetadata(raw);
    if (metadata !== null) {
      return isProcessAlive(metadata.pid);
    }
    const lockStat = await stat(lockPath);
    return Date.now() - lockStat.mtimeMs < invalidLockStaleAfterMs;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return false;
    }
    return true;
  }
}

async function waitForFileUnlock(lockPath: string): Promise<boolean> {
  const deadline = Date.now() + lockWaitTimeoutMs;
  while (Date.now() < deadline) {
    if (!await isActiveLockPresent(lockPath)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

async function withFileLock<T>(
  lockPath: string,
  operation: () => Promise<T>
): Promise<T> {
  await mkdir(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + lockWaitTimeoutMs;
  let lockHandle: FileHandle | undefined;
  while (lockHandle === undefined) {
    try {
      lockHandle = await open(lockPath, "wx");
      try {
        await lockHandle.writeFile(`${JSON.stringify({
          pid: process.pid,
          createdAt: new Date().toISOString()
        })}\n`, "utf8");
      } catch (error) {
        await lockHandle.close();
        await rm(lockPath, { force: true });
        throw error;
      }
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== "EEXIST") {
        throw error;
      }
      if (await shouldRemoveStaleLock(lockPath)) {
        await rm(lockPath, { force: true });
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `UI_SERVICE_LOCK_TIMEOUT: timed out waiting for service state lock context=${JSON.stringify({ lockPath })}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  try {
    return await operation();
  } finally {
    await lockHandle.close();
    await rm(lockPath, { force: true });
  }
}

async function spawnService(input: UiServiceSpawnInput): Promise<UiServiceSpawnResult> {
  await mkdir(join(input.cwd, ".pairflow", "runtime"), { recursive: true });
  const logPath = join(input.cwd, ".pairflow", "runtime", "ui-service.log");
  const logHandle = await open(logPath, "a");
  const child = spawn(input.command[0] ?? "", input.command.slice(1), {
    cwd: input.cwd,
    detached: true,
    env: {
      ...process.env,
      ...input.env
    },
    stdio: ["ignore", logHandle.fd, logHandle.fd]
  });
  if (child.pid === undefined) {
    await logHandle.close();
    throw new Error("UI_SERVICE_SPAWN_FAILED: spawned process did not expose pid context={}");
  }
  child.unref();
  try {
    await waitForPort(input.host, input.port);
    const processInfo = await inspectProcess(child.pid);
    if (processInfo === null) {
      throw new Error(
        `UI_SERVICE_INSPECT_FAILED: spawned process could not be inspected context=${JSON.stringify({ pid: child.pid })}`
      );
    }
    return {
      pid: child.pid,
      processStartTime: processInfo.processStartTime
    };
  } catch (error) {
    await stopSpawnedChild(child.pid);
    throw error;
  } finally {
    await logHandle.close();
  }
}

async function stopProcess(pid: number, expectedState?: UiServiceState): Promise<void> {
  if (expectedState !== undefined) {
    const processInfo = await inspectProcess(pid);
    if (processInfo === null) {
      return;
    }
    if (!processMatchesState(expectedState, processInfo)) {
      throw new Error(
        `UI_SERVICE_STOP_IDENTITY_MISMATCH: refusing to signal mismatched service process context=${JSON.stringify({ pid })}`
      );
    }
  }
  process.kill(pid, "SIGTERM");
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await inspectProcess(pid) === null) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process.kill(pid, "SIGKILL");
  const killDeadline = Date.now() + 2000;
  while (Date.now() < killDeadline) {
    if (await inspectProcess(pid) === null) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `UI_SERVICE_STOP_TIMEOUT: timed out stopping service process context=${JSON.stringify({ pid })}`
  );
}

export function createNodeUiServiceProcessStore(): UiServiceProcessStore {
  return {
    resolveStatePath(repoPath: string): string {
      return join(repoPath, ".pairflow", "runtime", "ui-service.json");
    },

    withStateLock<T>(statePath: string, operation: () => Promise<T>): Promise<T> {
      return withFileLock(`${statePath}.lock`, operation);
    },

    waitForStateUnlock(statePath: string): Promise<boolean> {
      return waitForFileUnlock(`${statePath}.lock`);
    },

    async readState(statePath: string): Promise<UiServiceStateReadResult> {
      try {
        const raw = await readFile(statePath, "utf8");
        return {
          statePath,
          state: parseState(raw)
        };
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === "ENOENT") {
          return {
            statePath,
            state: null
          };
        }
        return {
          statePath,
          state: null,
          invalidReason: error instanceof Error ? error.message : String(error)
        };
      }
    },

    async writeState(statePath: string, state: UiServiceState): Promise<void> {
      await mkdir(dirname(statePath), { recursive: true });
      const tempPath = `${statePath}.${process.pid}.${Date.now()}.tmp`;
      try {
        await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
        await rename(tempPath, statePath);
      } catch (error) {
        await rm(tempPath, { force: true });
        throw error;
      }
    },

    async removeState(statePath: string): Promise<void> {
      await rm(statePath, { force: true });
    },

    inspectProcess,

    spawnService,

    stopProcess,

    isPortOpen
  };
}
