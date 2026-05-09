import type { BubbleConfig } from "../../v11/shared/config/bubbleConfigTypes.js";
import { isAgentName } from "../../contracts/kernel/agentIdentity.js";
import type { ValidationError } from "../../v11/shared/validation/primitives.js";
import { readString } from "./readers.js";

function readOptionalAgentModel(input: {
  agents: Record<string, unknown> | undefined;
  key: string;
  path: string;
  errors: ValidationError[];
}): string | undefined {
  if (input.agents === undefined) {
    return undefined;
  }

  const value = readString(
    input.agents,
    input.key,
    input.path,
    input.errors,
    false
  );
  if (value !== undefined && value.trim().length === 0) {
    input.errors.push({
      path: input.path,
      message: "Must be a non-empty string"
    });
    return undefined;
  }

  return value;
}

export function validateBubbleAgents(
  agents: Record<string, unknown> | undefined,
  errors: ValidationError[]
): BubbleConfig["agents"] {
  const implementer = agents
    ? readString(agents, "implementer", "agents.implementer", errors, true)
    : undefined;
  if (implementer !== undefined && !isAgentName(implementer)) {
    errors.push({
      path: "agents.implementer",
      message: "Must be one of: codex, claude"
    });
  }

  const reviewer = agents
    ? readString(agents, "reviewer", "agents.reviewer", errors, true)
    : undefined;
  if (reviewer !== undefined && !isAgentName(reviewer)) {
    errors.push({
      path: "agents.reviewer",
      message: "Must be one of: codex, claude"
    });
  }

  const metaReviewerCandidate = agents
    ? readString(
        agents,
        "meta_reviewer",
        "agents.meta_reviewer",
        errors,
        false
      )
    : undefined;
  // Legacy two-agent bubble.toml files normalize here so downstream runtime
  // consumers never need their own role-specific meta-reviewer fallback.
  const metaReviewer = metaReviewerCandidate ?? "codex";
  if (metaReviewerCandidate !== undefined && !isAgentName(metaReviewerCandidate)) {
    errors.push({
      path: "agents.meta_reviewer",
      message: "Must be one of: codex, claude"
    });
  }

  const implementerModel = readOptionalAgentModel({
    agents,
    key: "implementer_model",
    path: "agents.implementer_model",
    errors
  });
  const reviewerModel = readOptionalAgentModel({
    agents,
    key: "reviewer_model",
    path: "agents.reviewer_model",
    errors
  });
  const metaReviewerModel = readOptionalAgentModel({
    agents,
    key: "meta_reviewer_model",
    path: "agents.meta_reviewer_model",
    errors
  });

  return {
    implementer: implementer as "codex" | "claude",
    ...(implementerModel !== undefined ? { implementer_model: implementerModel } : {}),
    reviewer: reviewer as "codex" | "claude",
    ...(reviewerModel !== undefined ? { reviewer_model: reviewerModel } : {}),
    meta_reviewer: metaReviewer as "codex" | "claude",
    ...(metaReviewerModel !== undefined
      ? { meta_reviewer_model: metaReviewerModel }
      : {})
  };
}
