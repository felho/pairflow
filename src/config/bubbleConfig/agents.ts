import type { BubbleConfig } from "../../v11/shared/config/bubbleConfigTypes.js";
import {
  isAgentName
} from "../../v11/domain/agentIdentity/agentIdentity.js";
import type { ValidationError } from "../../v11/shared/validation/primitives.js";
import { readString } from "./readers.js";

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

  return {
    implementer: implementer as "codex" | "claude",
    reviewer: reviewer as "codex" | "claude",
    meta_reviewer: metaReviewer as "codex" | "claude"
  };
}
