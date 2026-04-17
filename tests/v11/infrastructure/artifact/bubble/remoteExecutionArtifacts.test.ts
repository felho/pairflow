import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SchemaValidationError } from "../../../../../src/v11/shared/validation/primitives.js";
import { getBubblePaths } from "../../../../../src/v11/shared/bubble/bubblePaths.js";
import {
  RemoteArtifactIoError,
  readRemotePointer,
  readRemoteStateCache,
  validateRemotePointer,
  validateRemoteStateCache,
  writeRemotePointer,
  writeRemoteStateCache
} from "../../../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-remote-artifacts-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("remote execution artifacts", () => {
  it("reads and writes created pointer, started pointer, and cache artifacts", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_01");
    await mkdir(paths.bubbleDir, { recursive: true });

    await writeRemotePointer(paths.remotePointerPath, {
      kind: "created",
      host: "homelab",
      portForwards: [3000]
    });
    expect(await readRemotePointer(paths.remotePointerPath)).toEqual({
      kind: "created",
      host: "homelab",
      portForwards: [3000]
    });

    await writeRemotePointer(paths.remotePointerPath, {
      kind: "started",
      host: "homelab",
      user: "dev",
      instanceId: "inst_20260411T203000Z",
      remoteClonePath: "~/repos/pairflow--b_remote_artifacts_01",
      tmuxSession: "pf-b_remote_artifacts_01",
      startedAt: "2026-04-11T20:30:00Z",
      portForwards: [3000, 8080]
    });
    expect(await readRemotePointer(paths.remotePointerPath)).toEqual({
      kind: "started",
      host: "homelab",
      user: "dev",
      instanceId: "inst_20260411T203000Z",
      remoteClonePath: "~/repos/pairflow--b_remote_artifacts_01",
      tmuxSession: "pf-b_remote_artifacts_01",
      startedAt: "2026-04-11T20:30:00Z",
      portForwards: [3000, 8080]
    });

    await writeRemoteStateCache(paths.remoteStateCachePath, {
      lastCheckedAt: "2026-04-11T22:15:00Z",
      state: "RUNNING",
      round: 2,
      maxRounds: 8,
      implementerStatus: "idle",
      reviewerStatus: "working"
    });
    expect(await readRemoteStateCache(paths.remoteStateCachePath)).toEqual({
      lastCheckedAt: "2026-04-11T22:15:00Z",
      state: "RUNNING",
      round: 2,
      maxRounds: 8,
      implementerStatus: "idle",
      reviewerStatus: "working"
    });

    expect(paths.remotePointerPath).toMatch(/remote\.json$/u);
    expect(paths.remoteStateCachePath).toMatch(/state-cache\.json$/u);
  });

  it("returns null when remote artifacts are missing", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_02");

    await expect(readRemotePointer(paths.remotePointerPath)).resolves.toBeNull();
    await expect(readRemoteStateCache(paths.remoteStateCachePath)).resolves.toBeNull();
  });

  it("rejects remote pointer port forwards above the TCP range upper bound", () => {
    const result = validateRemotePointer({
      kind: "created",
      host: "homelab",
      portForwards: [65536]
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "portForwards[0]",
        message: "Must be an integer in range 1..65535"
      }
    ]);
  });

  it("rejects remote pointers without an explicit kind discriminant", () => {
    const result = validateRemotePointer({
      host: "homelab"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "kind",
        message: "Must be one of: created, started"
      }
    ]);
  });

  it("fails closed on invalid JSON content", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_03");
    await mkdir(paths.bubbleDir, { recursive: true });

    await writeFile(paths.remotePointerPath, "{invalid-json", "utf8");
    try {
      await readRemotePointer(paths.remotePointerPath);
      throw new Error("Expected readRemotePointer to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).message).toContain("Invalid JSON");
    }

    await writeFile(paths.remoteStateCachePath, "{invalid-json", "utf8");
    try {
      await readRemoteStateCache(paths.remoteStateCachePath);
      throw new Error("Expected readRemoteStateCache to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).message).toContain("Invalid JSON");
    }
  });

  it("rejects partial started pointer fields", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_04");
    await mkdir(paths.bubbleDir, { recursive: true });
    await writeFile(
      paths.remotePointerPath,
      `${JSON.stringify({
        kind: "started",
        host: "homelab",
        instanceId: "inst_01",
        remoteClonePath: "~/repos/pairflow--b_remote_artifacts_04"
      })}\n`,
      "utf8"
    );

    try {
      await readRemotePointer(paths.remotePointerPath);
      throw new Error("Expected readRemotePointer to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).message).toContain(
        "REMOTE_POINTER_INVALID"
      );
      expect((error as SchemaValidationError).errors).toEqual([
        {
          path: "kind",
          message:
            "Started remote pointer requires instanceId, remoteClonePath, tmuxSession, and startedAt"
        }
      ]);
      expect((error as SchemaValidationError).context).toEqual({
        source: "assert_validation",
        errorCount: 1,
        firstErrorPath: "kind"
      });
    }
  });

  it("rejects pointer fields inside state cache artifacts", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_05");
    await mkdir(paths.bubbleDir, { recursive: true });
    await writeFile(
      paths.remoteStateCachePath,
      `${JSON.stringify({
        lastCheckedAt: "2026-04-11T22:15:00Z",
        state: "RUNNING",
        round: 2,
        maxRounds: 8,
        startedAt: "2026-04-11T20:30:00Z"
      })}\n`,
      "utf8"
    );

    try {
      await readRemoteStateCache(paths.remoteStateCachePath);
      throw new Error("Expected readRemoteStateCache to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).message).toContain(
        "REMOTE_STATE_CACHE_INVALID"
      );
      expect((error as SchemaValidationError).errors.some((entry) => entry.path === "startedAt")).toBe(
        true
      );
    }
  });

  it("preserves SchemaValidationError context when remote pointer validation is rewrapped", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_05b");
    await mkdir(paths.bubbleDir, { recursive: true });
    await writeFile(
      paths.remotePointerPath,
      `${JSON.stringify({
        kind: "created",
        host: ""
      })}\n`,
      "utf8"
    );

    try {
      await readRemotePointer(paths.remotePointerPath);
      throw new Error("Expected readRemotePointer to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).context).toEqual({
        source: "assert_validation",
        errorCount: 1,
        firstErrorPath: "host"
      });
    }
  });

  it("preserves SchemaValidationError context when remote state cache validation is rewrapped", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_05c");
    await mkdir(paths.bubbleDir, { recursive: true });
    await writeFile(
      paths.remoteStateCachePath,
      `${JSON.stringify({
        lastCheckedAt: "2026-04-11T22:15:00Z",
        state: "RUNNING",
        round: -1,
        maxRounds: 8
      })}\n`,
      "utf8"
    );

    try {
      await readRemoteStateCache(paths.remoteStateCachePath);
      throw new Error("Expected readRemoteStateCache to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).context).toEqual({
        source: "assert_validation",
        errorCount: 1,
        firstErrorPath: "round"
      });
    }
  });

  it("validates a direct remote state cache payload on the exported validator boundary", () => {
    const result = validateRemoteStateCache({
      lastCheckedAt: "2026-04-11T22:15:00Z",
      state: "RUNNING",
      round: 2,
      maxRounds: 8,
      implementerStatus: "idle",
      reviewerStatus: "working"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({
      lastCheckedAt: "2026-04-11T22:15:00Z",
      state: "RUNNING",
      round: 2,
      maxRounds: 8,
      implementerStatus: "idle",
      reviewerStatus: "working"
    });
  });

  it("rejects forbidden pointer fields on the direct remote state cache validator boundary", () => {
    const result = validateRemoteStateCache({
      lastCheckedAt: "2026-04-11T22:15:00Z",
      state: "RUNNING",
      round: 2,
      maxRounds: 8,
      host: "homelab"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "host",
        message: "Pointer fields are not allowed in state-cache.json"
      }
    ]);
  });

  it("fails closed when the parent directory is missing on write", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_06");

    await expect(
      writeRemotePointer(paths.remotePointerPath, {
        kind: "created",
        host: "homelab"
      })
    ).rejects.toThrow(/REMOTE_ARTIFACT_PARENT_DIR_MISSING/u);

    await expect(
      writeRemoteStateCache(paths.remoteStateCachePath, {
        lastCheckedAt: "2026-04-11T22:15:00Z",
        state: "RUNNING",
        round: 1,
        maxRounds: 8
      })
    ).rejects.toThrow(/REMOTE_ARTIFACT_PARENT_DIR_MISSING/u);
  });

  it("collapses ENOENT reads to null for both missing files and broken links", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_07");
    await mkdir(paths.bubbleDir, { recursive: true });

    const missingTarget = join(paths.bubbleDir, "missing-remote-pointer.json");
    await symlink(missingTarget, paths.remotePointerPath);

    await expect(readRemotePointer(paths.remotePointerPath)).resolves.toBeNull();
  });

  it("normalizes read failures that are not schema or missing-file cases", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_08");
    await mkdir(paths.remotePointerPath, { recursive: true });

    try {
      await readRemotePointer(paths.remotePointerPath);
      throw new Error("Expected readRemotePointer to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteArtifactIoError);
      expect((error as RemoteArtifactIoError).message).toContain(
        "REMOTE_ARTIFACT_READ_FAILED"
      );
    }
  });

  it("normalizes write failures that are not missing-parent cases", async () => {
    const repoPath = await createTempDir();
    const paths = getBubblePaths(repoPath, "b_remote_artifacts_09");
    await mkdir(paths.bubbleDir, { recursive: true });
    await mkdir(paths.remotePointerPath, { recursive: true });

    try {
      await writeRemotePointer(paths.remotePointerPath, {
        kind: "created",
        host: "homelab"
      });
      throw new Error("Expected writeRemotePointer to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteArtifactIoError);
      expect((error as RemoteArtifactIoError).message).toContain(
        "REMOTE_ARTIFACT_WRITE_FAILED"
      );
    }
  });
});
