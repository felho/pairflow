import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { UiRouter } from "../../../src/v11/infrastructure/ui/router.js";
import type { UiEventsBroker } from "../../../src/v11/infrastructure/ui/events.js";

export interface SmokeUiRouterRequest {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

export interface SmokeUiRouterResponse<TBody = unknown> {
  handled: boolean;
  status: number;
  headers: Record<string, string>;
  rawBody: string;
  body: TBody;
  request: {
    method: SmokeUiRouterRequest["method"];
    path: string;
    body?: unknown;
  };
}

function createSmokeIncomingMessage(
  input: SmokeUiRouterRequest
): IncomingMessage {
  const body =
    input.body === undefined ? undefined : `${JSON.stringify(input.body)}\n`;
  const req = Readable.from(body === undefined ? [] : [body]) as IncomingMessage;
  req.method = input.method;
  req.url = input.path;
  req.headers = {
    host: "127.0.0.1",
    ...(body !== undefined
      ? {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(body))
        }
      : {})
  };
  return req;
}

function createSmokeServerResponse(): {
  res: ServerResponse;
  read(): Omit<SmokeUiRouterResponse, "handled" | "body" | "request">;
} {
  let status = 200;
  const headers: Record<string, string> = {};
  const chunks: Buffer[] = [];

  const res = {
    writeHead(
      code: number,
      responseHeaders: Record<string, string> = {}
    ): ServerResponse {
      status = code;
      for (const [key, value] of Object.entries(responseHeaders)) {
        headers[key.toLowerCase()] = value;
      }
      return this as unknown as ServerResponse;
    },
    end(chunk?: string | Buffer): ServerResponse {
      if (chunk !== undefined) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return this as unknown as ServerResponse;
    }
  } as ServerResponse;

  return {
    res,
    read: () => ({
      status,
      headers,
      rawBody: Buffer.concat(chunks).toString("utf8")
    })
  };
}

export async function invokeSmokeUiRouter<TBody = unknown>(
  router: UiRouter,
  input: SmokeUiRouterRequest
): Promise<SmokeUiRouterResponse<TBody>> {
  const req = createSmokeIncomingMessage(input);
  const response = createSmokeServerResponse();
  const handled = await router.handleRequest(req, response.res);
  const raw = response.read();
  return {
    handled,
    ...raw,
    body: JSON.parse(raw.rawBody) as TBody,
    request: {
      method: input.method,
      path: input.path,
      ...(input.body !== undefined ? { body: input.body } : {})
    }
  };
}

export function createNoopSmokeUiEventsBroker(): UiEventsBroker {
  return {
    subscribe: () => () => undefined,
    getSnapshot: () => ({
      id: 1,
      ts: "2026-05-10T00:00:00.000Z",
      type: "snapshot",
      repos: [],
      bubbles: []
    }),
    refreshNow: () => Promise.resolve(undefined),
    addRepo: () => Promise.resolve(false),
    removeRepo: () => Promise.resolve(false),
    close: () => Promise.resolve(undefined)
  };
}
