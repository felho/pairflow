import { constants as fsConstants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function contentTypeForPath(path: string): string {
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

export async function pathExists(path: string): Promise<boolean> {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export async function fileSignature(path: string): Promise<string> {
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

export function fallbackAssetsHtml(): string {
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

export async function resolveAssetsDir(input: {
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
