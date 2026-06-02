import type { SkillsInstallFileSystem } from "../../ports/skillsInstallFileSystem.js";

export type {
  SkillsInstallFileSystem,
  SkillsInstallPathStatus
} from "../../ports/skillsInstallFileSystem.js";

export const supportedPairflowSkillNames = [
  "UsePairflow",
  "CreatePairflowSpec",
  "ExecutePairflowPlan"
] as const;

export type PairflowSkillName = (typeof supportedPairflowSkillNames)[number];

export type SkillInstallTargetDir = ".claude" | ".codex";

export type SkillsInstallStatus =
  | "planned"
  | "fresh_install"
  | "updated_existing"
  | "replaced_existing";

export type SkillsInstallOperation =
  | {
      kind: "sync_skill";
      skill: PairflowSkillName;
      source: string;
      destination: string;
    }
  | {
      kind: "link_other";
      skill: PairflowSkillName;
      linkPath: string;
      target: string;
    };

export interface SkillsInstallPlan {
  sourceRoot: string;
  targetRoot: string;
  targetDir: SkillInstallTargetDir;
  selectedSkills: PairflowSkillName[];
  dryRun: boolean;
  force: boolean;
  linkOther: boolean;
  otherRoot?: string;
  status: SkillsInstallStatus;
  operations: SkillsInstallOperation[];
}

export interface SkillsInstallOptions {
  skills: PairflowSkillName[];
  targetDir: SkillInstallTargetDir;
  linkOther: boolean;
  force: boolean;
  dryRun: boolean;
}

export interface SkillsInstallRuntime {
  homeDir: string;
  sourceRootCandidates: string[];
  fs: SkillsInstallFileSystem;
}
