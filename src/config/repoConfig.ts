import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  SchemaValidationError,
  assertValidation,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../core/validation.js";
import {
  isGateEnforcementLevel,
  type GateEnforcementLevel
} from "../types/bubble.js";
import { parseToml } from "./bubbleConfig.js";

export interface PairflowRepoConfig {
  enforcement_mode?: {
    all_gate?: GateEnforcementLevel;
    docs_gate?: GateEnforcementLevel;
  };
}

export function resolvePairflowRepoConfigPath(repoPath: string): string {
  return join(repoPath, "pairflow.toml");
}

export function validatePairflowRepoConfig(
  input: unknown
): ValidationResult<PairflowRepoConfig> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([
      {
        path: "$",
        message: "Config must be an object"
      }
    ]);
  }

  const enforcementModeRaw = input.enforcement_mode;
  if (enforcementModeRaw === undefined) {
    return validationOk({});
  }
  if (!isRecord(enforcementModeRaw)) {
    return validationFail([
      {
        path: "enforcement_mode",
        message: "Must be an object/section"
      }
    ]);
  }

  const allGateRaw = enforcementModeRaw.all_gate;
  let validatedAllGate: GateEnforcementLevel | undefined;
  if (allGateRaw !== undefined) {
    if (isGateEnforcementLevel(allGateRaw)) {
      validatedAllGate = allGateRaw;
    } else {
      errors.push({
        path: "enforcement_mode.all_gate",
        message: "Must be one of: advisory, required"
      });
    }
  }

  const docsGateRaw = enforcementModeRaw.docs_gate;
  let validatedDocsGate: GateEnforcementLevel | undefined;
  if (docsGateRaw !== undefined) {
    if (isGateEnforcementLevel(docsGateRaw)) {
      validatedDocsGate = docsGateRaw;
    } else {
      errors.push({
        path: "enforcement_mode.docs_gate",
        message: "Must be one of: advisory, required"
      });
    }
  }

  if (
    validatedAllGate === "required"
    && validatedDocsGate !== undefined
    && validatedDocsGate !== "required"
  ) {
    errors.push({
      path: "enforcement_mode.docs_gate",
      message:
        "Cannot be advisory when enforcement_mode.all_gate is required"
    });
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({
    enforcement_mode: {
      ...(validatedAllGate !== undefined ? { all_gate: validatedAllGate } : {}),
      ...(validatedDocsGate !== undefined ? { docs_gate: validatedDocsGate } : {})
    }
  });
}

export function assertValidPairflowRepoConfig(input: unknown): PairflowRepoConfig {
  return assertValidation(validatePairflowRepoConfig(input), "Invalid Pairflow repo config");
}

export function parsePairflowRepoConfigToml(input: string): PairflowRepoConfig {
  const parsed = (() => {
    try {
      return parseToml(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SchemaValidationError("Invalid Pairflow repo config", [
        {
          path: "$",
          message: reason
        }
      ]);
    }
  })();
  return assertValidPairflowRepoConfig(parsed);
}

export async function loadPairflowRepoConfig(
  repoPath: string,
  path: string = resolvePairflowRepoConfigPath(repoPath)
): Promise<PairflowRepoConfig> {
  const raw = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (raw === undefined) {
    return {};
  }

  return parsePairflowRepoConfigToml(raw);
}
