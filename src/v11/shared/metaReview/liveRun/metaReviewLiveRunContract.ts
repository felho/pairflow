import type {
  BubbleStateSnapshot,
  MetaReviewRecommendation
} from "../../../../types/bubble.js";
import type {
  MetaReviewCommandDependencies as MetaReviewCommandDependenciesV11,
  MetaReviewSubmitInput as MetaReviewSubmitInputV11,
  MetaReviewSubmitResult as MetaReviewSubmitResultV11
} from "../metaReviewCommandContract.js";
import type {
  MetaReviewDepth as MetaReviewDepthV11,
  MetaReviewResult as MetaReviewResultV11,
  MetaReviewRunWarning as MetaReviewRunWarningV11
} from "../metaReviewTypes.js";
import type { MetaReviewReviewerVerdict as MetaReviewReviewerVerdictV11 } from "../../../domain/metaReview/metaReviewReviewerVerdict.js";

export interface MetaReviewLiveRunnerOutput {
  recommendation: MetaReviewRecommendation;
  summary?: string;
  rework_target_message?: string | null;
  report_json?: Record<string, unknown>;
}

export type MetaReviewDepth = MetaReviewDepthV11;
export type MetaReviewReviewerVerdict = MetaReviewReviewerVerdictV11;
export type MetaReviewResult = MetaReviewResultV11;
export type MetaReviewRunWarning = MetaReviewRunWarningV11;
export type MetaReviewSubmitResult = MetaReviewSubmitResultV11;
export type MetaReviewSubmitInput = MetaReviewSubmitInputV11;

export interface MetaReviewRunInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
  depth?: MetaReviewDepth;
}

export interface MetaReviewLiveRunnerInput {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  transcriptPath: string;
  reviewerAgent: string;
  depth: MetaReviewDepth;
  state: BubbleStateSnapshot;
  runId: string;
  now: Date;
}

export interface MetaReviewDependencies extends MetaReviewCommandDependenciesV11 {
  runLiveReview?: (
    input: MetaReviewLiveRunnerInput
  ) => Promise<MetaReviewLiveRunnerOutput>;
  removeFile?: (artifactPath: string) => Promise<void>;
  allowMetaReviewRunningState?: boolean;
}
