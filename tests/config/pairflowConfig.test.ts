import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  loadPairflowGlobalConfig,
  parsePairflowGlobalConfigToml,
  resolvePairflowGlobalConfigPath,
  validatePairflowGlobalConfig
} from "../../src/config/pairflowConfig.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-global-config-"));
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

describe("pairflow global config", () => {
  it("parses attach_launcher when provided", () => {
    const parsed = parsePairflowGlobalConfigToml(`
attach_launcher = "warp"
`);

    expect(parsed.attach_launcher).toBe("warp");
  });

  it("parses empty config when attach_launcher is omitted", () => {
    const parsed = parsePairflowGlobalConfigToml(`
# empty config
`);

    expect(parsed).toEqual({});
  });

  it("rejects unsupported attach launcher values", () => {
    const result = validatePairflowGlobalConfig({
      attach_launcher: "wezterm"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "attach_launcher")).toBe(
      true
    );
  });

  it("loads empty config when file does not exist", async () => {
    const dir = await createTempDir();
    const path = join(dir, "config.toml");

    const loaded = await loadPairflowGlobalConfig(path);
    expect(loaded).toEqual({});
  });

  it("loads and parses config.toml from provided path", async () => {
    const dir = await createTempDir();
    const path = join(dir, "config.toml");
    await writeFile(path, 'attach_launcher = "copy"\n', "utf8");

    const loaded = await loadPairflowGlobalConfig(path);
    expect(loaded).toEqual({ attach_launcher: "copy" });
  });

  it("resolves default global config path under ~/.pairflow/config.toml", () => {
    const resolved = resolvePairflowGlobalConfigPath();
    expect(resolved).toMatch(/\.pairflow\/config\.toml$/u);
  });
});
