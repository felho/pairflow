import type { writeFile } from "node:fs/promises";

import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type { BubbleRemotePointer } from "../../../types/bubble.js";
import type { BubblePaths } from "../../shared/bubble/bubblePaths.js";
import type { AssertGitRepositoryPort } from "../../shared/ports/gitRepository.js";
import type { AppendProtocolEnvelopePort } from "../../shared/ports/transcript.js";
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
  remote?: string;
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
  writeReviewerFocusArtifact?: typeof writeFile;
  assertGitRepository?: AssertGitRepositoryPort;
  appendProtocolEnvelope?: AppendProtocolEnvelopePort;
  loadPairflowGlobalConfig?: () => Promise<PairflowGlobalConfig>;
  writeRemotePointer?: (
    path: string,
    value: BubbleRemotePointer
  ) => Promise<void>;
}

export type CreateBubbleImplementation = (
  input: BubbleCreateInput,
  dependencies?: BubbleCreateDependencies
) => Promise<BubbleCreateResult>;
