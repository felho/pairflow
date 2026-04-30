import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  normalizeValidationTargetCwd,
  normalizeValidationTargetPathSelector,
  resolveValidationTargetCwd
} from "../../../../src/v11/shared/validation/validationTargetPaths.js";

const cleanupPaths: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    cleanupPaths.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("resolveValidationTargetCwd", () => {
  it("classifies syntactically invalid cwd values as invalid config", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-target-paths-"));
    cleanupPaths.push(worktreePath);

    expect(() =>
      resolveValidationTargetCwd({
        worktreePath,
        cwd: "../outside"
      })
    ).toThrow(/VALIDATION_TARGET_CWD_INVALID/u);
  });

  it("returns the canonical real cwd for spawn and log output", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-target-paths-"));
    cleanupPaths.push(worktreePath);
    const realTargetPath = join(worktreePath, "packages", "web-real");
    await mkdir(realTargetPath, { recursive: true });
    await mkdir(join(worktreePath, "apps"), { recursive: true });
    await symlink(realTargetPath, join(worktreePath, "apps", "web"));

    expect(
      resolveValidationTargetCwd({
        worktreePath,
        cwd: "apps/web"
      })
    ).toBe(realpathSync.native(realTargetPath));
  });

  it("resolves a non-existent subtree under the canonical existing worktree prefix", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-target-paths-"));
    cleanupPaths.push(worktreePath);

    expect(
      resolveValidationTargetCwd({
        worktreePath,
        cwd: "apps/web"
      })
    ).toBe(join(realpathSync.native(worktreePath), "apps", "web"));
  });

  it("returns canonical cwd when an intermediate ancestor is an internal symlink", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-target-paths-"));
    cleanupPaths.push(worktreePath);
    const realAppsPath = join(worktreePath, "packages", "apps-real");
    await mkdir(join(realAppsPath, "web"), { recursive: true });
    await symlink(realAppsPath, join(worktreePath, "apps"));

    expect(
      resolveValidationTargetCwd({
        worktreePath,
        cwd: "apps/web"
      })
    ).toBe(realpathSync.native(join(realAppsPath, "web")));
  });

  it("normalizes unexpected realpath prefix failures into cwd containment failure", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-target-paths-"));
    cleanupPaths.push(worktreePath);
    const targetPath = join(worktreePath, "apps", "web");
    await mkdir(targetPath, { recursive: true });
    const realpathNative = realpathSync.native.bind(realpathSync);
    vi.spyOn(realpathSync, "native").mockImplementation((path) => {
      if (path === targetPath) {
        throw Object.assign(new Error("permission denied"), { code: "EACCES" });
      }
      return realpathNative(path);
    });

    expect(() =>
      resolveValidationTargetCwd({
        worktreePath,
        cwd: "apps/web"
      })
    ).toThrow(/VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE/u);
  });

  it("classifies missing worktree realpath failures as cwd containment failure", async () => {
    const worktreePath = join(tmpdir(), "pairflow-target-paths-missing-worktree");

    expect(() =>
      resolveValidationTargetCwd({
        worktreePath,
        cwd: "apps/web"
      })
    ).toThrow(/VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE/u);
  });

  it("can resolve against a planned missing worktree when explicitly allowed", async () => {
    const parentPath = await mkdtemp(join(tmpdir(), "pairflow-target-paths-parent-"));
    cleanupPaths.push(parentPath);
    const worktreePath = join(parentPath, "worktrees", "b_target");

    expect(
      resolveValidationTargetCwd({
        worktreePath,
        cwd: "apps/web",
        allowMissingWorktreePath: true
      })
    ).toBe(join(realpathSync.native(parentPath), "worktrees", "b_target", "apps", "web"));
  });
});

describe("validation target path normalization", () => {
  it("normalizes cwd to non-glob relative path only", () => {
    expect(normalizeValidationTargetCwd(" apps/web ")).toBe("apps/web");
    expect(normalizeValidationTargetCwd("apps/*")).toBeUndefined();
    expect(normalizeValidationTargetCwd("apps/?")).toBeUndefined();
    expect(normalizeValidationTargetCwd("apps/[web]")).toBeUndefined();
    expect(normalizeValidationTargetCwd("apps/{web,api}")).toBeUndefined();
    expect(normalizeValidationTargetCwd("../apps/web")).toBeUndefined();
    expect(normalizeValidationTargetCwd("/apps/web")).toBeUndefined();
    expect(normalizeValidationTargetCwd("apps\\web")).toBeUndefined();
  });

  it("normalizes path selectors while allowing glob syntax", () => {
    expect(normalizeValidationTargetPathSelector("")).toBeUndefined();
    expect(normalizeValidationTargetPathSelector("   ")).toBeUndefined();
    expect(normalizeValidationTargetPathSelector(" apps/web/** ")).toBe(
      "apps/web/**"
    );
    expect(normalizeValidationTargetPathSelector("packages/*/src")).toBe(
      "packages/*/src"
    );
    expect(normalizeValidationTargetPathSelector("../apps/web")).toBeUndefined();
    expect(normalizeValidationTargetPathSelector("/apps/web")).toBeUndefined();
    expect(normalizeValidationTargetPathSelector("apps\\web")).toBeUndefined();
  });
});
