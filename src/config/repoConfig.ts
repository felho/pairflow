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
  isDocContractGateMode,
  type DocContractGateMode
} from "../types/bubble.js";
import { parseToml } from "./bubbleConfig.js";

export interface PairflowRepoConfig {
  doc_contract_gates?: {
    mode?: DocContractGateMode;
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

  const docContractGatesRaw = input.doc_contract_gates;
  if (docContractGatesRaw === undefined) {
    return validationOk({});
  }
  if (!isRecord(docContractGatesRaw)) {
    return validationFail([
      {
        path: "doc_contract_gates",
        message: "Must be an object/section"
      }
    ]);
  }

  const modeRaw = docContractGatesRaw.mode;
  let validatedMode: DocContractGateMode | undefined;
  if (modeRaw === undefined) {
    return validationOk({
      doc_contract_gates: {}
    });
  }
  if (isDocContractGateMode(modeRaw)) {
    validatedMode = modeRaw;
  } else {
    errors.push({
      path: "doc_contract_gates.mode",
      message:
        "Must be one of: advisory-for-all-gates, required-for-doc-gates, required-for-all-gates"
    });
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({
    doc_contract_gates:
      validatedMode !== undefined
        ? { mode: validatedMode }
        : {}
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
