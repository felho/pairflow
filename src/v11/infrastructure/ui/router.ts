import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";

import type { CreateUiRouterInput, UiRouter } from "./routerContracts.js";
import {
  UiApiHttpError,
  asErrorMessage,
  badRequest,
  internalError,
  isNotFoundErrorMessage,
  notFound,
  sendApiError
} from "./routerHttp.js";
import { UiRepoScopeError } from "./repoScope.js";
import { resolveUiRouterDependencies } from "./routerDependencies.js";
import { handleApiRequest } from "./routerRequest.js";
import {
  resolveUiStaticAssetPath,
  type StaticAssetResolution
} from "./routerStaticAssets.js";

export type { CreateUiRouterInput, UiRouter } from "./routerContracts.js";
export type { StaticAssetResolution } from "./routerStaticAssets.js";

export function createUiRouter(input: CreateUiRouterInput): UiRouter {
  const routerCwd = resolve(input.cwd ?? process.cwd());
  const keepAliveIntervalMs = input.keepAliveIntervalMs ?? 15_000;
  const dependencies = resolveUiRouterDependencies(input);

  const environment = {
    input,
    dependencies,
    routerCwd
  };

  return {
    async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
      const host = req.headers.host ?? "127.0.0.1";
      let url: URL;
      try {
        url = new URL(req.url ?? "/", `http://${host}`);
      } catch {
        sendApiError(res, badRequest("Invalid request URL."));
        return true;
      }

      try {
        return await handleApiRequest({
          environment,
          req,
          res,
          url,
          keepAliveIntervalMs
        });
      } catch (error) {
        if (error instanceof UiApiHttpError) {
          sendApiError(res, error.apiError);
          return true;
        }

        const message = asErrorMessage(error);
        if (isNotFoundErrorMessage(message)) {
          sendApiError(res, notFound(message));
          return true;
        }
        if (error instanceof UiRepoScopeError) {
          sendApiError(res, badRequest(message));
          return true;
        }
        sendApiError(res, internalError(message));
        return true;
      }
    }
  };
}

export async function resolveStaticAssetPath(input: {
  assetsDir: string;
  requestPath: string;
}): Promise<StaticAssetResolution> {
  return resolveUiStaticAssetPath(input);
}
