import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { isMainCliEntrypoint } from "../../src/cli/isMainCliEntrypoint.js";

describe("isMainCliEntrypoint", () => {
  const tempDirs: string[] = [];

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

  it("returns false when argv entry is missing", () => {
    expect(isMainCliEntrypoint(import.meta.url, undefined)).toBe(false);
  });

  it("matches exact absolute entry path", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-main-entry-"));
    tempDirs.push(tempDir);
    const entryPath = join(tempDir, "entry.js");
    await writeFile(entryPath, "");

    const result = isMainCliEntrypoint(pathToFileURL(entryPath).href, entryPath);
    expect(result).toBe(true);
  });

  it("matches relative argv entry path", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-main-entry-rel-"));
    tempDirs.push(tempDir);
    const entryPath = join(tempDir, "entry.js");
    await writeFile(entryPath, "");
    const relativeEntryPath = relative(process.cwd(), entryPath);

    const result = isMainCliEntrypoint(
      pathToFileURL(entryPath).href,
      relativeEntryPath
    );
    expect(result).toBe(true);
  });

  it("matches symlinked argv entry path via canonical realpath", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-main-entry-link-"));
    tempDirs.push(tempDir);
    const targetPath = join(tempDir, "target.js");
    const symlinkPath = join(tempDir, "symlinked-entry.js");
    await writeFile(targetPath, "");
    await symlink(targetPath, symlinkPath);

    const result = isMainCliEntrypoint(
      pathToFileURL(targetPath).href,
      symlinkPath
    );
    expect(result).toBe(true);
  });

  it("returns false when entry path points to different file", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-main-entry-miss-"));
    tempDirs.push(tempDir);
    const targetPath = join(tempDir, "target.js");
    const otherPath = join(tempDir, "other.js");
    await writeFile(targetPath, "");
    await writeFile(otherPath, "");

    const result = isMainCliEntrypoint(pathToFileURL(targetPath).href, otherPath);
    expect(result).toBe(false);
  });
});
