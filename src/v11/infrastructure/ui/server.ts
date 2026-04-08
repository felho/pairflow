import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createUiEventsBroker, type UiEventsBroker } from "./events.js";
import {
  createUiRouter,
  type CreateUiRouterInput,
  resolveStaticAssetPath,
  type UiRouter
} from "./router.js";
import {
  resolveUiRepoScope,
  type UiRepoScope
} from "./repoScope.js";
import {
  contentTypeForPath,
  fallbackAssetsHtml,
  resolveAssetsDir
} from "./uiServerAssets.js";
import { closeServer, listen } from "./uiServerLifecycle.js";
import { createUiServerRegistrySyncController } from "./uiServerRegistrySync.js";

const defaultHost = "127.0.0.1";
const defaultPort = 4173;

export interface StartUiServerInput {
  repoPaths?: string[] | undefined;
  repoRegistryPath?: string | undefined;
  cwd?: string | undefined;
  host?: string | undefined;
  port?: number | undefined;
  assetsDir?: string | undefined;
  pollIntervalMs?: number | undefined;
  debounceMs?: number | undefined;
  keepAliveIntervalMs?: number | undefined;
  routerDependencies?: CreateUiRouterInput["dependencies"] | undefined;
  dependencies?:
    | {
        resolveUiRepoScope?: typeof resolveUiRepoScope;
        createUiEventsBroker?: typeof createUiEventsBroker;
      }
    | undefined;
}
export interface UiServerHandle {
  host: string;
  port: number;
  url: string;
  repoScope: UiRepoScope;
  assetsDir: string | null;
  close(): Promise<void>;
}
function createUiServerRequestHandler(input: {
  router: UiRouter;
  assetsDir: string | null;
}): (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => void {
  return (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => {
    void (async () => {
      try {
        const handledByApi = await input.router.handleRequest(req, res);
        if (handledByApi) {
          return;
        }

        if (input.assetsDir === null) {
          const body = fallbackAssetsHtml();
          res.writeHead(503, {
            "content-type": "text/html; charset=utf-8",
            "content-length": String(Buffer.byteLength(body))
          });
          res.end(body);
          return;
        }

        const requestPath = req.url ?? "/";
        const resolvedAsset = await resolveStaticAssetPath({
          assetsDir: input.assetsDir,
          requestPath
        });
        const body = await readFile(resolvedAsset.path);
        res.writeHead(200, {
          "content-type": contentTypeForPath(resolvedAsset.path),
          "content-length": String(body.byteLength),
          ...(resolvedAsset.type === "fallback"
            ? { "cache-control": "no-store" }
            : {})
        });
        res.end(body);
      } catch (error) {
        console.error("UI server error", error);
        res.writeHead(500, {
          "content-type": "text/plain; charset=utf-8"
        });
        res.end("Internal server error\n");
      }
    })();
  };
}

export async function startUiServer(
  input: StartUiServerInput = {}
): Promise<UiServerHandle> {
  const cwd = resolve(input.cwd ?? process.cwd());
  const host = input.host ?? defaultHost;
  const requestedPort = input.port ?? defaultPort;

  const resolveScope = input.dependencies?.resolveUiRepoScope ?? resolveUiRepoScope;
  const createEventsBroker =
    input.dependencies?.createUiEventsBroker ?? createUiEventsBroker;

  const repoScope = await resolveScope({
    repoPaths: input.repoPaths,
    cwd,
    ...(input.repoRegistryPath !== undefined
      ? { registryPath: input.repoRegistryPath }
      : {})
  });

  const assetsDir = await resolveAssetsDir({
    cwd,
    ...(input.assetsDir !== undefined ? { explicitAssetsDir: input.assetsDir } : {})
  });

  const events: UiEventsBroker = await createEventsBroker({
    repos: repoScope.repos,
    ...(input.pollIntervalMs !== undefined
      ? { pollIntervalMs: input.pollIntervalMs }
      : {}),
    ...(input.debounceMs !== undefined ? { debounceMs: input.debounceMs } : {})
  });
  const router: UiRouter = createUiRouter({
    repoScope,
    events,
    cwd,
    ...(input.keepAliveIntervalMs !== undefined
      ? { keepAliveIntervalMs: input.keepAliveIntervalMs }
      : {}),
    ...(input.routerDependencies !== undefined
      ? { dependencies: input.routerDependencies }
      : {})
  });

  const registrySyncController = createUiServerRegistrySyncController({
    repoScope,
    events
  });
  const server = createServer(
    createUiServerRequestHandler({
      router,
      assetsDir
    })
  );

  const actualPort = await listen(server, requestedPort, host);
  const url = `http://${host}:${actualPort}`;

  return {
    host,
    port: actualPort,
    url,
    repoScope,
    assetsDir,
    async close(): Promise<void> {
      await registrySyncController.close();
      await Promise.all([closeServer(server), events.close()]);
    }
  };
}
