import {
  DEFAULT_IMPLEMENTER_AGENT,
  DEFAULT_REVIEWER_AGENT
} from "../../../../../config/defaults.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";

export interface CreateBubbleAgentsConfigInput {
  implementer?: AgentName;
  implementerModel?: string;
  reviewer?: AgentName;
  reviewerModel?: string;
  metaReviewer?: AgentName;
  metaReviewerModel?: string;
}

export interface CreateBubbleAgentsConfig {
  implementer: AgentName;
  implementer_model?: string;
  reviewer: AgentName;
  reviewer_model?: string;
  meta_reviewer?: AgentName;
  meta_reviewer_model?: string;
}

export function buildCreateBubbleAgentsConfig(
  input: CreateBubbleAgentsConfigInput
): CreateBubbleAgentsConfig {
  return {
    implementer: input.implementer ?? DEFAULT_IMPLEMENTER_AGENT,
    ...(input.implementerModel !== undefined
      ? { implementer_model: input.implementerModel }
      : {}),
    reviewer: input.reviewer ?? DEFAULT_REVIEWER_AGENT,
    ...(input.reviewerModel !== undefined
      ? { reviewer_model: input.reviewerModel }
      : {}),
    ...(input.metaReviewer !== undefined
      ? { meta_reviewer: input.metaReviewer }
      : {}),
    ...(input.metaReviewerModel !== undefined
      ? { meta_reviewer_model: input.metaReviewerModel }
      : {})
  };
}
