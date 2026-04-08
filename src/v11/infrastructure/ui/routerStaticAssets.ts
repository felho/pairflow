import { join, resolve, sep } from "node:path";

import { pathExists } from "../foundation/fs/pathExists.js";

export interface StaticAssetResolution {
  type: "file" | "fallback";
  path: string;
}

export async function resolveUiStaticAssetPath(input: {
  assetsDir: string;
  requestPath: string;
}): Promise<StaticAssetResolution> {
  const assetsDir = resolve(input.assetsDir);
  const rawRequestPath = input.requestPath.startsWith("/")
    ? input.requestPath
    : `/${input.requestPath}`;
  const decodedRequestPath = (() => {
    try {
      return decodeURIComponent(rawRequestPath);
    } catch {
      return rawRequestPath;
    }
  })();
  const normalizedRequestPath =
    decodedRequestPath === "/" ? "/index.html" : decodedRequestPath;
  const candidatePath = resolve(assetsDir, `.${normalizedRequestPath}`);
  const isInsideAssetsDir =
    candidatePath === assetsDir || candidatePath.startsWith(`${assetsDir}${sep}`);
  if (!isInsideAssetsDir) {
    return {
      type: "fallback",
      path: join(assetsDir, "index.html")
    };
  }

  if (await pathExists(candidatePath)) {
    return {
      type: "file",
      path: candidatePath
    };
  }

  return {
    type: "fallback",
    path: join(assetsDir, "index.html")
  };
}
