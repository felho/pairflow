import type { ConnectionStatus, UiEvent } from "./types";

export interface EventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  removeEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

export type EventSourceFactory = (url: string) => EventSourceLike;

export interface RealtimeEventsClient {
  start(): void;
  stop(): void;
  refresh(): void;
}

export interface RealtimeEventsClientInput {
  baseUrl?: string;
  getRepos: () => string[];
  onEvent: (event: UiEvent) => void;
  onStatus: (status: ConnectionStatus) => void;
  onPollingError?: (error: unknown) => void;
  poll: (repos: string[]) => Promise<void>;
  pollingIntervalMs?: number;
  maxReconnectMs?: number;
  eventSourceFactory?: EventSourceFactory;
}

const defaultPollingIntervalMs = 3_000;
const defaultMaxReconnectMs = 5_000;

function toEventsUrl(baseUrl: string, repos: string[]): string {
  const params = new URLSearchParams();
  for (const repo of repos) {
    params.append("repo", repo);
  }

  const root = baseUrl.replace(/\/$/u, "");
  const query = params.toString();
  return `${root}/api/events${query.length > 0 ? `?${query}` : ""}`;
}

function parseEventData(event: MessageEvent<string>): unknown {
  if (typeof event.data !== "string" || event.data.trim().length === 0) {
    return null;
  }
  try {
    return JSON.parse(event.data) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUiEventPayload(value: unknown): value is UiEvent {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.id !== "number" || typeof value.ts !== "string") {
    return false;
  }

  const type = value.type;
  if (typeof type !== "string") {
    return false;
  }

  switch (type) {
    case "snapshot":
      return Array.isArray(value.repos) && Array.isArray(value.bubbles);
    case "bubble.updated":
      return (
        typeof value.repoPath === "string" &&
        typeof value.bubbleId === "string" &&
        isRecord(value.bubble)
      );
    case "bubble.removed":
      return (
        typeof value.repoPath === "string" &&
        typeof value.bubbleId === "string"
      );
    case "repo.updated":
      return typeof value.repoPath === "string" && isRecord(value.repo);
    default:
      return false;
  }
}

export function createRealtimeEventsClient(
  input: RealtimeEventsClientInput
): RealtimeEventsClient {
  const pollingIntervalMs = input.pollingIntervalMs ?? defaultPollingIntervalMs;
  const maxReconnectMs = input.maxReconnectMs ?? defaultMaxReconnectMs;
  const createEventSource: EventSourceFactory =
    input.eventSourceFactory ?? ((url: string) => new EventSource(url));

  let closed = true;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let eventSource: EventSourceLike | null = null;
  const eventListeners: Array<{
    type: string;
    listener: (event: MessageEvent<string>) => void;
  }> = [];

  const clearReconnectTimer = (): void => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const clearPollingTimer = (): void => {
    if (pollingTimer !== null) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  };

  const detachEventSource = (): void => {
    if (eventSource === null) {
      return;
    }

    for (const entry of eventListeners) {
      eventSource.removeEventListener(entry.type, entry.listener);
    }
    eventListeners.splice(0);
    eventSource.close();
    eventSource = null;
  };

  const runPollingRefresh = (): void => {
    const repos = input.getRepos();
    void input.poll(repos).catch((error: unknown) => {
      input.onPollingError?.(error);
      input.onStatus("connecting");
    });
  };

  const ensurePollingFallback = (): void => {
    if (pollingTimer !== null) {
      return;
    }
    input.onStatus("fallback");
    runPollingRefresh();
    pollingTimer = setInterval(() => {
      runPollingRefresh();
    }, pollingIntervalMs);
  };

  const stopPollingFallback = (): void => {
    clearPollingTimer();
  };

  const scheduleReconnect = (): void => {
    if (closed) {
      return;
    }

    clearReconnectTimer();
    const delay = Math.min(1_000 * (2 ** reconnectAttempt), maxReconnectMs);
    reconnectAttempt += 1;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const addListener = (
    type: string,
    listener: (event: MessageEvent<string>) => void
  ): void => {
    if (eventSource === null) {
      return;
    }
    eventSource.addEventListener(type, listener);
    eventListeners.push({ type, listener });
  };

  const handleMessageEvent = (event: MessageEvent<string>): void => {
    const payload = parseEventData(event);
    if (!isUiEventPayload(payload)) {
      return;
    }
    input.onEvent(payload);
  };

  const connect = (): void => {
    if (closed) {
      return;
    }

    const repos = input.getRepos();
    detachEventSource();
    input.onStatus("connecting");

    const eventsUrl = toEventsUrl(input.baseUrl ?? "", repos);
    eventSource = createEventSource(eventsUrl);

    addListener("open", () => {
      reconnectAttempt = 0;
      stopPollingFallback();
      input.onStatus("connected");
    });
    addListener("snapshot", handleMessageEvent);
    addListener("bubble.updated", handleMessageEvent);
    addListener("bubble.removed", handleMessageEvent);
    addListener("repo.updated", handleMessageEvent);
    addListener("error", () => {
      detachEventSource();
      ensurePollingFallback();
      scheduleReconnect();
    });
  };

  return {
    start(): void {
      if (!closed) {
        return;
      }
      closed = false;
      reconnectAttempt = 0;
      connect();
    },

    stop(): void {
      closed = true;
      clearReconnectTimer();
      stopPollingFallback();
      detachEventSource();
      input.onStatus("idle");
    },

    refresh(): void {
      if (closed) {
        return;
      }
      connect();
    }
  };
}
