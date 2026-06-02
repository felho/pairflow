import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  runUiServiceLifecycleCommand,
  type UiServiceCommandOptions
} from "../../../src/v11/application/uiService/uiServiceLifecycle.js";
import { createNodeUiServiceProcessStore } from "../../../src/v11/infrastructure/uiService/nodeUiServiceProcessStore.js";
import type {
  UiServiceProcessInfo,
  UiServiceProcessStore,
  UiServiceSpawnInput,
  UiServiceSpawnResult,
  UiServiceState,
  UiServiceStateReadResult
} from "../../../src/v11/ports/uiServiceProcessStore.js";

function buildOptions(
  overrides: Partial<UiServiceCommandOptions> = {}
): UiServiceCommandOptions {
  return {
    command: "status",
    repoPath: "/tmp/repo",
    repoFilters: [],
    host: "127.0.0.1",
    port: 4173,
    cliEntrypoint: "/tmp/repo/dist/cli/index.js",
    now: new Date("2026-06-02T10:00:00.000Z"),
    ...overrides
  };
}

function buildState(overrides: Partial<UiServiceState> = {}): UiServiceState {
  return {
    pid: 1234,
    repoPath: "/tmp/repo",
    host: "127.0.0.1",
    port: 4173,
    url: "http://127.0.0.1:4173",
    startedAt: "2026-06-02T09:00:00.000Z",
    command: [
      "/usr/local/bin/node",
      "/tmp/repo/dist/cli/index.js",
      "ui",
      "--service-token",
      "pairflow-ui-token"
    ],
    cwd: "/tmp/repo",
    executablePath: "/usr/local/bin/node",
    processStartTime: "Tue Jun  2 09:00:00 2026",
    identityToken: "pairflow-ui-token",
    stateVersion: 1,
    ...overrides
  };
}

function createStore(input: {
  state?: UiServiceState | null | undefined;
  invalidReason?: string | undefined;
  processInfo?: UiServiceProcessInfo | null | undefined;
  portOpen?: boolean | undefined;
  spawned?: UiServiceSpawnResult | undefined;
  spawnError?: Error | undefined;
  writeError?: Error | undefined;
  stopError?: Error | undefined;
  processInfoAfterStopError?: UiServiceProcessInfo | null | undefined;
  stateAfterWait?: UiServiceState | null | undefined;
  processInfoAfterWait?: UiServiceProcessInfo | null | undefined;
  waitForStateUnlockResult?: boolean | undefined;
} = {}): UiServiceProcessStore & {
  written: UiServiceState[];
  removed: string[];
  spawnCalls: UiServiceSpawnInput[];
  lockCalls: string[];
  waitCalls: string[];
  stopProcessMock: ReturnType<typeof vi.fn>;
} {
  let currentState = input.state ?? null;
  let currentProcessInfo = input.processInfo ?? null;
  const stopProcessMock = vi.fn(async () => {
    if (input.stopError !== undefined) {
      if (Object.hasOwn(input, "processInfoAfterStopError")) {
        currentProcessInfo = input.processInfoAfterStopError ?? null;
      }
      throw input.stopError;
    }
  });
  const store = {
    written: [] as UiServiceState[],
    removed: [] as string[],
    spawnCalls: [] as UiServiceSpawnInput[],
    lockCalls: [] as string[],
    waitCalls: [] as string[],
    stopProcessMock,
    resolveStatePath: vi.fn((repoPath: string) =>
      `${repoPath}/.pairflow/runtime/ui-service.json`
    ),
    async withStateLock<T>(
      statePath: string,
      operation: () => Promise<T>
    ): Promise<T> {
      store.lockCalls.push(statePath);
      return operation();
    },
    waitForStateUnlock: vi.fn(async (statePath: string) => {
      store.waitCalls.push(statePath);
      if (Object.hasOwn(input, "stateAfterWait")) {
        currentState = input.stateAfterWait ?? null;
      }
      if (Object.hasOwn(input, "processInfoAfterWait")) {
        currentProcessInfo = input.processInfoAfterWait ?? null;
      }
      return input.waitForStateUnlockResult ?? true;
    }),
    readState: vi.fn(async (statePath: string): Promise<UiServiceStateReadResult> => ({
      statePath,
      state: currentState,
      ...(input.invalidReason !== undefined
        ? { invalidReason: input.invalidReason }
        : {})
    })),
    writeState: vi.fn(async (_statePath: string, state: UiServiceState) => {
      if (input.writeError !== undefined) {
        throw input.writeError;
      }
      store.written.push(state);
      currentState = state;
    }),
    removeState: vi.fn(async (statePath: string) => {
      store.removed.push(statePath);
      currentState = null;
    }),
    inspectProcess: vi.fn(async () => currentProcessInfo),
    spawnService: vi.fn(async (spawnInput: UiServiceSpawnInput) => {
      store.spawnCalls.push(spawnInput);
      if (input.spawnError !== undefined) {
        throw input.spawnError;
      }
      return input.spawned ?? {
        pid: 5678,
        processStartTime: "Tue Jun  2 10:00:00 2026"
      };
    }),
    stopProcess: stopProcessMock,
    isPortOpen: vi.fn(async () => input.portOpen === true)
  };
  return store;
}

describe("runUiServiceLifecycleCommand", () => {
  it("starts a background service and writes versioned ownership state", async () => {
    const store = createStore();

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "start" }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.reasonCode).toBe("ui_service_started");
    expect(result.pid).toBe(5678);
    expect(store.spawnCalls).toHaveLength(1);
    expect(store.lockCalls).toEqual([
      "/tmp/repo/.pairflow/runtime/ui-service.json"
    ]);
    expect(store.written).toHaveLength(1);
    expect(store.written[0]?.stateVersion).toBe(1);
    expect(store.written[0]?.identityToken).toMatch(/^pairflow-ui-/u);
    expect(store.written[0]?.command).toContain("--service-token");
  });

  it("brackets IPv6 host literals in lifecycle URLs", async () => {
    const store = createStore();

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "start", host: "::1" }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.url).toBe("http://[::1]:4173");
    expect(store.written[0]?.url).toBe("http://[::1]:4173");
  });

  it("reports start failure without writing running state", async () => {
    const store = createStore({
      spawnError: new Error("listen timeout")
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "start" }),
      store
    );

    expect(result.status).toBe("stopped");
    expect(result.reasonCode).toBe("ui_service_start_failed");
    expect(result.exitCode).toBe(1);
    expect(store.spawnCalls).toHaveLength(1);
    expect(store.written).toHaveLength(0);
  });

  it("stops a freshly spawned process when ownership state cannot be written", async () => {
    const store = createStore({
      writeError: new Error("permission denied"),
      spawned: {
        pid: 6789,
        processStartTime: "Tue Jun  2 10:00:00 2026"
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "start" }),
      store
    );

    expect(result.status).toBe("stopped");
    expect(result.reasonCode).toBe("ui_service_start_failed");
    expect(store.stopProcessMock).toHaveBeenCalledWith(
      6789,
      expect.objectContaining({ pid: 6789 })
    );
  });

  it("refuses duplicate start when owned state verifies as running", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "start" }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.reasonCode).toBe("ui_service_already_running");
    expect(result.exitCode).toBe(1);
    expect(store.spawnCalls).toHaveLength(0);
  });

  it("accepts a truncated process command when the service token still matches", async () => {
    const state = buildState({
      command: [
        "/usr/local/bin/node",
        "/tmp/repo/dist/cli/index.js",
        "ui",
        "--host",
        "127.0.0.1",
        "--port",
        "4173",
        "--service-token",
        "pairflow-ui-token",
        "--repo",
        "/tmp/repo/with/a/very/long/path/that/may/be/truncated/by/ps"
      ]
    });
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: "/usr/local/bin/node /tmp/repo/dist/cli/index.js ui --host 127.0.0.1 --port 4173 --service-token pairflow-ui-token"
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "status" }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.reasonCode).toBe("ui_service_already_running");
  });

  it("reports stale state without signaling mismatched processes", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: "Tue Jun  2 08:00:00 2026",
        command: "unrelated"
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "stop" }),
      store
    );

    expect(result.status).toBe("stale");
    expect(result.reasonCode).toBe("ui_service_identity_mismatch");
    expect(result.exitCode).toBe(1);
    expect(store.stopProcessMock).not.toHaveBeenCalled();
  });

  it("clears stale state on stop when the recorded process is gone", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: null
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "stop" }),
      store
    );

    expect(result.status).toBe("stopped");
    expect(result.reasonCode).toBe("ui_service_stopped");
    expect(store.stopProcessMock).not.toHaveBeenCalled();
    expect(store.removed).toEqual(["/tmp/repo/.pairflow/runtime/ui-service.json"]);
  });

  it("does not clear stale state when stop targets a different endpoint", async () => {
    const state = buildState({
      port: 4173,
      url: "http://127.0.0.1:4173"
    });
    const store = createStore({
      state,
      processInfo: null
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "stop", port: 8080, endpointFilter: true }),
      store
    );

    expect(result.status).toBe("stopped");
    expect(result.reasonCode).toBe("ui_service_not_running");
    expect(result.url).toBe("http://127.0.0.1:8080");
    expect(store.removed).toHaveLength(0);
  });

  it("stops only a process with matching service identity", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "stop" }),
      store
    );

    expect(result.status).toBe("stopped");
    expect(result.reasonCode).toBe("ui_service_stopped");
    expect(store.stopProcessMock).toHaveBeenCalledWith(state.pid, state);
    expect(store.removed).toEqual(["/tmp/repo/.pairflow/runtime/ui-service.json"]);
  });

  it("does not stop a recorded service when stop targets a different endpoint", async () => {
    const state = buildState({
      port: 4173,
      url: "http://127.0.0.1:4173"
    });
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "stop", port: 8080, endpointFilter: true }),
      store
    );

    expect(result.status).toBe("stopped");
    expect(result.reasonCode).toBe("ui_service_not_running");
    expect(result.url).toBe("http://127.0.0.1:8080");
    expect(store.stopProcessMock).not.toHaveBeenCalled();
    expect(store.removed).toHaveLength(0);
  });

  it("returns structured stop_failed when verified process stop fails", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      },
      stopError: new Error("SIGTERM timeout")
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "stop" }),
      store
    );

    expect(result.status).toBe("stale");
    expect(result.reasonCode).toBe("ui_service_stop_failed");
    expect(result.exitCode).toBe(1);
    expect(result.pid).toBe(state.pid);
    expect(store.removed).toHaveLength(0);
  });

  it("clears owned state when the verified process exits before stop can signal it", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      },
      stopError: new Error("process not found"),
      processInfoAfterStopError: null
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "stop" }),
      store
    );

    expect(result.status).toBe("stopped");
    expect(result.reasonCode).toBe("ui_service_stopped");
    expect(result.exitCode).toBe(0);
    expect(store.removed).toEqual(["/tmp/repo/.pairflow/runtime/ui-service.json"]);
  });

  it("reports unmanaged port occupancy without claiming ownership", async () => {
    const store = createStore({ portOpen: true });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "status" }),
      store
    );

    expect(result.status).toBe("unmanaged");
    expect(result.reasonCode).toBe("ui_service_unmanaged_port");
    expect(result.exitCode).toBe(0);
    expect(store.stopProcessMock).not.toHaveBeenCalled();
    expect(store.lockCalls).toHaveLength(0);
    expect(store.waitCalls).toEqual([
      "/tmp/repo/.pairflow/runtime/ui-service.json"
    ]);
  });

  it("reports invalid status when an in-flight lifecycle lock does not clear", async () => {
    const store = createStore({ waitForStateUnlockResult: false });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "status" }),
      store
    );

    expect(result.status).toBe("invalid");
    expect(result.reasonCode).toBe("ui_service_invalid_state");
    expect(store.waitCalls).toEqual([
      "/tmp/repo/.pairflow/runtime/ui-service.json"
    ]);
  });

  it("waits for an in-flight lifecycle lock before reporting unmanaged status", async () => {
    const state = buildState();
    const store = createStore({
      portOpen: true,
      stateAfterWait: state,
      processInfoAfterWait: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "status" }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.reasonCode).toBe("ui_service_already_running");
    expect(store.waitCalls).toEqual([
      "/tmp/repo/.pairflow/runtime/ui-service.json"
    ]);
    expect(store.lockCalls).toHaveLength(0);
  });

  it("reports unmanaged port occupancy for stop when no owned state exists", async () => {
    const store = createStore({ portOpen: true });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "stop" }),
      store
    );

    expect(result.status).toBe("unmanaged");
    expect(result.reasonCode).toBe("ui_service_unmanaged_port");
    expect(result.exitCode).toBe(1);
    expect(store.stopProcessMock).not.toHaveBeenCalled();
  });

  it("fails closed for start when stale state points at a live mismatched process", async () => {
    const state = buildState();
    const store = createStore({
      state,
      portOpen: true,
      processInfo: {
        pid: state.pid,
        processStartTime: "Tue Jun  2 08:00:00 2026",
        command: "unrelated"
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "start" }),
      store
    );

    expect(result.status).toBe("stale");
    expect(result.reasonCode).toBe("ui_service_identity_mismatch");
    expect(result.exitCode).toBe(1);
    expect(store.removed).toHaveLength(0);
    expect(store.spawnCalls).toHaveLength(0);
  });

  it("does not report a running record for an explicitly different status endpoint", async () => {
    const state = buildState({
      port: 4173,
      url: "http://127.0.0.1:4173"
    });
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "status", port: 8080, endpointFilter: true }),
      store
    );

    expect(result.status).toBe("stopped");
    expect(result.reasonCode).toBe("ui_service_not_running");
    expect(result.url).toBe("http://127.0.0.1:8080");
  });

  it("reports a running record for a port-only status query on a non-default host", async () => {
    const state = buildState({
      host: "0.0.0.0",
      port: 8080,
      url: "http://0.0.0.0:8080"
    });
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({
        command: "status",
        port: 8080,
        endpointFilter: true,
        endpointPortFilter: true,
        endpointHostFilter: false
      }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.reasonCode).toBe("ui_service_already_running");
    expect(result.url).toBe("http://0.0.0.0:8080");
  });

  it("replaces proven stale state during restart", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: null,
      spawned: {
        pid: 9876,
        processStartTime: "Tue Jun  2 10:30:00 2026"
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "restart" }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.reasonCode).toBe("ui_service_started");
    expect(store.stopProcessMock).not.toHaveBeenCalled();
    expect(store.removed).toEqual(["/tmp/repo/.pairflow/runtime/ui-service.json"]);
    expect(store.written[0]?.pid).toBe(9876);
  });

  it("preserves the existing service endpoint when restart has no endpoint flags", async () => {
    const state = buildState({
      host: "0.0.0.0",
      port: 8080,
      url: "http://0.0.0.0:8080"
    });
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "restart" }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.url).toBe("http://0.0.0.0:8080");
    expect(store.spawnCalls[0]?.host).toBe("0.0.0.0");
    expect(store.spawnCalls[0]?.port).toBe(8080);
    expect(store.written[0]?.host).toBe("0.0.0.0");
    expect(store.written[0]?.port).toBe(8080);
  });

  it("does not stop or replace a recorded service when restart targets a different endpoint", async () => {
    const state = buildState({
      port: 4173,
      url: "http://127.0.0.1:4173"
    });
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "restart", port: 8080, endpointFilter: true }),
      store
    );

    expect(result.status).toBe("running");
    expect(result.reasonCode).toBe("ui_service_already_running");
    expect(result.exitCode).toBe(1);
    expect(result.url).toBe("http://127.0.0.1:4173");
    expect(store.stopProcessMock).not.toHaveBeenCalled();
    expect(store.spawnCalls).toHaveLength(0);
    expect(store.removed).toHaveLength(0);
  });

  it("fails closed for restart when stale state still points at a live mismatched process", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: "Tue Jun  2 08:00:00 2026",
        command: "unrelated"
      }
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "restart" }),
      store
    );

    expect(result.status).toBe("stale");
    expect(result.reasonCode).toBe("ui_service_identity_mismatch");
    expect(result.exitCode).toBe(1);
    expect(store.removed).toHaveLength(0);
    expect(store.spawnCalls).toHaveLength(0);
  });

  it("returns structured stop_failed when restart cannot stop the verified service", async () => {
    const state = buildState();
    const store = createStore({
      state,
      processInfo: {
        pid: state.pid,
        processStartTime: state.processStartTime,
        command: state.command.join(" ")
      },
      stopError: new Error("SIGTERM timeout")
    });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "restart" }),
      store
    );

    expect(result.status).toBe("stale");
    expect(result.reasonCode).toBe("ui_service_stop_failed");
    expect(store.spawnCalls).toHaveLength(0);
    expect(store.removed).toHaveLength(0);
  });

  it("fails closed for invalid state", async () => {
    const store = createStore({ invalidReason: "bad json" });

    const result = await runUiServiceLifecycleCommand(
      buildOptions({ command: "status" }),
      store
    );

    expect(result.status).toBe("invalid");
    expect(result.reasonCode).toBe("ui_service_invalid_state");
    expect(result.exitCode).toBe(1);
    expect(store.stopProcessMock).not.toHaveBeenCalled();
  });
});

describe("createNodeUiServiceProcessStore", () => {
  it("recovers a stale lock owned by a dead process", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "pairflow-ui-service-"));
    try {
      const store = createNodeUiServiceProcessStore();
      const statePath = join(tempRoot, "ui-service.json");
      const lockPath = `${statePath}.lock`;
      await writeFile(lockPath, `${JSON.stringify({
        pid: 2147483647,
        createdAt: new Date("2026-06-02T10:00:00.000Z").toISOString()
      })}\n`, "utf8");

      const result = await store.withStateLock(statePath, async () => {
        const metadata = JSON.parse(await readFile(lockPath, "utf8")) as {
          pid?: unknown;
        };
        expect(metadata.pid).toBe(process.pid);
        return "locked";
      });

      expect(result).toBe("locked");
      await expect(readFile(lockPath, "utf8")).rejects.toMatchObject({
        code: "ENOENT"
      });
    } finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
