import { constants as fsConstants, watch, type FSWatcher } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
function contentTypeForPath(path: string): string {
  const extension = extname(path).toLowerCase();
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}
async function pathExists(path: string): Promise<boolean> {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch(() => false);
}
async function fileSignature(path: string): Promise<string> {
  return stat(path)
    .then((info) => `${info.mtimeMs}:${info.size}`)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return "missing";
      }
      throw error;
    });
}
async function findAssetsDirFromCwd(cwd: string): Promise<string | null> {
  let current = resolve(cwd);
  while (true) {
    const candidate = join(current, "ui", "dist");
    const indexPath = join(candidate, "index.html");
    if (await pathExists(indexPath)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}
function fallbackAssetsHtml(): string {
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '  <meta charset="utf-8" />',
    "  <title>Pairflow UI</title>",
    "</head>",
    "<body>",
    "  <h1>Pairflow UI Server</h1>",
    "  <p>Frontend assets are not built yet. Build the UI bundle and restart `pairflow ui`.</p>",
    "</body>",
    "</html>"
  ].join("\n");
}
async function resolveAssetsDir(input: {
  cwd: string;
  explicitAssetsDir?: string | undefined;
}): Promise<string | null> {
  if (input.explicitAssetsDir !== undefined) {
    const resolvedPath = resolve(input.explicitAssetsDir);
    const indexPath = join(resolvedPath, "index.html");
    if (!(await pathExists(indexPath))) {
      throw new Error(
        `UI_ASSETS_INDEX_MISSING: context assets_dir=${resolvedPath}; expected index.html in explicit UI assets directory.`
      );
    }
    return resolvedPath;
  }

  const discovered = await findAssetsDirFromCwd(input.cwd);
  if (discovered !== null) {
    return discovered;
  }

  const modulePath = fileURLToPath(import.meta.url);
  const candidates = [
    resolve(dirname(modulePath), "../../../ui/dist"),
    resolve(dirname(modulePath), "../../../../ui/dist")
  ];
  for (const candidate of candidates) {
    if (await pathExists(join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}
async function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise<number>((resolvePromise, rejectPromise) => {
    server.once("error", (error) => {
      rejectPromise(error);
    });
    server.listen(port, host, () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        rejectPromise(
          new Error("UI server failed to resolve listening address.")
        );
        return;
      }
      resolvePromise(address.port);
    });
  });
}
function closeServer(server: Server): Promise<void> {
  return new Promise<void>((resolvePromise, rejectPromise) => {
      server.close((error) => {
        if (error !== undefined) {
          rejectPromise(error);
          return;
        }
        resolvePromise();
      });
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }
      if (typeof server.closeIdleConnections === "function") {
        server.closeIdleConnections();
      }
    });
  }
interface UiServerRegistrySyncController {
  close(): Promise<void>;
}

interface UiServerRegistrySyncState {
  closing: boolean;
  requestedVersion: number;
  appliedVersion: number;
  promise: Promise<void> | null;
  watchTimer: NodeJS.Timeout | null;
  watcher: FSWatcher | null;
  lastSignature: string | null;
}
function createUiServerRegistrySyncState(): UiServerRegistrySyncState {
  return {
    closing: false,
    requestedVersion: 0,
    appliedVersion: 0,
    promise: null,
    watchTimer: null,
    watcher: null,
    lastSignature: null
  };
}
async function runUiServerRegistrySyncLoop(input: {
  state: UiServerRegistrySyncState;
  events: UiEventsBroker;
  refreshFromRegistry: () => ReturnType<NonNullable<UiRepoScope["refreshFromRegistry"]>>;
}): Promise<void> {
  while (!input.state.closing && input.state.appliedVersion < input.state.requestedVersion) {
    const requestVersion = input.state.requestedVersion;
    let refreshed = false;
    try {
      const diff = await input.refreshFromRegistry();
      refreshed = true;
      for (const removed of diff.removed) {
        try {
          await input.events.removeRepo(removed);
        } catch (error) {
          console.error(
            `Failed to remove UI events repo after registry refresh: ${removed}`,
            error
          );
        }
      }
      for (const added of diff.added) {
        try {
          await input.events.addRepo(added);
        } catch (error) {
          console.error(
            `Failed to add UI events repo after registry refresh: ${added}`,
            error
          );
        }
      }
      await input.events.refreshNow();
    } finally {
      if (refreshed) {
        input.state.appliedVersion = Math.max(input.state.appliedVersion, requestVersion);
      } else if (input.state.appliedVersion < requestVersion) {
        input.state.requestedVersion = Math.max(input.state.requestedVersion, requestVersion);
      }
    }
  }
}
function createUiServerRegistryRefreshScheduler(input: {
  state: UiServerRegistrySyncState;
  events: UiEventsBroker;
  refreshFromRegistry: () => ReturnType<NonNullable<UiRepoScope["refreshFromRegistry"]>>;
}): () => void {
  return () => {
    if (input.state.closing) {
      return;
    }
    input.state.requestedVersion += 1;
    if (input.state.promise !== null) {
      return;
    }
    input.state.promise = runUiServerRegistrySyncLoop({
      state: input.state,
      events: input.events,
      refreshFromRegistry: input.refreshFromRegistry
    })
      .catch((error) => {
        console.error("Failed to refresh UI repo scope from registry", error);
      })
      .finally(() => {
        input.state.promise = null;
        if (
          !input.state.closing &&
          input.state.appliedVersion < input.state.requestedVersion
        ) {
          void createUiServerRegistryRefreshScheduler({
            state: input.state,
            events: input.events,
            refreshFromRegistry: input.refreshFromRegistry
          })();
        }
      });
  };
}
function createUiServerRegistryWatcher(input: {
  state: UiServerRegistrySyncState;
  registryPath: string;
  scheduleRegistryRefresh: () => void;
}): void {
  void (async () => {
    input.state.lastSignature = await fileSignature(input.registryPath);
    if (await pathExists(input.registryPath)) {
      input.state.watcher = watch(input.registryPath, () => {
        if (input.state.watchTimer !== null) {
          clearTimeout(input.state.watchTimer);
        }
        input.state.watchTimer = setTimeout(() => {
          input.state.watchTimer = null;
          void (async () => {
            const nextSignature = await fileSignature(input.registryPath);
            if (nextSignature === input.state.lastSignature) {
              return;
            }
            input.state.lastSignature = nextSignature;
            input.scheduleRegistryRefresh();
          })().catch((error) => {
            console.error("Failed to schedule UI repo registry refresh", error);
          });
        }, 100);
      });
      input.state.watcher.on("error", (error) => {
        console.error("UI repo registry watcher error", error);
      });
    }
  })().catch((error) => {
    console.error("Failed to initialize UI repo registry watcher", error);
  });
}
function createUiServerRegistrySyncController(input: {
  repoScope: UiRepoScope;
  events: UiEventsBroker;
}): UiServerRegistrySyncController {
  const state = createUiServerRegistrySyncState();

  const refreshFromRegistry = input.repoScope.refreshFromRegistry;
  if (typeof refreshFromRegistry !== "function") {
    return {
      async close(): Promise<void> {
        state.closing = true;
        await Promise.resolve();
      }
    };
  }

  const registryPath = input.repoScope.registryPath;
  if (registryPath === undefined) {
    return {
      async close(): Promise<void> {
        state.closing = true;
        await Promise.resolve();
      }
    };
  }

  const scheduleRegistryRefresh = createUiServerRegistryRefreshScheduler({
    state,
    events: input.events,
    refreshFromRegistry
  });
  createUiServerRegistryWatcher({
    state,
    registryPath,
    scheduleRegistryRefresh
  });
  return {
    async close(): Promise<void> {
      state.closing = true;
      if (state.watchTimer !== null) {
        clearTimeout(state.watchTimer);
        state.watchTimer = null;
      }
      state.watcher?.close();
      state.watcher = null;
      await state.promise;
    }
  };
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
