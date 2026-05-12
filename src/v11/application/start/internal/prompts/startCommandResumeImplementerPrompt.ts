import type {
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../../shared/config/bubbleConfigVocabulary.js";
import type {
  BubbleCommandsConfig
} from "../../../../shared/command/commandConfigTypes.js";
import { joinPromptLines } from "../../../../shared/role/prompts/resumePromptShared.js";
import { buildRolePromptConcernLines } from "../../../../shared/role/prompts/rolePromptConcerns.js";
import type {
  RolePromptStateSnapshot
} from "../../../../shared/role/prompts/rolePromptConcernTypes.js";

export function buildResumeImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  state: RolePromptStateSnapshot;
  transcriptSummary: string;
  kickoffDiagnostic?: string;
  validationCommands?: BubbleCommandsConfig;
}): string {
  return joinPromptLines(
    buildRolePromptConcernLines({
      role: "implementer",
      phase: "resume",
      context: input
    })
  );
}
