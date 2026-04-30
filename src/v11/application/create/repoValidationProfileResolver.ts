import type { RepoValidationConfig } from "../../../config/repoConfig.js";
import {
  describeValidationCommandIdRule,
  isValidationCommandId
} from "../../shared/validation/validationCommandId.js";
import {
  resolveValidationTargetCwd
} from "../../shared/validation/validationTargetPaths.js";

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
      `Invalid validation command id "${id}". ${describeValidationCommandIdRule()}`
    );
  }
}

function assertNoDuplicateRequired(required: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of required) {
    if (seen.has(id)) {
      throw new Error(`Duplicate validation.required id "${id}".`);
    }
    seen.add(id);
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
        `VALIDATION_TARGETS_NOT_CONFIGURED: --validation-target was provided but validation.targets is not configured.`
      );
    }
    const target = targets[requestedTarget];
    if (target === undefined) {
      throw new Error(
        `VALIDATION_TARGET_UNKNOWN: validation target "${requestedTarget}" is not configured.`
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
      `VALIDATION_TARGET_DEFAULT_MISSING: validation targets are configured but the only target is not default and no explicit target was selected.`
    );
  }

  throw new Error(
    `VALIDATION_TARGET_AMBIGUOUS: validation targets are configured but no explicit target or unique default target was selected.`
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
      `VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE: validation target cwd requires a worktree path for containment validation.`
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
      throw new Error(`validation.commands.${id} must be a non-empty string.`);
    }
    commands[id] = normalized;
  }

  if (selectedTarget !== undefined) {
    for (const [id, command] of Object.entries(selectedTarget.target.commands)) {
      assertValidCommandId(id);
      const normalized = normalizeCommand(command);
      if (normalized === undefined) {
        throw new Error(
          `validation.targets.${selectedTarget.id}.commands.${id} must be a non-empty string.`
        );
      }
      commands[id] = normalized;
    }
  }

  for (const id of explicitValidationCommandIds) {
    const normalized = normalizeCommand(input.explicitCommands[id]);
    if (normalized !== undefined) {
      commands[id] = normalized;
    }
  }

  const required = input.repoValidation?.required;
  if (selectedTarget !== undefined) {
    const targetRequired = selectedTarget.target.required;
    assertNoDuplicateRequired(targetRequired);
    for (const id of targetRequired) {
      assertValidCommandId(id);
      if (normalizeCommand(commands[id]) === undefined) {
        throw new Error(
          `VALIDATION_TARGET_REQUIRED_COMMAND_UNRESOLVED: validation target "${selectedTarget.id}" required command "${id}" could not be resolved.`
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
      ...(selectedTarget.target.cwd !== undefined
        ? { cwd: selectedTarget.target.cwd }
        : {})
    });
    return {
      commands,
      validationRequired: [...targetRequired],
      ...(targetRequired.length === 0
        ? { validationRequiredExplicit: true }
        : {}),
      validationTarget: {
        id: selectedTarget.id,
        ...(selectedTarget.target.cwd !== undefined
          ? { cwd: selectedTarget.target.cwd }
          : {}),
        ...(selectedTarget.target.paths !== undefined
          ? { paths: [...selectedTarget.target.paths] }
          : {})
      }
    };
  }

  if (required === undefined) {
    return { commands };
  }

  assertNoDuplicateRequired(required);
  for (const id of required) {
    assertValidCommandId(id);
    if (normalizeCommand(commands[id]) === undefined) {
      throw new Error(
        `validation.required references "${id}", but no command was resolved for that id.`
      );
    }
  }

  return {
    commands,
    validationRequired: [...required],
    ...(required.length === 0 ? { validationRequiredExplicit: true } : {})
  };
}
