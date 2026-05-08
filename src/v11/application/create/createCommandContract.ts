import type { writeFile } from "node:fs/promises";

import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";
import type { BubblePaths } from "../../shared/bubble/bubblePaths.js";
import type { AssertGitRepositoryPort } from "../../ports/gitRepository.js";
import type { AppendProtocolEnvelopePort } from "../../ports/transcript.js";
import type {
  ResolveDocContractGateArtifactPathPort,
  WriteDocContractGateArtifactPort
} from "../../ports/docContractGateArtifacts.js";
import type { ReviewerFocusExtractionResult } from "../../../v11/shared/reviewer/reviewerBrief.js";
import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleReviewPolicyConfig
} from "../../shared/reviewPolicy/reviewPolicyTypes.js";
import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../shared/config/bubbleConfigVocabulary.js";
import type {
  BubbleDocContractGatesConfig
} from "../../shared/gates/docContractGateConfigTypes.js";

export interface BubbleCreateInput {
  id: string;
  repoPath: string;
  baseBranch?: string;
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
  metaReviewer?: AgentName;
  watchdogTimeoutMinutes?: number;
  maxRounds?: number;
  severityGateRound?: number;
  reviewerContextMode?: BubbleConfig["reviewer_context_mode"];
  reviewPolicy?: Partial<BubbleReviewPolicyConfig>;
  docContractGates?: Partial<BubbleDocContractGatesConfig>;
  testCommand?: string;
  typecheckCommand?: string;
  bootstrapCommand?: string;
  validationTarget?: string;
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
  resolveDocContractGateArtifactPath?: ResolveDocContractGateArtifactPathPort;
  loadPairflowGlobalConfig?: () => Promise<PairflowGlobalConfig>;
  writeRemotePointer?: (
    path: string,
    value: BubbleRemotePointer
  ) => Promise<void>;
  writeDocContractGateArtifact?: WriteDocContractGateArtifactPort;
}

export type CreateBubbleImplementation = (
  input: BubbleCreateInput,
  dependencies?: BubbleCreateDependencies
) => Promise<BubbleCreateResult>;
