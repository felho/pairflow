import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

import {
  installPairflowSkills,
  SkillsInstallError
} from "../../../v11/application/skills/skillsInstall.js";
import {
  supportedPairflowSkillNames,
  type PairflowSkillName,
  type SkillInstallTargetDir,
  type SkillsInstallFileSystem,
  type SkillsInstallOptions,
  type SkillsInstallPlan
} from "../../../v11/application/skills/skillsInstallContract.js";
import { nodeSkillsInstallFileSystem } from "../../../v11/infrastructure/skills/nodeSkillsInstallFileSystem.js";

export interface ParsedSkillsInstallCommandOptions extends SkillsInstallOptions {
  help: false;
  json: boolean;
}

export interface SkillsInstallCommandHelp {
  help: true;
}

export type SkillsInstallCommandOptions =
  | ParsedSkillsInstallCommandOptions
  | SkillsInstallCommandHelp;

export interface SkillsInstallCommandDependencies {
  homeDir?: string;
  sourceRootCandidates?: string[];
  fs?: SkillsInstallFileSystem;
}

function readOptionValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new SkillsInstallError(`Missing value for ${option}.`);
  }
  return value;
}

function readBooleanOption(
  args: string[],
  index: number,
  option: string
): { value: boolean; consumedValue: boolean } {
  const next = args[index + 1];
  if (next === undefined || next.startsWith("--")) {
    return {
      value: true,
      consumedValue: false
    };
  }
  if (next === "true") {
    return {
      value: true,
      consumedValue: true
    };
  }
  if (next === "false") {
    return {
      value: false,
      consumedValue: true
    };
  }
  throw new SkillsInstallError(`Invalid boolean value for ${option}: ${next}`);
}

function parseSkills(value: string): PairflowSkillName[] {
  if (value === "all") {
    return [...supportedPairflowSkillNames];
  }
  const selected = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (selected.length === 0) {
    throw new SkillsInstallError("At least one skill must be selected.");
  }
  const invalid = selected.find(
    (skill): skill is string =>
      !supportedPairflowSkillNames.includes(skill as PairflowSkillName)
  );
  if (invalid !== undefined) {
    throw new SkillsInstallError(
      `Unsupported skill: ${invalid}. Supported skills: all, ${supportedPairflowSkillNames.join(", ")}`
    );
  }
  return selected.filter((skill, index) => selected.indexOf(skill) === index) as PairflowSkillName[];
}

function parseTargetDir(value: string): SkillInstallTargetDir {
  if (value === ".claude" || value === ".codex") {
    return value;
  }
  throw new SkillsInstallError(
    `Unsupported target dir: ${value}. Supported target dirs: .claude, .codex`
  );
}

export function parseSkillsInstallCommandOptions(
  args: string[]
): SkillsInstallCommandOptions {
  let skills: PairflowSkillName[] = [...supportedPairflowSkillNames];
  let targetDir: SkillInstallTargetDir = ".claude";
  let linkOther = false;
  let dryRun = false;
  let force = false;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      return {
        help: true
      };
    }
    if (arg === "--skills") {
      skills = parseSkills(readOptionValue(args, index, "--skills"));
      index += 1;
      continue;
    }
    if (arg?.startsWith("--skills=")) {
      skills = parseSkills(arg.slice("--skills=".length));
      continue;
    }
    if (arg === "--target-dir") {
      targetDir = parseTargetDir(readOptionValue(args, index, "--target-dir"));
      index += 1;
      continue;
    }
    if (arg?.startsWith("--target-dir=")) {
      targetDir = parseTargetDir(arg.slice("--target-dir=".length));
      continue;
    }
    if (arg === "--link-other") {
      const parsed = readBooleanOption(args, index, "--link-other");
      linkOther = parsed.value;
      if (parsed.consumedValue) {
        index += 1;
      }
      continue;
    }
    if (arg?.startsWith("--link-other=")) {
      const value = arg.slice("--link-other=".length);
      if (value !== "true" && value !== "false") {
        throw new SkillsInstallError(
          `Invalid boolean value for --link-other: ${value}`
        );
      }
      linkOther = value === "true";
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    throw new SkillsInstallError(`Unknown option for skills install: ${arg}`);
  }

  return {
    help: false,
    skills,
    targetDir,
    linkOther,
    dryRun,
    force,
    json
  };
}

function defaultSourceRootCandidates(): string[] {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const packageRoot = resolve(moduleDir, "../../../..");
  return [join(packageRoot, ".claude", "skills")];
}

export async function runSkillsInstallCommand(
  args: string[],
  dependencies: SkillsInstallCommandDependencies = {}
): Promise<SkillsInstallPlan | null> {
  const parsed = parseSkillsInstallCommandOptions(args);
  if (parsed.help) {
    return null;
  }

  return installPairflowSkills(parsed, {
    homeDir: dependencies.homeDir ?? homedir(),
    sourceRootCandidates:
      dependencies.sourceRootCandidates ?? defaultSourceRootCandidates(),
    fs: dependencies.fs ?? nodeSkillsInstallFileSystem
  });
}

export function getSkillsInstallHelpText(): string {
  return [
    "Usage: pairflow skills install [options]",
    "",
    "Install Pairflow repo/package skills into a global agent skills directory.",
    "",
    "Options:",
    "  --skills all|UsePairflow|CreatePairflowSpec|ExecutePairflowPlan[,<name>...]",
    "      Skills to install. Default: all",
    "  --target-dir .claude|.codex",
    "      Global agent directory under $HOME. Default: .claude",
    "  --link-other [true|false]",
    "      Link selected skills into the other agent directory. Default: false",
    "  --force",
    "      Replace unsafe existing selected managed paths.",
    "  --dry-run",
    "      Plan operations without writing files.",
    "  --json",
    "      Render success output as JSON.",
    "  --help",
    "      Show this help.",
    "",
    "Source roots are package-local or checkout-local .claude/skills directories; global installed skill directories are never used as source."
  ].join("\n");
}

function formatStatus(status: SkillsInstallPlan["status"]): string {
  return status.replaceAll("_", " ");
}

export function renderSkillsInstallText(plan: SkillsInstallPlan): string {
  return [
    "Pairflow skills install summary:",
    "",
    `- Source root: ${plan.sourceRoot}`,
    `- Target root: ${plan.targetRoot}`,
    `- Installed skills: ${plan.selectedSkills.join(", ")}`,
    `- Dry run: ${String(plan.dryRun)}`,
    `- Force: ${String(plan.force)}`,
    `- Link to other agent dir: ${String(plan.linkOther)}`,
    `- Other root: ${plan.otherRoot ?? "n/a"}`,
    `- Status: ${formatStatus(plan.status)}`
  ].join("\n");
}
