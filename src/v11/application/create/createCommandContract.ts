import type { BubblePaths } from "../../infrastructure/artifact/bubble/paths.js";
import type { ReviewerFocusExtractionResult } from "../../../v11/shared/reviewer/reviewerBrief.js";
import type {
  AgentName,
  BubbleConfig,
  BubbleStateSnapshot,
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../../types/bubble.js";

export interface BubbleCreateInput {
  id: string;
  repoPath: string;
  baseBranch: string;
  reviewArtifactType: CreateReviewArtifactType;
  ideation?: boolean;
  task?: string;
  taskFile?: string;
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  accuracyCritical?: boolean;
  cwd?: string;
  now?: Date;
  implementer?: AgentName;
  reviewer?: AgentName;
  testCommand?: string;
  typecheckCommand?: string;
  bootstrapCommand?: string;
  openCommand?: string;
  pairflowCommandProfile?: PairflowCommandProfile;
}

export interface ResolvedTaskInput {
  content: string;
  source: "inline" | "file" | "ideation_placeholder";
  sourcePath?: string;
}

export interface BubbleCreateResult {
  bubbleId: string;
  paths: BubblePaths;
  config: BubbleConfig;
  state: BubbleStateSnapshot;
  task: ResolvedTaskInput;
  reviewerFocus: ReviewerFocusExtractionResult;
  reviewerFocusArtifactPersist: {
    status: "written" | "write_failed";
    artifactPath: string;
    errorCode?: string;
  };
  reviewerBrief?: ResolvedTaskInput;
}

export interface BubbleCreateDependencies {
  writeReviewerFocusArtifact?: typeof import("node:fs/promises").writeFile;
}

export type CreateBubbleImplementation = (
  input: BubbleCreateInput,
  dependencies?: BubbleCreateDependencies
) => Promise<BubbleCreateResult>;
