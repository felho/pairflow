import type { RepoValidationConfig } from "../../../../../config/repoConfig.js";
import {
  describeValidationCommandIdRule,
  isValidationCommandId
} from "../../../../shared/validation/validationCommandId.js";
import {
  resolveValidationTargetCwd
} from "../../../../shared/validation/validationTargetPaths.js";

const explicitValidationCommandIds = [
  "lint",
  "test",
  "typecheck",
  "bootstrap"
] as const;

type ExplicitValidationCommandId =
  (typeof explicitValidationCommandIds)[number];

export interface ResolveRepoValidationProfileCommandsInput {
  explicitCommands: Partial<Record<ExplicitValidationCommandId, string>>;
  repoValidation?: RepoValidationConfig;
  validationTarget?: string;
  worktreePath?: string;
  allowMissingWorktreePath?: boolean;
  legacyDefaults: {
    test: string;
    typecheck: string;
  };
}

export interface ResolvedRepoValidationProfileCommands {
  commands: Record<string, string>;
  validationRequired?: string[];
  validationRequiredExplicit?: true;
  metaReviewApproveRequired?: string[];
  validationTarget?: {
    id: string;
    cwd?: string;
    paths?: string[];
  };
}

function normalizeCommand(command: string | undefined): string | undefined {
  if (command === undefined) {
    return undefined;
  }
  const normalized = command.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function assertValidCommandId(id: string): void {
  if (!isValidationCommandId(id)) {
    throw new Error(
      `VALIDATION_COMMAND_ID_INVALID: Invalid validation command id "${id}". ${describeValidationCommandIdRule()} context: command_id=${id}.`
    );
  }
}

function assertNoDuplicateRequired(input: {
  duplicateReasonCode:
    | "VALIDATION_REQUIRED_DUPLICATE"
    | "VALIDATION_META_REVIEW_APPROVE_REQUIRED_DUPLICATE";
  fieldName: "validation.required" | "validation.meta_review_approve_required";
  required: readonly string[];
}): void {
  const seen = new Set<string>();
  for (const id of input.required) {
    if (seen.has(id)) {
      // VALIDATION_REQUIRED_DUPLICATE / VALIDATION_META_REVIEW_APPROVE_REQUIRED_DUPLICATE
      throw new Error(
        `${input.duplicateReasonCode}: Duplicate ${input.fieldName} id "${id}". context: command_id=${id}.`
      );
    }
    seen.add(id);
  }
}

function assertRequiredCommandsResolved(input: {
  fieldName: "validation.required" | "validation.meta_review_approve_required";
  unresolvedReasonCode:
    | "VALIDATION_REQUIRED_COMMAND_UNRESOLVED"
    | "VALIDATION_META_REVIEW_APPROVE_REQUIRED_COMMAND_UNRESOLVED";
  required: readonly string[];
  commands: Record<string, string>;
}): void {
  assertNoDuplicateRequired({
    duplicateReasonCode:
      input.fieldName === "validation.required"
        ? "VALIDATION_REQUIRED_DUPLICATE"
        : "VALIDATION_META_REVIEW_APPROVE_REQUIRED_DUPLICATE",
    fieldName: input.fieldName,
    required: input.required
  });
  for (const id of input.required) {
    assertValidCommandId(id);
    if (normalizeCommand(input.commands[id]) === undefined) {
      // VALIDATION_REQUIRED_COMMAND_UNRESOLVED / VALIDATION_META_REVIEW_APPROVE_REQUIRED_COMMAND_UNRESOLVED
      throw new Error(
        `${input.unresolvedReasonCode}: ${input.fieldName} references "${id}", but no command was resolved for that id. context: command_id=${id}.`
      );
    }
  }
}

function resolveSelectedValidationTarget(
  input: ResolveRepoValidationProfileCommandsInput
): { id: string; target: NonNullable<RepoValidationConfig["targets"]>[string] } | undefined {
  const targets = input.repoValidation?.targets;
  const requestedTarget = input.validationTarget?.trim();
  if (requestedTarget !== undefined && requestedTarget.length > 0) {
    if (targets === undefined || Object.keys(targets).length === 0) {
      throw new Error(
        `VALIDATION_TARGETS_NOT_CONFIGURED: --validation-target was provided but validation.targets is not configured. context: validation_target=${requestedTarget}.`
      );
    }
    const target = targets[requestedTarget];
    if (target === undefined) {
      throw new Error(
        `VALIDATION_TARGET_UNKNOWN: validation target "${requestedTarget}" is not configured. context: validation_target=${requestedTarget}.`
      );
    }
    return { id: requestedTarget, target };
  }

  if (targets === undefined || Object.keys(targets).length === 0) {
    return undefined;
  }

  const defaultTargets = Object.entries(targets).filter(
    ([, target]) => target.default === true
  );
  if (defaultTargets.length === 1) {
    const [id, target] = defaultTargets[0] as [
      string,
      NonNullable<RepoValidationConfig["targets"]>[string]
    ];
    return { id, target };
  }

  if (Object.keys(targets).length === 1) {
    throw new Error(
      `VALIDATION_TARGET_DEFAULT_MISSING: validation targets are configured but the only target is not default and no explicit target was selected. context: target_count=1.`
    );
  }

  throw new Error(
    `VALIDATION_TARGET_AMBIGUOUS: validation targets are configured but no explicit target or unique default target was selected. context: target_count=${Object.keys(targets).length}.`
  );
}

function assertValidationTargetCwdInsideWorktree(input: {
  worktreePath?: string;
  cwd?: string;
  allowMissingWorktreePath?: boolean;
}): void {
  if (input.cwd === undefined) {
    return;
  }
  if (input.worktreePath === undefined) {
    throw new Error(
      `VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE: validation target cwd requires a worktree path for containment validation. context: cwd=${input.cwd}.`
    );
  }
  resolveValidationTargetCwd({
    worktreePath: input.worktreePath,
    cwd: input.cwd,
    ...(input.allowMissingWorktreePath === true
      ? { allowMissingWorktreePath: true }
      : {})
  });
}

function applyExplicitValidationCommands(input: {
  commands: Record<string, string>;
  explicitCommands: Partial<Record<ExplicitValidationCommandId, string>>;
}): void {
  for (const id of explicitValidationCommandIds) {
    const normalized = normalizeCommand(input.explicitCommands[id]);
    if (normalized !== undefined) {
      input.commands[id] = normalized;
    }
  }
}

function resolveTargetValidationResult(input: {
  selectedTarget: NonNullable<ReturnType<typeof resolveSelectedValidationTarget>>;
  commands: Record<string, string>;
  worktreePath?: string;
  allowMissingWorktreePath?: boolean;
}): ResolvedRepoValidationProfileCommands {
  const targetRequired = input.selectedTarget.target.required;
  assertNoDuplicateRequired({
    duplicateReasonCode: "VALIDATION_REQUIRED_DUPLICATE",
    fieldName: "validation.required",
    required: targetRequired
  });
  for (const id of targetRequired) {
    assertValidCommandId(id);
    if (normalizeCommand(input.commands[id]) === undefined) {
      throw new Error(
        `VALIDATION_TARGET_REQUIRED_COMMAND_UNRESOLVED: validation target "${input.selectedTarget.id}" required command "${id}" could not be resolved. context: validation_target=${input.selectedTarget.id} command_id=${id}.`
      );
    }
  }
  assertValidationTargetCwdInsideWorktree({
    ...(input.worktreePath !== undefined
      ? { worktreePath: input.worktreePath }
      : {}),
    ...(input.allowMissingWorktreePath === true
      ? { allowMissingWorktreePath: true }
      : {}),
    ...(input.selectedTarget.target.cwd !== undefined
      ? { cwd: input.selectedTarget.target.cwd }
      : {})
  });
  return {
    commands: input.commands,
    validationRequired: [...targetRequired],
    ...(targetRequired.length === 0 ? { validationRequiredExplicit: true } : {}),
    validationTarget: {
      id: input.selectedTarget.id,
      ...(input.selectedTarget.target.cwd !== undefined
        ? { cwd: input.selectedTarget.target.cwd }
        : {}),
      ...(input.selectedTarget.target.paths !== undefined
        ? { paths: [...input.selectedTarget.target.paths] }
        : {})
    }
  };
}

export function resolveRepoValidationProfileCommands(
  input: ResolveRepoValidationProfileCommandsInput
): ResolvedRepoValidationProfileCommands {
  const selectedTarget = resolveSelectedValidationTarget(input);
  const commands: Record<string, string> = {
    test: input.legacyDefaults.test,
    typecheck: input.legacyDefaults.typecheck
  };

  for (const [id, command] of Object.entries(input.repoValidation?.commands ?? {})) {
    assertValidCommandId(id);
    const normalized = normalizeCommand(command);
    if (normalized === undefined) {
      throw new Error(
        `VALIDATION_COMMAND_EMPTY: validation.commands.${id} must be a non-empty string. context: command_id=${id}.`
      );
    }
    commands[id] = normalized;
  }

  if (selectedTarget !== undefined) {
    for (const [id, command] of Object.entries(selectedTarget.target.commands)) {
      assertValidCommandId(id);
      const normalized = normalizeCommand(command);
      if (normalized === undefined) {
        throw new Error(
          `VALIDATION_TARGET_COMMAND_EMPTY: validation.targets.${selectedTarget.id}.commands.${id} must be a non-empty string. context: validation_target=${selectedTarget.id} command_id=${id}.`
        );
      }
      commands[id] = normalized;
    }
  }

  applyExplicitValidationCommands({
    commands,
    explicitCommands: input.explicitCommands
  });

  const required = input.repoValidation?.required;
  if (selectedTarget !== undefined) {
    const result = resolveTargetValidationResult({
      selectedTarget,
      commands,
      ...(input.worktreePath !== undefined
        ? { worktreePath: input.worktreePath }
        : {}),
      ...(input.allowMissingWorktreePath === true
        ? { allowMissingWorktreePath: true }
        : {}),
    });
    const metaReviewApproveRequired =
      input.repoValidation?.meta_review_approve_required;
    if (metaReviewApproveRequired !== undefined) {
      assertRequiredCommandsResolved({
        fieldName: "validation.meta_review_approve_required",
        unresolvedReasonCode:
          "VALIDATION_META_REVIEW_APPROVE_REQUIRED_COMMAND_UNRESOLVED",
        required: metaReviewApproveRequired,
        commands
      });
      return {
        ...result,
        metaReviewApproveRequired: [...metaReviewApproveRequired]
      };
    }
    return result;
  }

  const metaReviewApproveRequired =
    input.repoValidation?.meta_review_approve_required;
  if (metaReviewApproveRequired !== undefined) {
    assertRequiredCommandsResolved({
      fieldName: "validation.meta_review_approve_required",
      unresolvedReasonCode:
        "VALIDATION_META_REVIEW_APPROVE_REQUIRED_COMMAND_UNRESOLVED",
      required: metaReviewApproveRequired,
      commands
    });
  }

  if (required === undefined) {
    return {
      commands,
      ...(metaReviewApproveRequired !== undefined
        ? { metaReviewApproveRequired: [...metaReviewApproveRequired] }
        : {})
    };
  }
  assertRequiredCommandsResolved({
    fieldName: "validation.required",
    unresolvedReasonCode: "VALIDATION_REQUIRED_COMMAND_UNRESOLVED",
    required,
    commands
  });

  return {
    commands,
    validationRequired: [...required],
    ...(required.length === 0 ? { validationRequiredExplicit: true } : {}),
    ...(metaReviewApproveRequired !== undefined
      ? { metaReviewApproveRequired: [...metaReviewApproveRequired] }
      : {})
  };
}
