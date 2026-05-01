import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  parseBubbleConfigToml,
  REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID,
  renderBubbleConfigToml
} from "../../../../config/bubbleConfig.js";
import type { BubbleConfig } from "../../../../types/bubble.js";
import {
  REVIEW_POLICY_PATCH_INVALID,
  REVIEW_POLICY_WRITE_CONFLICT,
  type BubbleReviewPolicyPatch
} from "../../../shared/reviewPolicy/updateBubbleReviewPolicy.js";
import { normalizeBubbleReviewPolicy } from "../../../shared/reviewPolicy/reviewPolicyRuntime.js";

export interface UpdateBubbleReviewPolicyInput {
  bubbleTomlPath: string;
  patch: BubbleReviewPolicyPatch;
  expectedContent?: string;
  readFile?: (path: string, encoding: "utf8") => Promise<string>;
  writeFile?: (
    path: string,
    content: string,
    encoding: "utf8"
  ) => Promise<void>;
  rename?: (fromPath: string, toPath: string) => Promise<void>;
  removeFile?: (path: string) => Promise<void>;
  randomUuid?: () => string;
}

export interface WriteBubbleTomlAtomicallyInput {
  bubbleTomlPath: string;
  nextBubbleToml: string;
  writeFile?: (
    path: string,
    content: string,
    encoding: "utf8"
  ) => Promise<void>;
  rename?: (fromPath: string, toPath: string) => Promise<void>;
  removeFile?: (path: string) => Promise<void>;
  randomUuid?: () => string;
}

export type UpdateBubbleReviewPolicyResult =
  | {
      kind: "success";
      previousConfig: BubbleConfig;
      nextConfig: BubbleConfig;
      previousBubbleToml: string;
      nextBubbleToml: string;
    }
  | {
      kind: "conflict";
      reasonCode: typeof REVIEW_POLICY_WRITE_CONFLICT;
      currentBubbleToml: string;
      currentConfig: BubbleConfig;
    };

export async function writeBubbleTomlAtomically(
  input: WriteBubbleTomlAtomicallyInput
): Promise<void> {
  const writeFileFn = input.writeFile ?? writeFile;
  const renameFn = input.rename ?? rename;
  const removeFileFn =
    input.removeFile
    ?? ((path: string) => rm(path, { force: true }));
  const randomUuidFn = input.randomUuid ?? randomUUID;
  const tempPath = join(
    dirname(input.bubbleTomlPath),
    `.tmp-review-policy-${randomUuidFn()}.bubble.toml`
  );

  try {
    await writeFileFn(tempPath, input.nextBubbleToml, "utf8");
    await renameFn(tempPath, input.bubbleTomlPath);
  } catch (error) {
    await removeFileFn(tempPath).catch(() => undefined);
    throw error;
  }
}

export async function updateBubbleReviewPolicy(
  input: UpdateBubbleReviewPolicyInput
): Promise<UpdateBubbleReviewPolicyResult> {
  const readFileFn = input.readFile ?? readFile;
  const previousBubbleToml = await readFileFn(input.bubbleTomlPath, "utf8");

  if (
    input.expectedContent !== undefined
    && previousBubbleToml !== input.expectedContent
  ) {
    return {
      kind: "conflict",
      reasonCode: REVIEW_POLICY_WRITE_CONFLICT,
      currentBubbleToml: previousBubbleToml,
      currentConfig: parseBubbleConfigToml(previousBubbleToml)
    };
  }

  const previousConfig = parseBubbleConfigToml(previousBubbleToml);
  const currentPolicy = normalizeBubbleReviewPolicy(previousConfig);
  const currentStoredPolicy = previousConfig.review_policy;
  const patchedConsecutiveCleanRunsRequired =
    input.patch.meta_review_consecutive_clean_runs_required;
  if (
    patchedConsecutiveCleanRunsRequired !== undefined
    && (
      !Number.isInteger(patchedConsecutiveCleanRunsRequired)
      || patchedConsecutiveCleanRunsRequired < 1
    )
  ) {
    throw new Error(
      `${REVIEW_POLICY_PATCH_INVALID}: review_policy.meta_review_consecutive_clean_runs_required: ${REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID}: Must be an integer >= 1; context=${JSON.stringify({ bubbleTomlPath: input.bubbleTomlPath })}`
    );
  }

  const nextReviewPolicy: BubbleConfig["review_policy"] = {
    review_loop_mode:
      input.patch.review_loop_mode ?? currentPolicy.review_loop_mode,
    reviewer_blocking_min_severity:
      input.patch.reviewer_blocking_min_severity
      ?? currentPolicy.reviewer_blocking_min_severity,
    meta_review_auto_rework_min_severity:
      input.patch.meta_review_auto_rework_min_severity
      ?? currentPolicy.meta_review_auto_rework_min_severity,
    ...(
      input.patch.meta_review_consecutive_clean_runs_required !== undefined
      || currentStoredPolicy?.meta_review_consecutive_clean_runs_required !== undefined
        ? {
            meta_review_consecutive_clean_runs_required:
              patchedConsecutiveCleanRunsRequired
              ?? currentPolicy.meta_review_consecutive_clean_runs_required
          }
        : {}
    )
  };
  const nextConfig: BubbleConfig = {
    ...previousConfig,
    review_policy: nextReviewPolicy
  };
  const nextBubbleToml = renderBubbleConfigToml(nextConfig);
  await writeBubbleTomlAtomically({
    bubbleTomlPath: input.bubbleTomlPath,
    nextBubbleToml,
    ...(input.writeFile !== undefined ? { writeFile: input.writeFile } : {}),
    ...(input.rename !== undefined ? { rename: input.rename } : {}),
    ...(input.removeFile !== undefined ? { removeFile: input.removeFile } : {}),
    ...(input.randomUuid !== undefined ? { randomUuid: input.randomUuid } : {})
  });

  return {
    kind: "success",
    previousConfig,
    nextConfig,
    previousBubbleToml,
    nextBubbleToml
  };
}
