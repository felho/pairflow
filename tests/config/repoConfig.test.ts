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
