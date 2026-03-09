import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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
  it("parses explicit enforcement_mode values", () => {
    const parsed = parsePairflowRepoConfigToml(`
[enforcement_mode]
all_gate = "advisory"
docs_gate = "required"
`);

    expect(parsed.enforcement_mode).toEqual({
      all_gate: "advisory",
      docs_gate: "required"
    });
  });

  it("parses empty config as empty object", () => {
    const parsed = parsePairflowRepoConfigToml(`
# empty repo config
`);
    expect(parsed).toEqual({});
  });

  it("rejects invalid enforcement mode values", () => {
    const result = validatePairflowRepoConfig({
      enforcement_mode: {
        all_gate: "blocking"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "enforcement_mode.all_gate")).toBe(
      true
    );
  });

  it("rejects contradictory required/advisory combination", () => {
    const result = validatePairflowRepoConfig({
      enforcement_mode: {
        all_gate: "required",
        docs_gate: "advisory"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "enforcement_mode.docs_gate")).toBe(
      true
    );
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
      '[enforcement_mode]\nall_gate = "required"\ndocs_gate = "required"\n',
      "utf8"
    );

    const loaded = await loadPairflowRepoConfig(repoPath);
    expect(loaded).toEqual({
      enforcement_mode: {
        all_gate: "required",
        docs_gate: "required"
      }
    });
  });

  it("resolves default repository config path to <repo>/pairflow.toml", async () => {
    const repoPath = await createTempDir();
    expect(resolvePairflowRepoConfigPath(repoPath)).toBe(
      join(repoPath, "pairflow.toml")
    );
  });
});
