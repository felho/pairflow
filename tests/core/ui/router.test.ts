import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveStaticAssetPath } from "../../../src/core/ui/router.js";

const tempDirs: string[] = [];

async function createAssetsDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pairflow-ui-router-"));
  tempDirs.push(dir);
  await writeFile(join(dir, "index.html"), "<html>index</html>\n", "utf8");
  await writeFile(join(dir, "app.js"), "console.log('ok');\n", "utf8");
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("resolveStaticAssetPath", () => {
  it("resolves existing static files inside assets dir", async () => {
    const assetsDir = await createAssetsDir();

    const resolved = await resolveStaticAssetPath({
      assetsDir,
      requestPath: "/app.js"
    });

    expect(resolved.type).toBe("file");
    expect(resolved.path).toBe(join(assetsDir, "app.js"));
  });

  it("falls back to index for traversal attempts", async () => {
    const assetsDir = await createAssetsDir();

    const resolved = await resolveStaticAssetPath({
      assetsDir,
      requestPath: "/../../etc/passwd"
    });

    expect(resolved.type).toBe("fallback");
    expect(resolved.path).toBe(join(assetsDir, "index.html"));
  });
});
