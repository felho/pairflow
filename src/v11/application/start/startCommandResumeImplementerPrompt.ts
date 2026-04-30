import type {
  BubbleCommandsConfig,
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../../types/bubble.js";
import { joinPromptLines } from "./startCommandResumePromptShared.js";
import { buildRolePromptConcernLines } from "../actorProtocol/roleDescriptorRegistry.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";

export function buildResumeImplementerStartupPrompt(input: {
  bubbleId: string;
  repoPath: string;
  workspacePath: string;
  taskArtifactPath: string;
  reviewArtifactType: ReviewArtifactType;
  pairflowCommandProfile: PairflowCommandProfile;
  state: BubbleStateSnapshot;
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
