import { isValidationCommandId } from "../../../shared/validation/validationCommandId.js";
import type { BubbleConfig } from "../../../../types/bubble.js";

export interface MetaReviewApproveValidationCommandSpec {
  kind: string;
  command: string;
  targetId?: string;
  cwd?: string;
  targetPaths?: string[];
}

export type MetaReviewApproveValidationPolicyState =
  | "policy_missing"
  | "policy_configured"
  | "policy_explicit_null";

export interface ResolvedMetaReviewApproveValidationPolicy {
  policyState: MetaReviewApproveValidationPolicyState;
  commands: MetaReviewApproveValidationCommandSpec[];
  requiredCommandSetId: string | null;
  invalidReason?: string;
}

function normalizeCommand(command: string | undefined): string | undefined {
  if (command === undefined) {
    return undefined;
  }
  const normalized = command.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function resolveMetaReviewApproveValidationPolicy(
  bubbleConfig: Partial<
    Pick<BubbleConfig, "commands" | "review_artifact_type" | "validation_target">
  >
): ResolvedMetaReviewApproveValidationPolicy {
  if (bubbleConfig.review_artifact_type === "document") {
    return {
      policyState: "policy_explicit_null",
      commands: [],
      requiredCommandSetId: "docs-only"
    };
  }

  const required = bubbleConfig.commands?.meta_review_approve_required;

  if (required === undefined) {
    return {
      policyState: "policy_missing",
      commands: [],
      requiredCommandSetId: null
    };
  }

  if (required.length === 0) {
    return {
      policyState: "policy_explicit_null",
      commands: [],
      requiredCommandSetId: "explicit-null"
    };
  }

  const resolvedCommands: MetaReviewApproveValidationCommandSpec[] = [];
  const orderedRequiredIds: string[] = [];
  const seenRequiredIds = new Set<string>();
  for (const rawId of required) {
    if (!isValidationCommandId(rawId)) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: required.join("__"),
        invalidReason:
          `commands.meta_review_approve_required references unsupported id '${rawId}'.`
      };
    }
    if (seenRequiredIds.has(rawId)) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: required.join("__"),
        invalidReason:
          `commands.meta_review_approve_required contains duplicate id '${rawId}'.`
      };
    }

    const commandCandidate = bubbleConfig.commands?.[rawId];
    if (typeof commandCandidate !== "string") {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: required.join("__"),
        invalidReason:
          `commands.${rawId} must be a string for configured meta-review approve validation.`
      };
    }

    const resolvedCommand = normalizeCommand(commandCandidate);
    if (resolvedCommand === undefined) {
      return {
        policyState: "policy_configured",
        commands: [],
        requiredCommandSetId: required.join("__"),
        invalidReason:
          `commands.${rawId} is empty for configured meta-review approve validation.`
      };
    }

    seenRequiredIds.add(rawId);
    orderedRequiredIds.push(rawId);
    resolvedCommands.push({
      kind: rawId,
      command: resolvedCommand,
      ...(bubbleConfig.validation_target !== undefined
        ? { targetId: bubbleConfig.validation_target.id }
        : {}),
      ...(bubbleConfig.validation_target?.cwd !== undefined
        ? { cwd: bubbleConfig.validation_target.cwd }
        : {}),
      ...(bubbleConfig.validation_target?.paths !== undefined
        ? { targetPaths: [...bubbleConfig.validation_target.paths] }
        : {})
    });
  }

  return {
    policyState: "policy_configured",
    commands: resolvedCommands,
    requiredCommandSetId: orderedRequiredIds.join("__")
  };
}
