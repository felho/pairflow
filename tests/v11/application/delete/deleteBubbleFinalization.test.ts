import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { ArchiveManifest } from "../../../../src/types/archive.js";
import { createDeleteArchive } from "../../../../src/v11/application/delete/internal/finalization/deleteBubbleFinalization.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(async (path) => rm(path, {
    recursive: true,
    force: true
  })));
});

async function createTempDir(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(path);
  return path;
}

describe("deleteBubbleFinalization", () => {
  it("materializes remote archive continuity in an isolated staging directory", async () => {
    const repoPath = await createTempDir("pairflow-delete-finalization-repo-");
    const bubbleDir = join(repoPath, ".pairflow", "bubbles", "b_delete_finalization_01");
    await mkdir(bubbleDir, { recursive: true });
    await writeFile(join(bubbleDir, "local-only.txt"), "keep me local\n", "utf8");

    let stagedBubbleDir: string | null = null;
    const createArchiveSnapshot = vi.fn(async (input: {
      bubbleDir: string;
      sourceBubbleDir?: string;
    }) => {
      stagedBubbleDir = input.bubbleDir;
      expect(input.bubbleDir).not.toBe(bubbleDir);
      expect(input.sourceBubbleDir).toBe(
        "/srv/pairflow/repo--b_delete_finalization_01/.pairflow/bubbles/b_delete_finalization_01"
      );
      await expect(readFile(join(input.bubbleDir, "bubble.toml"), "utf8")).resolves.toBe(
        "id = 'b_delete_finalization_01'\n"
      );
      await expect(readFile(join(input.bubbleDir, "state.json"), "utf8")).resolves.toBe(
        "{\"bubble_id\":\"b_delete_finalization_01\",\"state\":\"DONE\"}\n"
      );
      await expect(
        readFile(join(input.bubbleDir, "artifacts", "task.md"), "utf8")
      ).resolves.toBe("# Task\n");
      return {
        archivePath: "/tmp/archive-path",
        manifest: {
          schema_version: 1,
          archived_at: "2026-04-18T00:00:00.000Z",
          repo_path: repoPath,
          repo_key: "repo-key",
          bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
          bubble_id: "b_delete_finalization_01",
          source_bubble_dir:
            "/srv/pairflow/repo--b_delete_finalization_01/.pairflow/bubbles/b_delete_finalization_01",
          archived_files: [
            "bubble.toml",
            "state.json",
            "transcript.ndjson",
            "inbox.ndjson",
            "artifacts/task.md"
          ]
        } satisfies ArchiveManifest,
        reusedExisting: false
      };
    });

    await createDeleteArchive({
      input: {
        bubbleId: "b_delete_finalization_01",
        cwd: repoPath,
        force: true
      },
      resolved: {
        bubbleId: "b_delete_finalization_01",
        repoPath,
        bubbleConfig: {
          bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
          bubble_branch: "pairflow/bubble/b_delete_finalization_01"
        },
        bubblePaths: {
          bubbleDir,
          bubbleTomlPath: join(bubbleDir, "bubble.toml"),
          locksDir: join(repoPath, ".pairflow", "locks"),
          worktreePath: repoPath,
          sessionsPath: join(repoPath, ".pairflow", "sessions.json"),
          statePath: join(bubbleDir, "state.json")
        }
      } as never,
      execution: {
        bubbleInstanceId: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
        metricsRound: null,
        requiresPreDeleteStop: false
      },
      dependencies: {
        createArchiveSnapshot,
        upsertDeletedArchiveIndexEntry: vi.fn(async () => ({
          indexPath: "/tmp/index.json",
          entry: {
            bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
            bubble_id: "b_delete_finalization_01",
            repo_path: repoPath,
            repo_key: "repo-key",
            archive_path: "/tmp/archive-path",
            status: "deleted",
            created_at: null,
            deleted_at: "2026-04-18T00:00:00.000Z",
            purged_at: null,
            updated_at: "2026-04-18T00:00:00.000Z"
          }
        })),
        archiveLocksDir: join(repoPath, ".pairflow", "locks")
      } as never,
      remoteArchiveCapture: {
        sourceBubbleDir:
          "/srv/pairflow/repo--b_delete_finalization_01/.pairflow/bubbles/b_delete_finalization_01",
        bubbleToml: "id = 'b_delete_finalization_01'\n",
        stateJson: "{\"bubble_id\":\"b_delete_finalization_01\",\"state\":\"DONE\"}\n",
        transcriptNdjson: "{\"id\":\"msg_remote_delete_01\"}\n",
        inboxNdjson: "",
        taskMarkdown: "# Task\n"
      },
      now: new Date("2026-04-18T00:00:00.000Z"),
      inferCreatedAtFromBubbleInstanceId: () => null,
      toDeleteStepError: ({ error }) => error as Error
    });

    expect(createArchiveSnapshot).toHaveBeenCalledOnce();
    expect(await readdir(bubbleDir)).toEqual(["local-only.txt"]);
    expect(stagedBubbleDir).not.toBeNull();
    if (stagedBubbleDir === null) {
      throw new Error("expected remote archive continuity staging directory");
    }
    await expect(readFile(join(bubbleDir, "local-only.txt"), "utf8")).resolves.toBe(
      "keep me local\n"
    );
    await expect(
      readFile(join(stagedBubbleDir, "bubble.toml"), "utf8")
    ).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("treats remote archive staging cleanup failures as non-blocking and reports a warning", async () => {
    const repoPath = await createTempDir("pairflow-delete-finalization-repo-");
    const bubbleDir = join(repoPath, ".pairflow", "bubbles", "b_delete_finalization_warn_01");
    await mkdir(bubbleDir, { recursive: true });

    let stagedBubbleDir: string | null = null;
    const reportWarning = vi.fn();
    const removeDirectory = vi.fn(async (path: string) => {
      if (path.includes(".remote-archive-")) {
        throw new Error("staging cleanup denied");
      }
      await rm(path, {
        recursive: true,
        force: true
      });
    });

    await expect(
      createDeleteArchive({
        input: {
          bubbleId: "b_delete_finalization_warn_01",
          cwd: repoPath,
          force: true
        },
        resolved: {
          bubbleId: "b_delete_finalization_warn_01",
          repoPath,
          bubbleConfig: {
            bubble_instance_id: "bi_00m8f7w14k_warn",
            bubble_branch: "pairflow/bubble/b_delete_finalization_warn_01"
          },
          bubblePaths: {
            bubbleDir,
            bubbleTomlPath: join(bubbleDir, "bubble.toml"),
            locksDir: join(repoPath, ".pairflow", "locks"),
            worktreePath: repoPath,
            sessionsPath: join(repoPath, ".pairflow", "sessions.json"),
            statePath: join(bubbleDir, "state.json")
          }
        } as never,
        execution: {
          bubbleInstanceId: "bi_00m8f7w14k_warn",
          metricsRound: null,
          requiresPreDeleteStop: false
        },
        dependencies: {
          createArchiveSnapshot: vi.fn(async (input: { bubbleDir: string; }) => {
            stagedBubbleDir = input.bubbleDir;
            return {
              archivePath: "/tmp/archive-path",
              manifest: {
                schema_version: 1,
                archived_at: "2026-04-18T00:00:00.000Z",
                repo_path: repoPath,
                repo_key: "repo-key",
                bubble_instance_id: "bi_00m8f7w14k_warn",
                bubble_id: "b_delete_finalization_warn_01",
                source_bubble_dir:
                  "/srv/pairflow/repo--b_delete_finalization_warn_01/.pairflow/bubbles/b_delete_finalization_warn_01",
                archived_files: []
              } satisfies ArchiveManifest,
              reusedExisting: false
            };
          }),
          upsertDeletedArchiveIndexEntry: vi.fn(async () => ({
            indexPath: "/tmp/index.json",
            entry: {
              bubble_instance_id: "bi_00m8f7w14k_warn",
              bubble_id: "b_delete_finalization_warn_01",
              repo_path: repoPath,
              repo_key: "repo-key",
              archive_path: "/tmp/archive-path",
              status: "deleted",
              created_at: null,
              deleted_at: "2026-04-18T00:00:00.000Z",
              purged_at: null,
              updated_at: "2026-04-18T00:00:00.000Z"
            }
          })),
          archiveLocksDir: join(repoPath, ".pairflow", "locks")
        } as never,
        remoteArchiveCapture: {
          sourceBubbleDir:
            "/srv/pairflow/repo--b_delete_finalization_warn_01/.pairflow/bubbles/b_delete_finalization_warn_01",
          bubbleToml: "id = 'b_delete_finalization_warn_01'\n",
          stateJson: "{\"bubble_id\":\"b_delete_finalization_warn_01\",\"state\":\"DONE\"}\n",
          transcriptNdjson: "{\"id\":\"msg_remote_delete_warn_01\"}\n",
          inboxNdjson: ""
        },
        now: new Date("2026-04-18T00:00:00.000Z"),
        inferCreatedAtFromBubbleInstanceId: () => null,
        reportWarning,
        removeDirectory: removeDirectory as never,
        toDeleteStepError: ({ error }) => error as Error
      })
    ).resolves.toBeUndefined();

    expect(stagedBubbleDir).not.toBeNull();
    expect(reportWarning).toHaveBeenCalledWith(
      expect.stringContaining(
        "failed archive finalization cleanup for remote archive staging directory on bubble b_delete_finalization_warn_01"
      )
    );
  });
});
