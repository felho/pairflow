import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  parseBubbleConfigToml,
  REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID,
  renderBubbleConfigToml
} from "../../../config/bubbleConfig.js";
import type {
  BubbleConfig,
  BubbleReviewAutoReworkSeverity,
  BubbleReviewLoopMode
} from "../../../types/bubble.js";
import { normalizeBubbleReviewPolicy } from "./reviewPolicyRuntime.js";

export const REVIEW_POLICY_WRITE_CONFLICT =
  "REVIEW_POLICY_WRITE_CONFLICT" as const;
export const REVIEW_POLICY_PATCH_INVALID = "REVIEW_POLICY_PATCH_INVALID" as const;

export interface UpdateBubbleReviewPolicyInput {
  bubbleTomlPath: string;
  patch: {
    review_loop_mode?: BubbleReviewLoopMode;
    reviewer_blocking_min_severity?: BubbleReviewAutoReworkSeverity;
    meta_review_auto_rework_min_severity?: BubbleReviewAutoReworkSeverity;
    meta_review_consecutive_clean_runs_required?: number;
  };
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

export interface SharedUiReviewPolicyPatchInput {
  reviewLoopMode: BubbleReviewLoopMode;
  reviewBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
  metaReviewQualityPreset?: MetaReviewQualityPreset;
}

export const metaReviewQualityPresets = ["P1", "P2", "P3", "P3+1", "P3+2"] as const;
export type MetaReviewQualityPreset = (typeof metaReviewQualityPresets)[number];

export function isMetaReviewQualityPreset(
  value: unknown
): value is MetaReviewQualityPreset {
  return (
    typeof value === "string"
    && (metaReviewQualityPresets as readonly string[]).includes(value)
  );
}

export function buildSharedUiReviewPolicyPatch(
  input: SharedUiReviewPolicyPatchInput
): UpdateBubbleReviewPolicyInput["patch"] {
  if (input.metaReviewQualityPreset !== undefined) {
    const metaReviewQualityPreset: unknown = input.metaReviewQualityPreset;
    if (!isMetaReviewQualityPreset(metaReviewQualityPreset)) {
      throw new Error(
        `${REVIEW_POLICY_PATCH_INVALID}: metaReviewQualityPreset must be one of ${metaReviewQualityPresets.join(", ")}. context: meta_review_quality_preset=${String(metaReviewQualityPreset)}.`
      );
    }
    const severity =
      metaReviewQualityPreset === "P3+1" || metaReviewQualityPreset === "P3+2"
        ? "P3"
        : metaReviewQualityPreset;
    if (
      input.reviewBlockingMinSeverity !== undefined
      && input.reviewBlockingMinSeverity !== severity
    ) {
      throw new Error(
        `${REVIEW_POLICY_PATCH_INVALID}: reviewBlockingMinSeverity must match the selected metaReviewQualityPreset severity (${severity}) when both fields are provided. context: meta_review_quality_preset=${input.metaReviewQualityPreset} reviewer_blocking_min_severity=${input.reviewBlockingMinSeverity}.`
      );
    }
    return {
      review_loop_mode: input.reviewLoopMode,
      reviewer_blocking_min_severity: severity,
      meta_review_auto_rework_min_severity: severity,
      meta_review_consecutive_clean_runs_required:
        metaReviewQualityPreset === "P3+1"
          ? 2
          : metaReviewQualityPreset === "P3+2"
            ? 3
            : 1
    };
  }

  return {
    review_loop_mode: input.reviewLoopMode,
    ...(input.reviewBlockingMinSeverity !== undefined
      ? {
          reviewer_blocking_min_severity: input.reviewBlockingMinSeverity,
          meta_review_auto_rework_min_severity: input.reviewBlockingMinSeverity
        }
      : {})
  };
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
