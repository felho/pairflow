import type { RepoValidationConfig } from "../../../config/repoConfig.js";
import {
  describeValidationCommandIdRule,
  isValidationCommandId
} from "../../shared/validation/validationCommandId.js";

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
  legacyDefaults: {
    test: string;
    typecheck: string;
  };
}

export interface ResolvedRepoValidationProfileCommands {
  commands: Record<string, string>;
  validationRequired?: string[];
  validationRequiredExplicit?: true;
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

export function resolveRepoValidationProfileCommands(
  input: ResolveRepoValidationProfileCommandsInput
): ResolvedRepoValidationProfileCommands {
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

  for (const id of explicitValidationCommandIds) {
    const normalized = normalizeCommand(input.explicitCommands[id]);
    if (normalized !== undefined) {
      commands[id] = normalized;
    }
  }

  const required = input.repoValidation?.required;
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
