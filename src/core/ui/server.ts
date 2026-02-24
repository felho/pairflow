import { constants as fsConstants } from "node:fs";
import { createServer, type Server } from "node:http";
import { access, readFile } from "node:fs/promises";
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
  cwd?: string | undefined;
  host?: string | undefined;
  port?: number | undefined;
  assetsDir?: string | undefined;
  pollIntervalMs?: number | undefined;
  debounceMs?: number | undefined;
  keepAliveIntervalMs?: number | undefined;
  routerDependencies?: CreateUiRouterInput["dependencies"] | undefined;
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
        `UI assets directory is missing index.html: ${resolvedPath}`
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

export async function startUiServer(
  input: StartUiServerInput = {}
): Promise<UiServerHandle> {
  const cwd = resolve(input.cwd ?? process.cwd());
  const host = input.host ?? defaultHost;
  const requestedPort = input.port ?? defaultPort;

  const repoScope = await resolveUiRepoScope({
    repoPaths: input.repoPaths,
    cwd
  });

  const assetsDir = await resolveAssetsDir({
    cwd,
    ...(input.assetsDir !== undefined ? { explicitAssetsDir: input.assetsDir } : {})
  });

  const events: UiEventsBroker = await createUiEventsBroker({
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

  const server = createServer((req, res) => {
    void (async () => {
      try {
        const handled = await router.handleRequest(req, res);
        if (handled) {
          return;
        }

        const hostHeader = req.headers.host ?? "127.0.0.1";
        const requestUrl = new URL(req.url ?? "/", `http://${hostHeader}`);

        if (assetsDir === null) {
          const body = fallbackAssetsHtml();
          res.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "content-length": String(Buffer.byteLength(body))
          });
          res.end(body);
          return;
        }

        const resolved = await resolveStaticAssetPath({
          assetsDir,
          requestPath: requestUrl.pathname
        });
        const filePath = resolved.path;

        if (!(await pathExists(filePath))) {
          res.writeHead(404, {
            "content-type": "text/plain; charset=utf-8"
          });
          res.end("Not found");
          return;
        }

        const content = await readFile(filePath);
        res.writeHead(200, {
          "content-type": contentTypeForPath(filePath),
          "cache-control":
            resolved.type === "file" ? "public, max-age=60" : "no-cache",
          "content-length": String(content.byteLength)
        });
        res.end(content);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        process.stderr.write(`UI static asset error: ${reason}\n`);
        const payload = "Internal server error\n";
        res.writeHead(500, {
          "content-type": "text/plain; charset=utf-8",
          "content-length": String(Buffer.byteLength(payload))
        });
        res.end(payload);
      }
    })();
  });

  const actualPort = await listen(server, requestedPort, host);

  return {
    host,
    port: actualPort,
    url: `http://${host}:${actualPort}`,
    repoScope,
    assetsDir,
    async close(): Promise<void> {
      await closeServer(server);
      await events.close();
    }
  };
}
