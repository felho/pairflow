import {
  type ReviewerFocusExtractionResult
} from "../../../../shared/reviewer/reviewerBrief.js";
import type {
  BubbleReviewAutoReworkSeverity
} from "../../../../shared/reviewPolicy/reviewPolicyTypes.js";
import type { BubbleStateSnapshot } from "../../../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../../shared/config/bubbleConfigVocabulary.js";
import { buildRolePromptConcernLines } from "../../../actorProtocol/rolePromptConcerns.js";
import { joinPromptLines } from "../../startCommandResumePromptShared.js";
export { buildResumeImplementerStartupPrompt } from "./startCommandResumeImplementerPrompt.js";

export function buildResumeMetaReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
  pairflowCommandProfile: PairflowCommandProfile;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
}): string {
  return joinPromptLines(
    buildRolePromptConcernLines({
      role: "meta_reviewer",
      phase: "resume",
      context: input
    })
  );
}

export function buildResumeReviewerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
  policySnapshotPathAbs: string;
  pairflowCommandProfile: PairflowCommandProfile;
  state: BubbleStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
  reviewArtifactType: ReviewArtifactType;
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
  reviewerTestDirectiveLine?: string;
  reviewerBriefText?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
}): string {
  return joinPromptLines(
    buildRolePromptConcernLines({
      role: "reviewer",
      phase: "resume",
      context: input
    })
  );
}

export { resolveResumeKickoffMessages } from "./startCommandResumeKickoffMessages.js";
