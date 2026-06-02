import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  packageJsonPathFromCliModuleUrl,
  parsePackageMetadataJson,
  readPackageMetadataFromPath
} from "../../src/cli/packageMetadata.js";

describe("package metadata", () => {
  it("reads package version from an explicit package metadata path", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-package-metadata-"));
    const packageJsonPath = join(tempDir, "package.json");
    await writeFile(
      packageJsonPath,
      JSON.stringify({
        name: "@pairflow/cli",
        version: "0.1.0"
      }),
      "utf8"
    );

    await expect(readPackageMetadataFromPath(packageJsonPath))
      .resolves.toEqual({ version: "0.1.0" });
  });

  it("fails closed when package metadata is missing", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-package-metadata-"));
    const packageJsonPath = join(tempDir, "missing-package.json");

    await expect(readPackageMetadataFromPath(packageJsonPath))
      .rejects.toThrow(/PACKAGE_METADATA_UNAVAILABLE/u);
  });

  it("fails closed when package metadata does not contain a string version", () => {
    expect(() =>
      parsePackageMetadataJson(
        JSON.stringify({
          name: "@pairflow/cli"
        }),
        "/tmp/package.json"
      )
    ).toThrow(/PACKAGE_METADATA_INVALID/u);
  });

  it("resolves package metadata relative to the CLI module instead of cwd", () => {
    expect(
      packageJsonPathFromCliModuleUrl("file:///opt/pairflow/dist/cli/index.js")
    ).toBe("/opt/pairflow/package.json");
  });

  it("keeps the npm package identity public while preserving the pairflow bin", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      name?: unknown;
      version?: unknown;
      private?: unknown;
      bin?: Record<string, unknown>;
      files?: unknown;
      publishConfig?: { access?: unknown };
      pairflow?: { skillSourcePackaging?: unknown };
    };

    expect(packageJson.name).toBe("@pairflow/cli");
    expect(packageJson.version).toEqual(
      expect.stringMatching(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u)
    );
    expect(packageJson.private).toBeUndefined();
    expect(packageJson.bin).toEqual({
      pairflow: "dist/cli/index.js"
    });
    expect(packageJson.publishConfig?.access).toBe("public");
    expect(packageJson.files).toEqual([
      "dist/**",
      "ui/dist/**",
      ".claude/skills/INSTALL.md",
      ".claude/skills/UsePairflow/**",
      ".claude/skills/CreatePairflowSpec/**",
      ".claude/skills/ExecutePairflowPlan/**",
      "README.md"
    ]);
    expect(packageJson.pairflow?.skillSourcePackaging).toBe("included");
  });
});
