import type {
  CommitActionInput,
  MergeActionInput,
  UiApiErrorBody,
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiTimelineEntry
} from "./types";

interface ReposResponse {
  repos: string[];
}

interface BubblesResponse {
  repo: UiRepoSummary;
  bubbles: UiBubbleSummary[];
}

interface BubbleDetailResponse {
  bubble: UiBubbleDetail;
}

interface BubbleTimelineResponse {
  bubbleId: string;
  repoPath: string;
  timeline: UiTimelineEntry[];
}

interface BubbleActionResponse {
  result: Record<string, unknown>;
}

export interface PairflowApiClient {
  getRepos(): Promise<string[]>;
  getBubbles(repoPath: string): Promise<BubblesResponse>;
  getBubble(repoPath: string, bubbleId: string): Promise<UiBubbleDetail>;
  getBubbleTimeline(repoPath: string, bubbleId: string): Promise<UiTimelineEntry[]>;
  startBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>>;
  approveBubble(
    repoPath: string,
    bubbleId: string,
    input?: { refs?: string[] }
  ): Promise<Record<string, unknown>>;
  requestRework(
    repoPath: string,
    bubbleId: string,
    input: { message: string; refs?: string[] }
  ): Promise<Record<string, unknown>>;
  replyBubble(
    repoPath: string,
    bubbleId: string,
    input: { message: string; refs?: string[] }
  ): Promise<Record<string, unknown>>;
  resumeBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>>;
  commitBubble(
    repoPath: string,
    bubbleId: string,
    input: CommitActionInput
  ): Promise<Record<string, unknown>>;
  mergeBubble(
    repoPath: string,
    bubbleId: string,
    input: MergeActionInput
  ): Promise<Record<string, unknown>>;
  openBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>>;
  attachBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>>;
  stopBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>>;
}

export class PairflowApiError extends Error {
  public readonly status: number;
  public readonly code: UiApiErrorBody["error"]["code"] | "unknown";
  public readonly details: Record<string, unknown> | undefined;

  public constructor(input: {
    message: string;
    status: number;
    code?: UiApiErrorBody["error"]["code"] | undefined;
    details?: Record<string, unknown> | undefined;
  }) {
    super(input.message);
    this.name = "PairflowApiError";
    this.status = input.status;
    this.code = input.code ?? "unknown";
    this.details = input.details;
  }
}

function toAbsoluteUrl(baseUrl: string, path: string): string {
  if (baseUrl.length === 0) {
    return path;
  }
  return `${baseUrl.replace(/\/$/u, "")}${path}`;
}

function parseJson(raw: string): unknown | undefined {
  if (raw.length === 0) {
    return {};
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function bubbleQuery(repoPath: string): string {
  return new URLSearchParams({ repo: repoPath }).toString();
}

function bubbleUrl(baseUrl: string, repoPath: string, bubbleId: string, action?: string): string {
  const encodedBubbleId = encodeURIComponent(bubbleId);
  const query = bubbleQuery(repoPath);
  const actionPath = action === undefined ? "" : `/${action}`;
  return toAbsoluteUrl(
    baseUrl,
    `/api/bubbles/${encodedBubbleId}${actionPath}?${query}`
  );
}

async function postBubbleAction(
  baseUrl: string,
  repoPath: string,
  bubbleId: string,
  action: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const payload = await requestJson<BubbleActionResponse>(
    bubbleUrl(baseUrl, repoPath, bubbleId, action),
    {
      method: "POST",
      ...(body === undefined
        ? {}
        : {
            body: JSON.stringify(body),
            headers: {
              "content-type": "application/json"
            }
          })
    }
  );
  return payload.result;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const raw = await response.text();
  const body = parseJson(raw);

  if (!response.ok) {
    const errorBody =
      body !== undefined ? (body as Partial<UiApiErrorBody>) : undefined;
    const payload = errorBody?.error;
    throw new PairflowApiError({
      message:
        typeof payload?.message === "string"
          ? payload.message
          : `API request failed: ${response.status}`,
      status: response.status,
      ...(payload?.code !== undefined ? { code: payload.code } : {}),
      ...(payload?.details !== undefined && typeof payload.details === "object"
        ? { details: payload.details as Record<string, unknown> }
        : {})
    });
  }

  if (body === undefined) {
    throw new PairflowApiError({
      message: `API response was not valid JSON: ${response.status}`,
      status: response.status
    });
  }

  return body as T;
}

export function createApiClient(baseUrl: string = ""): PairflowApiClient {
  return {
    async getRepos(): Promise<string[]> {
      const payload = await requestJson<ReposResponse>(
        toAbsoluteUrl(baseUrl, "/api/repos")
      );
      return payload.repos;
    },

    async getBubbles(repoPath: string): Promise<BubblesResponse> {
      return requestJson<BubblesResponse>(
        toAbsoluteUrl(baseUrl, `/api/bubbles?${bubbleQuery(repoPath)}`)
      );
    },

    async getBubble(repoPath: string, bubbleId: string): Promise<UiBubbleDetail> {
      const payload = await requestJson<BubbleDetailResponse>(
        bubbleUrl(baseUrl, repoPath, bubbleId)
      );
      return payload.bubble;
    },

    async getBubbleTimeline(
      repoPath: string,
      bubbleId: string
    ): Promise<UiTimelineEntry[]> {
      const payload = await requestJson<BubbleTimelineResponse>(
        bubbleUrl(baseUrl, repoPath, bubbleId, "timeline")
      );
      return payload.timeline;
    },

    async startBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "start");
    },

    async approveBubble(
      repoPath: string,
      bubbleId: string,
      input?: { refs?: string[] }
    ): Promise<Record<string, unknown>> {
      const refs = input?.refs;
      return postBubbleAction(baseUrl, repoPath, bubbleId, "approve", refs === undefined ? undefined : { refs });
    },

    async requestRework(
      repoPath: string,
      bubbleId: string,
      input: { message: string; refs?: string[] }
    ): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "request-rework", {
        message: input.message,
        ...(input.refs !== undefined ? { refs: input.refs } : {})
      });
    },

    async replyBubble(
      repoPath: string,
      bubbleId: string,
      input: { message: string; refs?: string[] }
    ): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "reply", {
        message: input.message,
        ...(input.refs !== undefined ? { refs: input.refs } : {})
      });
    },

    async resumeBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "resume");
    },

    async commitBubble(
      repoPath: string,
      bubbleId: string,
      input: CommitActionInput
    ): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "commit", {
        auto: input.auto,
        ...(input.message !== undefined ? { message: input.message } : {}),
        ...(input.refs !== undefined ? { refs: input.refs } : {})
      });
    },

    async mergeBubble(
      repoPath: string,
      bubbleId: string,
      input: MergeActionInput
    ): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "merge", {
        ...(input.push !== undefined ? { push: input.push } : {}),
        ...(input.deleteRemote !== undefined
          ? { deleteRemote: input.deleteRemote }
          : {})
      });
    },

    async openBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "open");
    },

    async attachBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "attach");
    },

    async stopBubble(repoPath: string, bubbleId: string): Promise<Record<string, unknown>> {
      return postBubbleAction(baseUrl, repoPath, bubbleId, "stop");
    }
  };
}
