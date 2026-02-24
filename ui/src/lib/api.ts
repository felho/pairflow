import type {
  UiApiErrorBody,
  UiBubbleSummary,
  UiRepoSummary
} from "./types";

interface ReposResponse {
  repos: string[];
}

interface BubblesResponse {
  repo: UiRepoSummary;
  bubbles: UiBubbleSummary[];
}

export interface PairflowApiClient {
  getRepos(): Promise<string[]>;
  getBubbles(repoPath: string): Promise<BubblesResponse>;
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
      const query = new URLSearchParams({ repo: repoPath });
      return requestJson<BubblesResponse>(
        toAbsoluteUrl(baseUrl, `/api/bubbles?${query.toString()}`)
      );
    }
  };
}
