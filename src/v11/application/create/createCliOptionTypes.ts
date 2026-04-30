import type {
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../../types/bubble.js";

export interface BubbleCreateCommandOptions {
  id?: string;
  repo?: string;
  base?: string;
  reviewArtifactType?: CreateReviewArtifactType;
  ideation?: boolean;
  task?: string;
  taskFile?: string;
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  bootstrapCommand?: string;
  validationTarget?: string;
  pairflowCommandProfile?: PairflowCommandProfile;
  accuracyCritical?: boolean;
  remote?: string;
  help: boolean;
}
