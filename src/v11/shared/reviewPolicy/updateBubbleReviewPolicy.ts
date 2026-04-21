import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  parseBubbleConfigToml,
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

export interface UpdateBubbleReviewPolicyInput {
  bubbleTomlPath: string;
  patch: {
    review_loop_mode?: BubbleReviewLoopMode;
    meta_review_auto_rework_min_severity?: BubbleReviewAutoReworkSeverity;
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

export async function updateBubbleReviewPolicy(
  input: UpdateBubbleReviewPolicyInput
): Promise<UpdateBubbleReviewPolicyResult> {
  const readFileFn = input.readFile ?? readFile;
  const writeFileFn = input.writeFile ?? writeFile;
  const renameFn = input.rename ?? rename;
  const removeFileFn =
    input.removeFile
    ?? ((path: string) => rm(path, { force: true }));
  const randomUuidFn = input.randomUuid ?? randomUUID;
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
  const nextConfig: BubbleConfig = {
    ...previousConfig,
    review_policy: {
      review_loop_mode:
        input.patch.review_loop_mode ?? currentPolicy.review_loop_mode,
      meta_review_auto_rework_min_severity:
        input.patch.meta_review_auto_rework_min_severity
        ?? currentPolicy.meta_review_auto_rework_min_severity
    }
  };
  const nextBubbleToml = renderBubbleConfigToml(nextConfig);
  const tempPath = join(
    dirname(input.bubbleTomlPath),
    `.tmp-review-policy-${randomUuidFn()}.bubble.toml`
  );

  try {
    await writeFileFn(tempPath, nextBubbleToml, "utf8");
    await renameFn(tempPath, input.bubbleTomlPath);
  } catch (error) {
    await removeFileFn(tempPath).catch(() => undefined);
    throw error;
  }

  return {
    kind: "success",
    previousConfig,
    nextConfig,
    previousBubbleToml,
    nextBubbleToml
  };
}
