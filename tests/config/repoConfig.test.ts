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
  it("parses required-for-doc-gates mode", () => {
    const parsed = parsePairflowRepoConfigToml(`
[doc_contract_gates]
mode = "required-for-doc-gates"
`);

    expect(parsed.doc_contract_gates?.mode).toBe("required-for-doc-gates");
  });

  it("parses empty config as empty object", () => {
    const parsed = parsePairflowRepoConfigToml(`
# empty repo config
`);
    expect(parsed).toEqual({});
  });

  it("rejects invalid doc gate mode", () => {
    const result = validatePairflowRepoConfig({
      doc_contract_gates: {
        mode: "blocking"
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "doc_contract_gates.mode")).toBe(
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
      '[doc_contract_gates]\nmode = "required-for-all-gates"\n',
      "utf8"
    );

    const loaded = await loadPairflowRepoConfig(repoPath);
    expect(loaded).toEqual({
      doc_contract_gates: {
        mode: "required-for-all-gates"
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
