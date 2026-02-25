import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { getBubblePaths } from "../../../src/core/bubble/paths.js";
import { normalizeRepoPath } from "../../../src/core/bubble/repoResolution.js";
import { emitHumanReply } from "../../../src/core/human/reply.js";
import { startUiServer, type UiServerHandle } from "../../../src/core/ui/server.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

interface ParsedSseEvent {
  id: number | null;
  event: string;
  data: unknown;
}

function isWaitingHumanBubbleUpdatedEventData(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const bubble = (value as { bubble?: unknown }).bubble;
  if (typeof bubble !== "object" || bubble === null || Array.isArray(bubble)) {
    return false;
  }
  return (bubble as { state?: unknown }).state === "WAITING_HUMAN";
}

function isRunningBubbleUpdatedEventData(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const bubble = (value as { bubble?: unknown }).bubble;
  if (typeof bubble !== "object" || bubble === null || Array.isArray(bubble)) {
    return false;
  }
  return (bubble as { state?: unknown }).state === "RUNNING";
}

class SseClient {
  private readonly controller: AbortController;
  private readonly queue: ParsedSseEvent[] = [];
  private readonly pending: Array<(event: ParsedSseEvent) => void> = [];
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly pumpPromise: Promise<void>;
  private buffer = "";

  private constructor(
    controller: AbortController,
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) {
    this.controller = controller;
    this.reader = reader;
    this.pumpPromise = this.pump();
  }

  public static async connect(input: {
    url: string;
    headers?: Record<string, string> | undefined;
  }): Promise<SseClient> {
    const controller = new AbortController();
    const requestInit: RequestInit = {
      signal: controller.signal,
      ...(input.headers !== undefined ? { headers: input.headers } : {})
    };
    const response = await fetch(input.url, {
      ...requestInit
    });
    if (response.status !== 200 || response.body === null) {
      throw new Error(`Failed to connect SSE endpoint: status=${response.status}`);
    }
    return new SseClient(controller, response.body.getReader());
  }

  public async nextEvent(timeoutMs: number = 5_000): Promise<ParsedSseEvent> {
    const queued = this.queue.shift();
    if (queued !== undefined) {
      return queued;
    }

    return new Promise<ParsedSseEvent>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pending.indexOf(handleEvent);
        if (index >= 0) {
          this.pending.splice(index, 1);
        }
        reject(new Error(`Timed out waiting for SSE event after ${timeoutMs}ms`));
      }, timeoutMs);

      const handleEvent = (event: ParsedSseEvent): void => {
        clearTimeout(timeout);
        resolve(event);
      };

      this.pending.push(handleEvent);
    });
  }

  public async close(): Promise<void> {
    this.controller.abort();
    await this.pumpPromise.catch(() => undefined);
  }

  private pushEvent(event: ParsedSseEvent): void {
    const waiter = this.pending.shift();
    if (waiter !== undefined) {
      waiter(event);
      return;
    }
    this.queue.push(event);
  }

  private parseChunk(chunk: string): void {
    this.buffer += chunk;
    while (true) {
      const separatorIndex = this.buffer.indexOf("\n\n");
      if (separatorIndex < 0) {
        break;
      }

      const frame = this.buffer.slice(0, separatorIndex);
      this.buffer = this.buffer.slice(separatorIndex + 2);

      const trimmed = frame.replace(/\r/gu, "").trim();
      if (trimmed.length === 0 || trimmed.startsWith(":")) {
        continue;
      }

      const lines = trimmed.split("\n");
      let eventName = "message";
      let id: number | null = null;
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice("event:".length).trim();
          continue;
        }
        if (line.startsWith("id:")) {
          const numeric = Number(line.slice("id:".length).trim());
          id = Number.isFinite(numeric) ? numeric : null;
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice("data:".length).trim());
        }
      }

      const rawData = dataLines.join("\n");
      const parsed =
        rawData.length === 0 ? null : (JSON.parse(rawData) as unknown);
      this.pushEvent({
        id,
        event: eventName,
        data: parsed
      });
    }
  }

  private async pump(): Promise<void> {
    const decoder = new TextDecoder();
    while (true) {
      const next = await this.reader.read().catch(() => ({
        done: true,
        value: undefined
      }));
      if (next.done) {
        break;
      }
      if (next.value !== undefined) {
        this.parseChunk(decoder.decode(next.value, { stream: true }));
      }
    }
    const flushed = decoder.decode();
    if (flushed.length > 0) {
      this.parseChunk(flushed);
    }
  }
}

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function createRepoFixture(): Promise<{
  repoPath: string;
  bubbleId: string;
  worktreePath: string;
}> {
  const repoPath = await createTempDir("pairflow-ui-events-repo-");
  await initGitRepository(repoPath);

  const bubble = await setupRunningBubbleFixture({
    bubbleId: "b_ui_events_01",
    repoPath,
    task: "Event stream task"
  });

  await emitAskHumanFromWorkspace({
    question: "Please confirm",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-02-24T12:00:00.000Z")
  });

  const paths = getBubblePaths(repoPath, bubble.bubbleId);
  await upsertRuntimeSession({
    sessionsPath: paths.sessionsPath,
    bubbleId: bubble.bubbleId,
    repoPath,
    worktreePath: paths.worktreePath,
    tmuxSessionName: `pf-${bubble.bubbleId}`,
    now: new Date("2026-02-24T12:00:30.000Z")
  });

  return {
    repoPath,
    bubbleId: bubble.bubbleId,
    worktreePath: bubble.paths.worktreePath
  };
}

async function createAssetsFixture(): Promise<string> {
  const assetsDir = await createTempDir("pairflow-ui-events-assets-");
  await writeFile(
    join(assetsDir, "index.html"),
    "<!doctype html><html><body>events</body></html>\n",
    "utf8"
  );
  return assetsDir;
}

async function startServer(input: {
  repoPath: string;
  assetsDir: string;
  keepAliveIntervalMs?: number | undefined;
  pollIntervalMs?: number | undefined;
  debounceMs?: number | undefined;
}): Promise<UiServerHandle> {
  return startUiServer({
    repoPaths: [input.repoPath],
    assetsDir: input.assetsDir,
    host: "127.0.0.1",
    port: 0,
    pollIntervalMs: input.pollIntervalMs ?? 40,
    debounceMs: input.debounceMs ?? 10,
    ...(input.keepAliveIntervalMs !== undefined
      ? { keepAliveIntervalMs: input.keepAliveIntervalMs }
      : {})
  });
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("UI SSE events", () => {
  it("streams bubble updates for state/inbox/transcript changes", async () => {
    const fixture = await createRepoFixture();
    const assetsDir = await createAssetsFixture();
    const normalizedRepoPath = await normalizeRepoPath(fixture.repoPath);
    const server = await startServer({
      repoPath: fixture.repoPath,
      assetsDir
    });

    const client = await SseClient.connect({
      url: `${server.url}/api/events?repo=${encodeURIComponent(fixture.repoPath)}`
    });

    try {
      const connected = await client.nextEvent();
      expect(connected.event).toBe("connected");

      const snapshot = await client.nextEvent();
      expect(snapshot.event).toBe("snapshot");

      await emitHumanReply({
        bubbleId: fixture.bubbleId,
        message: "Continue",
        repoPath: fixture.repoPath,
        now: new Date("2026-02-24T12:01:00.000Z")
      });

      let updated: ParsedSseEvent | null = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const next = await client.nextEvent(3_000);
        if (next.event === "bubble.updated" && isRunningBubbleUpdatedEventData(next.data)) {
          updated = next;
          break;
        }
      }

      expect(updated).not.toBeNull();
      expect(updated?.data).toMatchObject({
        bubbleId: fixture.bubbleId,
        repoPath: normalizedRepoPath,
        bubble: {
          state: "RUNNING"
        }
      });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("replays missed events on reconnect via Last-Event-ID", async () => {
    const fixture = await createRepoFixture();
    const assetsDir = await createAssetsFixture();
    const normalizedRepoPath = await normalizeRepoPath(fixture.repoPath);
    const server = await startServer({
      repoPath: fixture.repoPath,
      assetsDir
    });

    const firstClient = await SseClient.connect({
      url: `${server.url}/api/events?repo=${encodeURIComponent(fixture.repoPath)}`
    });

    let lastDeliveredId = 0;
    try {
      await firstClient.nextEvent();
      await firstClient.nextEvent();

      await emitHumanReply({
        bubbleId: fixture.bubbleId,
        message: "Continue",
        repoPath: fixture.repoPath,
        now: new Date("2026-02-24T12:02:00.000Z")
      });

      let firstUpdate: ParsedSseEvent | null = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const next = await firstClient.nextEvent(3_000);
        if (next.event === "bubble.updated") {
          firstUpdate = next;
          break;
        }
      }
      expect(firstUpdate).not.toBeNull();
      expect(firstUpdate?.id).not.toBeNull();
      lastDeliveredId = firstUpdate?.id ?? 0;
    } finally {
      await firstClient.close();
    }

    await emitAskHumanFromWorkspace({
      question: "Need another answer",
      cwd: fixture.worktreePath,
      now: new Date("2026-02-24T12:03:00.000Z")
    });

    const reconnectClient = await SseClient.connect({
      url: `${server.url}/api/events?repo=${encodeURIComponent(fixture.repoPath)}`,
      headers: {
        "Last-Event-ID": String(lastDeliveredId)
      }
    });

    try {
      await reconnectClient.nextEvent();
      await reconnectClient.nextEvent();

      let replayed: ParsedSseEvent | null = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const next = await reconnectClient.nextEvent(3_000);
        if (
          next.event === "bubble.updated" &&
          next.id !== null &&
          next.id > lastDeliveredId &&
          isWaitingHumanBubbleUpdatedEventData(next.data)
        ) {
          replayed = next;
          break;
        }
      }

      expect(replayed).not.toBeNull();
      expect(replayed?.data).toMatchObject({
        bubbleId: fixture.bubbleId,
        repoPath: normalizedRepoPath,
        bubble: {
          state: "WAITING_HUMAN"
        }
      });
    } finally {
      await reconnectClient.close();
      await server.close();
    }
  });

  it("keeps server healthy after SSE disconnects during keepalive writes", async () => {
    const fixture = await createRepoFixture();
    const assetsDir = await createAssetsFixture();
    const server = await startServer({
      repoPath: fixture.repoPath,
      assetsDir,
      keepAliveIntervalMs: 25
    });

    const client = await SseClient.connect({
      url: `${server.url}/api/events?repo=${encodeURIComponent(fixture.repoPath)}`
    });

    try {
      await client.nextEvent();
      await client.nextEvent();
    } finally {
      await client.close();
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 120);
    });

    try {
      const response = await fetch(`${server.url}/api/repos`);
      const raw = await response.text();
      const payload =
        raw.length === 0 ? null : (JSON.parse(raw) as unknown);
      expect(response.status).toBe(200);
      expect(typeof payload).toBe("object");
      expect(payload).not.toBeNull();
      expect(Array.isArray((payload as { repos?: unknown }).repos)).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("emits bubble.removed immediately after successful API delete", async () => {
    const fixture = await createRepoFixture();
    const assetsDir = await createAssetsFixture();
    const server = await startServer({
      repoPath: fixture.repoPath,
      assetsDir,
      pollIntervalMs: 60_000,
      debounceMs: 60_000
    });

    const client = await SseClient.connect({
      url: `${server.url}/api/events?repo=${encodeURIComponent(fixture.repoPath)}`
    });

    try {
      await client.nextEvent();
      await client.nextEvent();

      const response = await fetch(
        `${server.url}/api/bubbles/${fixture.bubbleId}/delete?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            force: true
          })
        }
      );
      expect(response.status).toBe(200);

      let removed: ParsedSseEvent | null = null;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const next = await client.nextEvent(3_000);
        if (
          next.event === "bubble.removed" &&
          typeof next.data === "object" &&
          next.data !== null &&
          !Array.isArray(next.data) &&
          (next.data as { bubbleId?: unknown }).bubbleId === fixture.bubbleId
        ) {
          removed = next;
          break;
        }
      }

      expect(removed).not.toBeNull();
    } finally {
      await client.close();
      await server.close();
    }
  });
});
