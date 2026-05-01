import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SchemaValidationError } from "../../src/v11/shared/validation/primitives.js";
import {
  loadPairflowRepoConfig,
  parsePairflowRepoConfigToml,
  resolvePairflowRepoConfigPath,
  validatePairflowRepoConfig
} from "../../src/config/repoConfig.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-repo-config-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("pairflow repo config", () => {
  it("ignores legacy enforcement_mode values", () => {
    const parsed = parsePairflowRepoConfigToml(`
[enforcement_mode]
all_gate = "advisory"
`);

    expect(parsed).toEqual({});
  });

  it("parses empty config as empty object", () => {
    const parsed = parsePairflowRepoConfigToml(`
# empty repo config
`);
    expect(parsed).toEqual({});
  });

  it("ignores invalid legacy enforcement mode values", () => {
    const result = validatePairflowRepoConfig({
      enforcement_mode: {
        all_gate: "blocking"
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({});
  });

  it("rejects unsupported top-level sections so typos fail fast", () => {
    expect(() =>
      parsePairflowRepoConfigToml(`
[validaton]
required = ["test"]
`)
    ).toThrow(SchemaValidationError);
  });

  it("ignores legacy docs_gate values when present in repo config", () => {
    const result = validatePairflowRepoConfig({
      enforcement_mode: {
        all_gate: "required",
        docs_gate: "advisory"
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({});
  });

  it("rejects array-of-tables parser syntax in repo config", () => {
    try {
      parsePairflowRepoConfigToml(`
[[enforcement_mode]]
all_gate = "required"
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /Array-of-tables are not supported/u
      );
    }
  });

  it("rejects dotted keys parser syntax in repo config", () => {
    try {
      parsePairflowRepoConfigToml(`
enforcement_mode.all_gate = "required"
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /Dotted TOML keys are not supported/u
      );
    }
  });

  it("loads empty config when pairflow.toml is missing", async () => {
    const repoPath = await createTempDir();
    const loaded = await loadPairflowRepoConfig(repoPath);
    expect(loaded).toEqual({});
  });

  it("loads and parses pairflow.toml from repository root", async () => {
    const repoPath = await createTempDir();
    await writeFile(
      join(repoPath, "pairflow.toml"),
      '[enforcement_mode]\nall_gate = "required"\n',
      "utf8"
    );

    const loaded = await loadPairflowRepoConfig(repoPath);
    expect(loaded).toEqual({});
  });

  it("parses single-profile validation defaults", () => {
    const parsed = parsePairflowRepoConfigToml(`
[validation]
required = ["lint", "fitness", "typecheck"]

[validation.commands]
lint = "pnpm lint"
fitness = "pnpm fitness"
`);

    expect(parsed).toEqual({
      validation: {
        required: ["lint", "fitness", "typecheck"],
        commands: {
          lint: "pnpm lint",
          fitness: "pnpm fitness"
        }
      }
    });
  });

  it("parses full create-time repo defaults", () => {
    const parsed = parsePairflowRepoConfigToml(`
[defaults]
base_branch = "main"
watchdog_timeout_minutes = 40
max_rounds = 8
severity_gate_round = 4
pairflow_command_profile = "external"
reviewer_context_mode = "fresh"

[defaults.agents]
implementer = "codex"
reviewer = "claude"
meta_reviewer = "codex"

[defaults.review_policy]
review_loop_mode = "full"
reviewer_blocking_min_severity = "P3"
meta_review_auto_rework_min_severity = "P3"
meta_review_consecutive_clean_runs_required = 2

[defaults.doc_contract_gates]
round_gate_applies_after = 2
`);

    expect(parsed.defaults).toEqual({
      base_branch: "main",
      watchdog_timeout_minutes: 40,
      max_rounds: 8,
      severity_gate_round: 4,
      pairflow_command_profile: "external",
      reviewer_context_mode: "fresh",
      agents: {
        implementer: "codex",
        reviewer: "claude",
        meta_reviewer: "codex"
      },
      review_policy: {
        review_loop_mode: "full",
        reviewer_blocking_min_severity: "P3",
        meta_review_auto_rework_min_severity: "P3",
        meta_review_consecutive_clean_runs_required: 2
      },
      doc_contract_gates: {
        round_gate_applies_after: 2
      }
    });
  });

  it("rejects unsupported and invalid create-time repo defaults", () => {
    try {
      parsePairflowRepoConfigToml(`
[defaults]
base_branch = "main"
open_command = "code ."
watchdog_timeout_minutes = 0
severity_gate_round = 3
pairflow_command_profile = "local"

[defaults.agents]
implementer = "codex"
reviewer = "codex"
unknown = "claude"

[defaults.review_policy]
review_loop_mode = "unsupported"
meta_review_consecutive_clean_runs_required = 0

[defaults.doc_contract_gates]
round_gate_applies_after = -1
extra = 1
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      const paths = (error as SchemaValidationError).errors.map(
        (entry) => entry.path
      );
      expect(paths).toContain("defaults.open_command");
      expect(paths).toContain("defaults.watchdog_timeout_minutes");
      expect(paths).toContain("defaults.severity_gate_round");
      expect(paths).toContain("defaults.pairflow_command_profile");
      expect(paths).toContain("defaults.agents");
      expect(paths).toContain("defaults.agents.unknown");
      expect(paths).toContain("defaults.review_policy.review_loop_mode");
      expect(paths).toContain(
        "defaults.review_policy.meta_review_consecutive_clean_runs_required"
      );
      expect(paths).toContain(
        "defaults.doc_contract_gates.round_gate_applies_after"
      );
      expect(paths).toContain("defaults.doc_contract_gates.extra");
    }
  });

  it("does not materialize empty nested defaults sections", () => {
    const parsed = parsePairflowRepoConfigToml(`
[defaults]
base_branch = "main"

[defaults.agents]

[defaults.review_policy]

[defaults.doc_contract_gates]
`);

    expect(parsed.defaults).toEqual({
      base_branch: "main"
    });
  });

  it("keeps defaults validation errors when validation section is invalid", () => {
    const result = validatePairflowRepoConfig({
      defaults: {
        open_command: "code .",
        watchdog_timeout_minutes: 0
      },
      validation: "invalid"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    const paths = result.errors.map((entry) => entry.path);
    expect(paths).toContain("defaults.open_command");
    expect(paths).toContain("defaults.watchdog_timeout_minutes");
    expect(paths).toContain("validation");
  });

  it("rejects invalid validation command ids and duplicate required ids", () => {
    expect(() =>
      parsePairflowRepoConfigToml(`
[validation]
required = ["fitness", "fitness"]
`)
    ).toThrow(SchemaValidationError);

    expect(() =>
      parsePairflowRepoConfigToml(`
[validation.commands]
validation_required = "pnpm test"
`)
    ).toThrow(SchemaValidationError);
  });

  it("parses validation targets using supported section syntax", () => {
    const parsed = parsePairflowRepoConfigToml(`
[validation]
required = ["typecheck"]

[validation.commands]
typecheck = "pnpm typecheck"

[validation.targets.web]
default = true
cwd = "apps/web"
paths = ["apps/web/**", "packages/ui/**"]
required = ["lint", "typecheck", "test"]

[validation.targets.web.commands]
lint = "pnpm --filter web lint"
test = "pnpm --filter web test"
`);

    expect(parsed.validation?.targets?.web).toEqual({
      default: true,
      cwd: "apps/web",
      paths: ["apps/web/**", "packages/ui/**"],
      required: ["lint", "typecheck", "test"],
      commands: {
        lint: "pnpm --filter web lint",
        test: "pnpm --filter web test"
      }
    });
  });

  it("rejects duplicate default targets", () => {
    try {
      parsePairflowRepoConfigToml(`
[validation.targets.web]
default = true
required = []

[validation.targets.web.commands]
lint = "pnpm lint"

[validation.targets.api]
default = true
required = []

[validation.targets.api.commands]
test = "pnpm test"
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /VALIDATION_TARGET_DEFAULT_NOT_UNIQUE/u
      );
    }
  });

  it("rejects malformed target ids, cwd, selectors, and commands shape", () => {
    try {
      parsePairflowRepoConfigToml(`
[validation.targets.lint]
required = []

[validation.targets.lint.commands]
test = "pnpm test"
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /VALIDATION_TARGET_ID_INVALID/u
      );
    }

    try {
      parsePairflowRepoConfigToml(`
[validation.targets.web]
cwd = "apps/*"
required = []

[validation.targets.web.commands]
test = "pnpm test"
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /VALIDATION_TARGET_CWD_INVALID/u
      );
    }

    try {
      parsePairflowRepoConfigToml(`
[validation.targets.web]
cwd = 123
required = []

[validation.targets.web.commands]
test = "pnpm test"
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /VALIDATION_TARGET_CWD_INVALID/u
      );
    }

    try {
      parsePairflowRepoConfigToml(`
[validation.targets.web]
cwd = "../web"
required = []

[validation.targets.web.commands]
test = "pnpm test"
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      const messages = (error as SchemaValidationError).errors
        .map((entry) => entry.message)
        .join("\n");
      expect(messages).toMatch(/VALIDATION_TARGET_CWD_INVALID/u);
      expect(messages).not.toMatch(/VALIDATION_TARGET_PATH_SELECTOR_INVALID/u);
    }

    try {
      parsePairflowRepoConfigToml(`
[validation.targets.web]
paths = ["apps\\\\web"]
required = []

[validation.targets.web.commands]
test = "pnpm test"
`);
      throw new Error("Expected parsePairflowRepoConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      const messages = (error as SchemaValidationError).errors
        .map((entry) => entry.message)
        .join("\n");
      expect(messages).toMatch(/VALIDATION_TARGET_PATH_SELECTOR_INVALID/u);
      expect(messages).not.toMatch(/VALIDATION_TARGET_CWD_INVALID/u);
    }

    expect(() =>
      parsePairflowRepoConfigToml(`
[validation.targets.web]
commands = "pnpm test"
required = []
`)
    ).toThrow(SchemaValidationError);
  });

  it("resolves default repository config path to <repo>/pairflow.toml", async () => {
    const repoPath = await createTempDir();
    expect(resolvePairflowRepoConfigPath(repoPath)).toBe(
      join(repoPath, "pairflow.toml")
    );
  });
});
