import type { RepoDefaultsConfig } from "../../../../../config/repoConfig.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleCreateInput } from "./createCommandContract.js";
import { toBubbleCreateError } from "./createCommandRuntime.js";

export function resolveBaseBranch(input: {
  command: BubbleCreateInput;
  repoDefaults?: RepoDefaultsConfig;
}): string {
  if (input.command.baseBranch !== undefined) {
    const explicitBaseBranch = input.command.baseBranch.trim();
    if (explicitBaseBranch.length === 0) {
      throw toBubbleCreateError({
        message: "Base branch cannot be empty.",
        context: {
          command_name: "create",
          bubble_id: input.command.id,
          base_branch: input.command.baseBranch
        }
      });
    }
    return explicitBaseBranch;
  }

  const defaultBaseBranch = input.repoDefaults?.base_branch;
  if (defaultBaseBranch !== undefined) {
    return defaultBaseBranch;
  }

  throw toBubbleCreateError({
    message:
      "Missing base branch. Provide --base <branch> or configure [defaults].base_branch in pairflow.toml.",
    context: {
      command_name: "create",
      bubble_id: input.command.id
    }
  });
}

function hasReviewPolicyDefaults(repoDefaults: RepoDefaultsConfig): boolean {
  return Object.keys(repoDefaults.review_policy ?? {}).length > 0;
}

function resolveReviewPolicy(input: {
  command: BubbleCreateInput;
  repoDefaults: RepoDefaultsConfig;
}): Pick<BubbleCreateInput, "reviewPolicy"> {
  const commandPolicy = input.command.reviewPolicy;
  const defaultPolicy = input.repoDefaults.review_policy;
  if (commandPolicy === undefined && !hasReviewPolicyDefaults(input.repoDefaults)) {
    return {};
  }

  const reviewPolicy = {
    ...(defaultPolicy?.review_loop_mode !== undefined
      ? { review_loop_mode: defaultPolicy.review_loop_mode }
      : {}),
    ...(defaultPolicy?.reviewer_blocking_min_severity !== undefined
      ? {
          reviewer_blocking_min_severity:
            defaultPolicy.reviewer_blocking_min_severity
        }
      : {}),
    ...(defaultPolicy?.meta_review_auto_rework_min_severity !== undefined
      ? {
          meta_review_auto_rework_min_severity:
            defaultPolicy.meta_review_auto_rework_min_severity
        }
      : {}),
    ...(defaultPolicy?.meta_review_consecutive_clean_runs_required !== undefined
      ? {
          meta_review_consecutive_clean_runs_required:
            defaultPolicy.meta_review_consecutive_clean_runs_required
        }
      : {}),
    ...(commandPolicy?.review_loop_mode !== undefined
      ? { review_loop_mode: commandPolicy.review_loop_mode }
      : {}),
    ...(commandPolicy?.reviewer_blocking_min_severity !== undefined
      ? {
          reviewer_blocking_min_severity:
            commandPolicy.reviewer_blocking_min_severity
        }
      : {}),
    ...(commandPolicy?.meta_review_auto_rework_min_severity !== undefined
      ? {
          meta_review_auto_rework_min_severity:
            commandPolicy.meta_review_auto_rework_min_severity
        }
      : {}),
    ...(commandPolicy?.meta_review_consecutive_clean_runs_required !== undefined
      ? {
          meta_review_consecutive_clean_runs_required:
            commandPolicy.meta_review_consecutive_clean_runs_required
        }
      : {})
  };

  return Object.keys(reviewPolicy).length > 0 ? { reviewPolicy } : {};
}

function resolveDocContractGates(input: {
  command: BubbleCreateInput;
  repoDefaults: RepoDefaultsConfig;
}): Pick<BubbleCreateInput, "docContractGates"> {
  const roundGateAppliesAfter =
    input.command.docContractGates?.round_gate_applies_after ??
    input.repoDefaults.doc_contract_gates?.round_gate_applies_after;
  if (roundGateAppliesAfter === undefined) {
    return {};
  }
  return {
    docContractGates: {
      round_gate_applies_after: roundGateAppliesAfter
    }
  };
}

function pickResolvedAgent(input: {
  explicit: AgentName | undefined;
  repoDefault: AgentName | undefined;
}): AgentName | undefined {
  return input.explicit ?? input.repoDefault;
}

function pickResolvedNumber(input: {
  explicit: number | undefined;
  repoDefault: number | undefined;
}): number | undefined {
  return input.explicit ?? input.repoDefault;
}

function pickResolvedString<T extends string>(input: {
  explicit: T | undefined;
  repoDefault: T | undefined;
}): T | undefined {
  return input.explicit ?? input.repoDefault;
}

export function resolveRepoDefaultedCreateInput(input: {
  command: BubbleCreateInput;
  repoDefaults?: RepoDefaultsConfig;
  baseBranch: string;
}): BubbleCreateInput {
  const defaults = input.repoDefaults;
  if (defaults === undefined) {
    return {
      ...input.command,
      baseBranch: input.baseBranch
    };
  }

  const implementer = pickResolvedAgent({
    explicit: input.command.implementer,
    repoDefault: defaults.agents?.implementer
  });
  const implementerModel = pickResolvedString({
    explicit: input.command.implementerModel,
    repoDefault: defaults.agents?.implementer_model
  });
  const reviewer = pickResolvedAgent({
    explicit: input.command.reviewer,
    repoDefault: defaults.agents?.reviewer
  });
  const reviewerModel = pickResolvedString({
    explicit: input.command.reviewerModel,
    repoDefault: defaults.agents?.reviewer_model
  });
  const metaReviewer = pickResolvedAgent({
    explicit: input.command.metaReviewer,
    repoDefault: defaults.agents?.meta_reviewer
  });
  const metaReviewerModel = pickResolvedString({
    explicit: input.command.metaReviewerModel,
    repoDefault: defaults.agents?.meta_reviewer_model
  });

  const watchdogTimeoutMinutes = pickResolvedNumber({
    explicit: input.command.watchdogTimeoutMinutes,
    repoDefault: defaults.watchdog_timeout_minutes
  });
  const maxRounds = pickResolvedNumber({
    explicit: input.command.maxRounds,
    repoDefault: defaults.max_rounds
  });
  const severityGateRound = pickResolvedNumber({
    explicit: input.command.severityGateRound,
    repoDefault: defaults.severity_gate_round
  });
  const reviewerContextMode = pickResolvedString({
    explicit: input.command.reviewerContextMode,
    repoDefault: defaults.reviewer_context_mode
  });
  const pairflowCommandProfile = pickResolvedString({
    explicit: input.command.pairflowCommandProfile,
    repoDefault: defaults.pairflow_command_profile
  });

  const resolvedFields: Partial<BubbleCreateInput> = {
    baseBranch: input.baseBranch,
    ...(watchdogTimeoutMinutes !== undefined ? { watchdogTimeoutMinutes } : {}),
    ...(maxRounds !== undefined ? { maxRounds } : {}),
    ...(severityGateRound !== undefined ? { severityGateRound } : {}),
    ...(reviewerContextMode !== undefined ? { reviewerContextMode } : {}),
    ...(implementer !== undefined ? { implementer } : {}),
    ...(implementerModel !== undefined ? { implementerModel } : {}),
    ...(reviewer !== undefined ? { reviewer } : {}),
    ...(reviewerModel !== undefined ? { reviewerModel } : {}),
    ...(metaReviewer !== undefined ? { metaReviewer } : {}),
    ...(metaReviewerModel !== undefined ? { metaReviewerModel } : {}),
    ...(pairflowCommandProfile !== undefined ? { pairflowCommandProfile } : {}),
    ...resolveReviewPolicy({
      command: input.command,
      repoDefaults: defaults
    }),
    ...resolveDocContractGates({
      command: input.command,
      repoDefaults: defaults
    })
  };

  return {
    ...input.command,
    ...resolvedFields
  };
}
