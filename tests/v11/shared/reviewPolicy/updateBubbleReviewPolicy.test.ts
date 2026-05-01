import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseBubbleConfigToml } from "../../../../src/config/bubbleConfig.js";
import {
  buildSharedUiReviewPolicyPatch,
  REVIEW_POLICY_PATCH_INVALID,
  REVIEW_POLICY_WRITE_CONFLICT
} from "../../../../src/v11/shared/reviewPolicy/updateBubbleReviewPolicy.js";
import {
  updateBubbleReviewPolicy
} from "../../../../src/v11/infrastructure/artifact/reviewPolicy/updateBubbleReviewPolicy.js";

const tempDirs: string[] = [];

const baseToml = `
id = "b_review_policy_update_01"
repo_path = "/tmp/repo"
base_branch = "main"
bubble_branch = "bubble/b_review_policy_update_01"

[agents]
implementer = "codex"
reviewer = "claude"

[commands]
test = "pnpm test"
typecheck = "pnpm typecheck"
`;

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

async function createBubbleTomlFixture(content = baseToml): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pairflow-review-policy-"));
  tempDirs.push(dir);
  const path = join(dir, "bubble.toml");
  await writeFile(path, content, "utf8");
  return path;
}

describe("updateBubbleReviewPolicy", () => {
  it("maps reviewBlockingMinSeverity into both persisted thresholds", () => {
    expect(
      buildSharedUiReviewPolicyPatch({
        reviewLoopMode: "meta_only",
        reviewBlockingMinSeverity: "P2"
      })
    ).toEqual({
      review_loop_mode: "meta_only",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2"
    });
  });

  it.each([
    ["P1", "P1", 1],
    ["P2", "P2", 1],
    ["P3", "P3", 1],
    ["P3+1", "P3", 2],
    ["P3+2", "P3", 3]
  ] as const)(
    "maps supported UI quality preset %s into the exact backend threshold and streak pair",
    (preset, severity, requiredCleanRuns) => {
      expect(
        buildSharedUiReviewPolicyPatch({
          reviewLoopMode: "meta_only",
          metaReviewQualityPreset: preset
        })
      ).toEqual({
        review_loop_mode: "meta_only",
        reviewer_blocking_min_severity: severity,
        meta_review_auto_rework_min_severity: severity,
        meta_review_consecutive_clean_runs_required: requiredCleanRuns
      });
    }
  );

  it("rejects unknown UI quality presets before constructing a backend patch", () => {
    expect(() =>
      buildSharedUiReviewPolicyPatch({
        reviewLoopMode: "meta_only",
        metaReviewQualityPreset: "P2+2" as never
      })
    ).toThrow(REVIEW_POLICY_PATCH_INVALID);
  });

  it("rejects mismatched explicit reviewer severity when a quality preset is also provided", () => {
    expect(() =>
      buildSharedUiReviewPolicyPatch({
        reviewLoopMode: "meta_only",
        reviewBlockingMinSeverity: "P2",
        metaReviewQualityPreset: "P3+1"
      })
    ).toThrow(REVIEW_POLICY_PATCH_INVALID);
  });

  it("omits both threshold fields when reviewBlockingMinSeverity is not provided", () => {
    expect(
      buildSharedUiReviewPolicyPatch({
        reviewLoopMode: "full"
      })
    ).toEqual({
      review_loop_mode: "full"
    });
  });

  it("updates only the review_policy block and keeps the rest of the config stable", async () => {
    const bubbleTomlPath = await createBubbleTomlFixture();
    const previousBubbleToml = await readFile(bubbleTomlPath, "utf8");

    const result = await updateBubbleReviewPolicy({
      bubbleTomlPath,
      expectedContent: previousBubbleToml,
      patch: {
        review_loop_mode: "meta_only",
        reviewer_blocking_min_severity: "P2",
        meta_review_auto_rework_min_severity: "P2",
        meta_review_consecutive_clean_runs_required: 1,
      }
    });

    expect(result.kind).toBe("success");
    if (result.kind !== "success") {
      return;
    }

    expect(result.previousConfig.id).toBe("b_review_policy_update_01");
    expect(result.nextConfig.agents).toEqual(result.previousConfig.agents);
    expect(result.nextConfig.commands).toEqual(result.previousConfig.commands);
    expect(result.nextConfig.review_policy).toEqual({
      review_loop_mode: "meta_only",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2",
      meta_review_consecutive_clean_runs_required: 1,
    });
    expect(parseBubbleConfigToml(result.nextBubbleToml).review_policy).toEqual({
      review_loop_mode: "meta_only",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P2",
      meta_review_consecutive_clean_runs_required: 1,
    });
  });

  it("returns an explicit conflict when expected content is stale", async () => {
    const bubbleTomlPath = await createBubbleTomlFixture();
    const original = await readFile(bubbleTomlPath, "utf8");
    await writeFile(
      bubbleTomlPath,
      `${original.trimEnd()}\nfitness = "pnpm fitness"\n`,
      "utf8"
    );

    const result = await updateBubbleReviewPolicy({
      bubbleTomlPath,
      expectedContent: original,
      patch: {
        reviewer_blocking_min_severity: "P3",
        meta_review_auto_rework_min_severity: "P3",
        meta_review_consecutive_clean_runs_required: 1,
      }
    });

    expect(result).toMatchObject({
      kind: "conflict",
      reasonCode: REVIEW_POLICY_WRITE_CONFLICT
    });
    expect(await readFile(bubbleTomlPath, "utf8")).toContain('fitness = "pnpm fitness"');
  });

  it("updates review policy when no expected content guard is provided", async () => {
    const bubbleTomlPath = await createBubbleTomlFixture();

    const result = await updateBubbleReviewPolicy({
      bubbleTomlPath,
      patch: {
        reviewer_blocking_min_severity: "P3",
        meta_review_auto_rework_min_severity: "P3",
        meta_review_consecutive_clean_runs_required: 1,
      }
    });

    expect(result.kind).toBe("success");
    if (result.kind !== "success") {
      return;
    }

    expect(result.nextConfig.review_policy).toEqual({
      review_loop_mode: "full",
      reviewer_blocking_min_severity: "P3",
      meta_review_auto_rework_min_severity: "P3",
      meta_review_consecutive_clean_runs_required: 1,
    });
    expect(parseBubbleConfigToml(await readFile(bubbleTomlPath, "utf8")).review_policy).toEqual({
      review_loop_mode: "full",
      reviewer_blocking_min_severity: "P3",
      meta_review_auto_rework_min_severity: "P3",
      meta_review_consecutive_clean_runs_required: 1,
    });
  });

  it("preserves the meta-review threshold when only the reviewer threshold patch is provided", async () => {
    const bubbleTomlPath = await createBubbleTomlFixture();

    await updateBubbleReviewPolicy({
      bubbleTomlPath,
      patch: {
        reviewer_blocking_min_severity: "P2",
        meta_review_auto_rework_min_severity: "P3",
        meta_review_consecutive_clean_runs_required: 1,
      }
    });

    const result = await updateBubbleReviewPolicy({
      bubbleTomlPath,
      patch: {
        reviewer_blocking_min_severity: "P1"
      }
    });

    expect(result.kind).toBe("success");
    if (result.kind !== "success") {
      return;
    }

    expect(result.nextConfig.review_policy).toEqual({
      review_loop_mode: "full",
      reviewer_blocking_min_severity: "P1",
      meta_review_auto_rework_min_severity: "P3",
      meta_review_consecutive_clean_runs_required: 1,
    });
  });

  it("preserves the reviewer threshold when only the meta-review threshold patch is provided", async () => {
    const bubbleTomlPath = await createBubbleTomlFixture();

    await updateBubbleReviewPolicy({
      bubbleTomlPath,
      patch: {
        reviewer_blocking_min_severity: "P2",
        meta_review_auto_rework_min_severity: "P3",
        meta_review_consecutive_clean_runs_required: 1,
      }
    });

    const result = await updateBubbleReviewPolicy({
      bubbleTomlPath,
      patch: {
        meta_review_auto_rework_min_severity: "P1",
        meta_review_consecutive_clean_runs_required: 1,
      }
    });

    expect(result.kind).toBe("success");
    if (result.kind !== "success") {
      return;
    }

    expect(result.nextConfig.review_policy).toEqual({
      review_loop_mode: "full",
      reviewer_blocking_min_severity: "P2",
      meta_review_auto_rework_min_severity: "P1",
      meta_review_consecutive_clean_runs_required: 1,
    });
  });

  it("rejects invalid consecutive clean-run requirement patches before writing", async () => {
    for (const value of [0, -1, 1.5]) {
      const bubbleTomlPath = await createBubbleTomlFixture();
      const originalBubbleToml = await readFile(bubbleTomlPath, "utf8");
      const writes: string[] = [];

      await expect(
        updateBubbleReviewPolicy({
          bubbleTomlPath,
          patch: {
            meta_review_consecutive_clean_runs_required: value
          },
          writeFile: async (path, content, encoding) => {
            writes.push(path);
            await writeFile(path, content, encoding);
          }
        })
      ).rejects.toThrow(
        `${REVIEW_POLICY_PATCH_INVALID}: review_policy.meta_review_consecutive_clean_runs_required: REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID: Must be an integer >= 1`
      );

      expect(writes).toEqual([]);
      expect(await readFile(bubbleTomlPath, "utf8")).toBe(originalBubbleToml);
      expect(parseBubbleConfigToml(await readFile(bubbleTomlPath, "utf8")).review_policy).toBeUndefined();
    }
  });

  it("writes bubble.toml atomically through temp-file rename", async () => {
    const bubbleTomlPath = await createBubbleTomlFixture();
    const writes: string[] = [];
    const renames: Array<{ from: string; to: string }> = [];

    const result = await updateBubbleReviewPolicy({
      bubbleTomlPath,
      patch: {
        reviewer_blocking_min_severity: "P2",
        meta_review_auto_rework_min_severity: "P2",
        meta_review_consecutive_clean_runs_required: 1,
      },
      writeFile: async (path, content, encoding) => {
        writes.push(path);
        await writeFile(path, content, encoding);
      },
      rename: async (fromPath, toPath) => {
        renames.push({ from: fromPath, to: toPath });
        await writeFile(toPath, await readFile(fromPath, "utf8"), "utf8");
      },
      removeFile: async () => undefined,
      randomUuid: () => "uuid_atomic_write_test"
    });

    expect(result.kind).toBe("success");
    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toBe(bubbleTomlPath);
    expect(renames).toEqual([
      {
        from: writes[0] as string,
        to: bubbleTomlPath
      }
    ]);
  });

  it("removes the temp file when writing fails after creating it", async () => {
    const bubbleTomlPath = await createBubbleTomlFixture();
    const removedPaths: string[] = [];

    await expect(
      updateBubbleReviewPolicy({
        bubbleTomlPath,
        patch: {
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P2",
          meta_review_consecutive_clean_runs_required: 1,
        },
        writeFile: async (path, content, encoding) => {
          await writeFile(path, content, encoding);
          throw new Error("simulated write failure");
        },
        removeFile: async (path) => {
          removedPaths.push(path);
          await rm(path, { force: true });
        },
        randomUuid: () => "uuid_write_failure_cleanup"
      })
    ).rejects.toThrow("simulated write failure");

    expect(removedPaths).toEqual([
      join(
        bubbleTomlPath.slice(0, bubbleTomlPath.lastIndexOf("/")),
        ".tmp-review-policy-uuid_write_failure_cleanup.bubble.toml"
      )
    ]);
    await expect(readFile(removedPaths[0] as string, "utf8")).rejects.toThrow();
    expect(parseBubbleConfigToml(await readFile(bubbleTomlPath, "utf8")).review_policy).toBeUndefined();
  });

  it("removes the temp file when rename fails after the temp file is written", async () => {
    const bubbleTomlPath = await createBubbleTomlFixture();
    const originalBubbleToml = await readFile(bubbleTomlPath, "utf8");
    const removedPaths: string[] = [];

    await expect(
      updateBubbleReviewPolicy({
        bubbleTomlPath,
        patch: {
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P2",
          meta_review_consecutive_clean_runs_required: 1,
        },
        rename: async () => {
          throw new Error("simulated rename failure");
        },
        removeFile: async (path) => {
          removedPaths.push(path);
          await rm(path, { force: true });
        },
        randomUuid: () => "uuid_rename_failure_cleanup"
      })
    ).rejects.toThrow("simulated rename failure");

    expect(removedPaths).toEqual([
      join(
        bubbleTomlPath.slice(0, bubbleTomlPath.lastIndexOf("/")),
        ".tmp-review-policy-uuid_rename_failure_cleanup.bubble.toml"
      )
    ]);
    await expect(readFile(removedPaths[0] as string, "utf8")).rejects.toThrow();
    expect(await readFile(bubbleTomlPath, "utf8")).toBe(originalBubbleToml);
    expect(parseBubbleConfigToml(await readFile(bubbleTomlPath, "utf8")).review_policy).toBeUndefined();
  });
});
