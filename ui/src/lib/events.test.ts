import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRealtimeEventsClient, type EventSourceLike } from "./events";
import { bubbleSummary } from "../test/fixtures";

class MockEventSource implements EventSourceLike {
  public static instances: MockEventSource[] = [];

  public readonly url: string;
  private readonly listeners = new Map<
    string,
    Array<(event: MessageEvent<string>) => void>
  >();

  public constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  public addEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void
  ): void {
    const queue = this.listeners.get(type) ?? [];
    queue.push(listener);
    this.listeners.set(type, queue);
  }

  public removeEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void
  ): void {
    const queue = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      queue.filter((entry) => entry !== listener)
    );
  }

  public close(): void {
    return;
  }

  public emit(type: string, data: unknown = ""): void {
    const queue = this.listeners.get(type) ?? [];
    const event = {
      data: typeof data === "string" ? data : JSON.stringify(data)
    } as MessageEvent<string>;
    for (const listener of queue) {
      listener(event);
    }
  }
}

describe("createRealtimeEventsClient", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.useFakeTimers();
  });

  it("streams SSE events and falls back to polling on error", async () => {
    const onEvent = vi.fn();
    const onStatus = vi.fn();
    const poll = vi.fn().mockResolvedValue(undefined);

    const client = createRealtimeEventsClient({
      getRepos: () => ["/repo-a"],
      onEvent,
      onStatus,
      poll,
      pollingIntervalMs: 3_000,
      eventSourceFactory: (url) => new MockEventSource(url)
    });

    client.start();

    expect(onStatus).toHaveBeenCalledWith("connecting");
    expect(MockEventSource.instances[0]?.url).toBe("/api/events?repo=%2Frepo-a");

    const stream = MockEventSource.instances[0];
    if (stream === undefined) {
      throw new Error("Missing mocked event source instance");
    }

    stream.emit("open");
    expect(onStatus).toHaveBeenCalledWith("connected");

    stream.emit("bubble.updated", {
      id: 1,
      ts: "2026-02-24T12:00:00.000Z",
      type: "bubble.updated",
      repoPath: "/repo-a",
      bubbleId: "b-1",
      bubble: bubbleSummary({ bubbleId: "b-1", repoPath: "/repo-a" })
    });
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "bubble.updated",
        bubbleId: "b-1"
      })
    );

    stream.emit("error");
    expect(onStatus).toHaveBeenCalledWith("fallback");
    expect(poll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(poll).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(MockEventSource.instances.length).toBe(2);
  });

  it("ignores malformed event payloads", () => {
    const onEvent = vi.fn();
    const onStatus = vi.fn();

    const client = createRealtimeEventsClient({
      getRepos: () => ["/repo-a"],
      onEvent,
      onStatus,
      poll: async () => undefined,
      eventSourceFactory: (url) => new MockEventSource(url)
    });

    client.start();

    const stream = MockEventSource.instances[0];
    if (stream === undefined) {
      throw new Error("Missing mocked event source instance");
    }

    stream.emit("open");
    stream.emit("bubble.updated", { id: 1, ts: "2026-02-24T12:00:00.000Z" });
    stream.emit("snapshot", { id: 2, ts: "2026-02-24T12:00:01.000Z", type: "snapshot" });
    stream.emit("repo.updated", "{this-is-not-json");

    expect(onEvent).not.toHaveBeenCalled();
  });

  it("reports polling fallback failures", async () => {
    const onStatus = vi.fn();
    const onPollingError = vi.fn();
    const poll = vi.fn().mockRejectedValue(new Error("down"));

    const client = createRealtimeEventsClient({
      getRepos: () => ["/repo-a"],
      onEvent: () => undefined,
      onStatus,
      onPollingError,
      poll,
      pollingIntervalMs: 3_000,
      eventSourceFactory: (url) => new MockEventSource(url)
    });

    client.start();
    const stream = MockEventSource.instances[0];
    if (stream === undefined) {
      throw new Error("Missing mocked event source instance");
    }
    stream.emit("open");
    stream.emit("error");

    await Promise.resolve();

    expect(onPollingError).toHaveBeenCalledWith(expect.any(Error));
    expect(onStatus).toHaveBeenCalledWith("connecting");
  });
});
