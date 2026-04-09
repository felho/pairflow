import { accessSync, constants, existsSync, realpathSync } from "node:fs";
import { delimiter, resolve } from "node:path";
import type { ResolvedBubbleStatusContext } from "./statusCommandTypes.js";
import type { PairflowCommandPathAssessment } from "../ports/pairflowCommand.js";

function requireWorktreePath(worktreePath: string): string {
  const trimmed = worktreePath.trim();
  if (trimmed.length === 0) {
    throw new Error(
      "PAIRFLOW_COMMAND_WORKTREE_REQUIRED: context operation_id=status_command_path worktree_path=empty."
    );
  }
  return resolve(trimmed);
}

function canonicalizeExistingPath(path: string | null): string | null {
  if (path === null || !existsSync(path)) {
    return path;
  }
  try {
    return realpathSync.native(path);
  } catch {
    return resolve(path);
  }
}

function normalizePathForComparison(path: string): string {
  const resolvedPath = resolve(path);
  return process.platform === "win32" ? resolvedPath.toLowerCase() : resolvedPath;
}

function resolveWorktreePairflowEntrypoint(worktreePath: string): string {
  return resolve(requireWorktreePath(worktreePath), "dist", "cli", "index.js");
}

function resolveFirstPathCommand(
  commandName: string,
  input: {
    pathValue?: string | undefined;
    excludedDirectories?: readonly string[] | undefined;
  } = {}
): string | null {
  const pathValue = input.pathValue ?? process.env.PATH;
  if (typeof pathValue !== "string" || pathValue.trim().length === 0) {
    return null;
  }

  const suffixes = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  const excludedDirectories = new Set(
    (input.excludedDirectories ?? []).map((segment) =>
      normalizePathForComparison(segment)
    )
  );
  const segments = pathValue.split(delimiter).filter(
    (segment) =>
      segment.length > 0 &&
      !excludedDirectories.has(normalizePathForComparison(segment))
  );

  for (const segment of segments) {
    for (const suffix of suffixes) {
      const candidate = resolve(segment, `${commandName}${suffix}`);
      if (!existsSync(candidate)) {
        continue;
      }
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }
  }

  return null;
}

function resolveExternalPairflowCommand(worktreePath?: string): string | null {
  const excludedDirectories =
    worktreePath === undefined
      ? []
      : [resolve(requireWorktreePath(worktreePath), ".pairflow", "bin")];
  return resolveFirstPathCommand("pairflow", {
    excludedDirectories
  });
}

function isExternalPairflowAvailable(worktreePath?: string): boolean {
  return resolveExternalPairflowCommand(worktreePath) !== null;
}

function isPairflowDistCliEntrypoint(path: string | null): boolean {
  if (path === null) {
    return false;
  }
  const normalized = path.replace(/\\/gu, "/");
  return normalized.endsWith("/dist/cli/index.js");
}

function resolveExternalEntrypointConsistency(input: {
  localEntrypointExists: boolean;
  canonicalLocalEntrypoint: string | null;
  canonicalActiveEntrypoint: string | null;
}): "consistent" | "inconsistent" | "unknown" {
  if (
    input.localEntrypointExists &&
    input.canonicalActiveEntrypoint !== null &&
    input.canonicalLocalEntrypoint !== null &&
    input.canonicalActiveEntrypoint === input.canonicalLocalEntrypoint
  ) {
    return "consistent";
  }

  if (
    input.localEntrypointExists &&
    input.canonicalActiveEntrypoint !== null &&
    input.canonicalLocalEntrypoint !== null &&
    isPairflowDistCliEntrypoint(input.canonicalActiveEntrypoint)
  ) {
    return "inconsistent";
  }

  return "unknown";
}

interface PairflowCommandPathResolutionContext {
  profile: PairflowCommandPathAssessment["profile"];
  localEntrypoint: string;
  activeEntrypoint: string | null;
  localEntrypointExists: boolean;
  canonicalLocalEntrypoint: string | null;
  canonicalActiveEntrypoint: string | null;
  pinnedCommand: string;
  externalPairflowAvailable: boolean;
}

function resolvePairflowCommandPathResolutionContext(input: {
  worktreePath: string;
  profile: PairflowCommandPathAssessment["profile"];
  activeEntrypoint?: string | undefined;
  localEntrypointExists?: boolean | undefined;
  externalPairflowAvailable?: boolean | undefined;
}): PairflowCommandPathResolutionContext {
  const localEntrypoint = resolveWorktreePairflowEntrypoint(input.worktreePath);
  const activeEntrypoint =
    input.activeEntrypoint === undefined || input.activeEntrypoint.trim().length === 0
      ? null
      : resolve(input.activeEntrypoint.trim());
  const localEntrypointExists =
    input.localEntrypointExists ?? existsSync(localEntrypoint);
  const canonicalLocalEntrypoint = localEntrypointExists
    ? canonicalizeExistingPath(localEntrypoint)
    : localEntrypoint;
  const canonicalActiveEntrypoint = canonicalizeExistingPath(activeEntrypoint);

  return {
    profile: input.profile,
    localEntrypoint,
    activeEntrypoint,
    localEntrypointExists,
    canonicalLocalEntrypoint,
    canonicalActiveEntrypoint,
    pinnedCommand: "pairflow",
    externalPairflowAvailable:
      input.externalPairflowAvailable ?? isExternalPairflowAvailable(input.worktreePath)
  };
}

function buildExternalPairflowCommandAssessment(
  input: PairflowCommandPathResolutionContext
): PairflowCommandPathAssessment {
  const entrypointConsistency = resolveExternalEntrypointConsistency({
    localEntrypointExists: input.localEntrypointExists,
    canonicalLocalEntrypoint: input.canonicalLocalEntrypoint,
    canonicalActiveEntrypoint: input.canonicalActiveEntrypoint
  });
  if (!input.externalPairflowAvailable) {
    const activeEntryDetail =
      input.canonicalActiveEntrypoint !== null
        ? ` Active entrypoint was resolved as ${input.activeEntrypoint}, but external profile requires PATH-resolved \`pairflow\` executable availability.`
        : "";
    return {
      status: "missing",
      reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
      profile: input.profile,
      localEntrypoint: input.localEntrypoint,
      activeEntrypoint: input.activeEntrypoint,
      localEntrypointExists: input.localEntrypointExists,
      externalPairflowAvailable: input.externalPairflowAvailable,
      pinnedCommand: input.pinnedCommand,
      entrypointConsistency,
      message:
        `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE: no PATH-resolved \`pairflow\` command available for external profile.${activeEntryDetail}`
    };
  }

  const activeEntryDetail =
    input.canonicalActiveEntrypoint !== null
      ? ` active entrypoint: ${input.activeEntrypoint}.`
      : "";
  const localEntryDetail =
    entrypointConsistency === "inconsistent"
      ? ` Worktree-local entrypoint ${input.localEntrypoint} differs from the active entrypoint, but external profile authority remains the PATH-resolved \`pairflow\` tool.`
      : "";
  return {
    status: "external",
    profile: input.profile,
    localEntrypoint: input.localEntrypoint,
    activeEntrypoint: input.activeEntrypoint,
    localEntrypointExists: input.localEntrypointExists,
    externalPairflowAvailable: input.externalPairflowAvailable,
    pinnedCommand: input.pinnedCommand,
    entrypointConsistency,
    message:
      `external Pairflow command profile active (PATH-resolved \`pairflow\` available).${activeEntryDetail}${localEntryDetail}`
  };
}

function buildSelfHostPairflowCommandAssessment(
  input: PairflowCommandPathResolutionContext
): PairflowCommandPathAssessment {
  if (
    input.localEntrypointExists &&
    input.canonicalActiveEntrypoint !== null &&
    input.canonicalActiveEntrypoint === input.canonicalLocalEntrypoint
  ) {
    return {
      status: "worktree_local",
      profile: input.profile,
      localEntrypoint: input.localEntrypoint,
      activeEntrypoint: input.activeEntrypoint,
      localEntrypointExists: input.localEntrypointExists,
      externalPairflowAvailable: input.externalPairflowAvailable,
      pinnedCommand: input.pinnedCommand,
      entrypointConsistency: "consistent",
      message: `worktree-local Pairflow entrypoint active (${input.localEntrypoint})`
    };
  }

  if (!input.localEntrypointExists) {
    return {
      status: "stale",
      reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
      profile: input.profile,
      localEntrypoint: input.localEntrypoint,
      activeEntrypoint: input.activeEntrypoint,
      localEntrypointExists: input.localEntrypointExists,
      externalPairflowAvailable: input.externalPairflowAvailable,
      pinnedCommand: input.pinnedCommand,
      entrypointConsistency:
        input.canonicalActiveEntrypoint !== null ? "inconsistent" : "unknown",
      message: `PAIRFLOW_COMMAND_PATH_STALE: worktree-local Pairflow entrypoint missing at ${input.localEntrypoint}.`
    };
  }

  if (input.canonicalActiveEntrypoint === null) {
    return {
      status: "unknown",
      reasonCode: "PAIRFLOW_COMMAND_PATH_UNRESOLVED",
      profile: input.profile,
      localEntrypoint: input.localEntrypoint,
      activeEntrypoint: input.activeEntrypoint,
      localEntrypointExists: input.localEntrypointExists,
      externalPairflowAvailable: input.externalPairflowAvailable,
      pinnedCommand: input.pinnedCommand,
      entrypointConsistency: "unknown",
      message:
        "PAIRFLOW_COMMAND_PATH_UNRESOLVED: active Pairflow entrypoint could not be resolved under self_host profile."
    };
  }

  return {
    status: "stale",
    reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
    profile: input.profile,
    localEntrypoint: input.localEntrypoint,
    activeEntrypoint: input.activeEntrypoint,
    localEntrypointExists: input.localEntrypointExists,
    externalPairflowAvailable: input.externalPairflowAvailable,
    pinnedCommand: input.pinnedCommand,
    entrypointConsistency: "inconsistent",
    message:
      `PAIRFLOW_COMMAND_PATH_STALE: active Pairflow entrypoint ${input.activeEntrypoint ?? "unknown"} does not match worktree-local ${input.localEntrypoint}.`
  };
}

function assessPairflowCommandPath(input: {
  worktreePath: string;
  profile?: PairflowCommandPathAssessment["profile"] | undefined;
  activeEntrypoint?: string | undefined;
  localEntrypointExists?: boolean | undefined;
  externalPairflowAvailable?: boolean | undefined;
}): PairflowCommandPathAssessment {
  const profile = input.profile ?? "external";
  const context = resolvePairflowCommandPathResolutionContext({
    worktreePath: input.worktreePath,
    profile,
    activeEntrypoint: input.activeEntrypoint,
    localEntrypointExists: input.localEntrypointExists,
    externalPairflowAvailable: input.externalPairflowAvailable
  });

  return profile === "external"
    ? buildExternalPairflowCommandAssessment(context)
    : buildSelfHostPairflowCommandAssessment(context);
}

export function toStatusCommandPathView(
  resolved: ResolvedBubbleStatusContext
): {
  status: "worktree_local" | "external" | "stale" | "missing" | "unknown";
  reasonCode?:
    | "PAIRFLOW_COMMAND_PATH_STALE"
    | "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    | "PAIRFLOW_COMMAND_PATH_UNRESOLVED";
  profile: "external" | "self_host";
  localEntrypoint: string;
  activeEntrypoint: string | null;
  message: string;
  pinnedCommand: string;
} {
  const commandPath = assessPairflowCommandPath({
    worktreePath: resolved.bubblePaths.worktreePath,
    profile: resolved.bubbleConfig.pairflow_command_profile,
    activeEntrypoint: process.argv[1]
  });
  return {
    status: commandPath.status,
    ...(commandPath.reasonCode !== undefined
      ? { reasonCode: commandPath.reasonCode }
      : {}),
    profile: commandPath.profile,
    localEntrypoint: commandPath.localEntrypoint,
    activeEntrypoint: commandPath.activeEntrypoint,
    message: commandPath.message,
    pinnedCommand: commandPath.pinnedCommand
  };
}
