import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildApplicationDefaultsBoundaryCheckReport } from "../../../tools/fitness/checks/application-defaults-boundary.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-application-defaults-"));
  tempDirs.push(root);
  return root;
}

async function writeRepoFile(
  repoRoot: string,
  relativePath: string,
  content: string
): Promise<void> {
  const absolutePath = join(repoRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

function checkInput(mode: string = "hard-fail") {
  return {
    id: "application_defaults_boundary",
    metric: "application layer must not import default runtime wiring",
    mode,
    owner: "architecture/composition",
    scope: ["src/v11/**"],
    exceptions: []
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("application defaults boundary fitness check", () => {
  it("warns when application dynamically imports defaults through a path helper", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/defaults/state/stateStoreDefaults.ts",
      "export const readStateSnapshot = () => undefined;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/state/stateStoreDependencyDefaults.ts",
      [
        "function getStateStoreDefaultsModulePath(): string {",
        "  return '../../defaults/state/stateStoreDefaults.js';",
        "}",
        "export async function load() {",
        "  return import(getStateStoreDefaultsModulePath());",
        "}"
      ].join("\n")
    );

    const report = await buildApplicationDefaultsBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("warn");
    expect(report.details?.some((detail) =>
      detail.includes("[warn] application dynamic-imports defaults runtime wiring")
    )).toBe(true);
    expect(report.details).toContain("dynamic_defaults_imports=1");
  });

  it("fails on static application imports of defaults", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/defaults/state/stateStoreDefaults.ts",
      "export const readStateSnapshot = () => undefined;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/state/stateStoreDependencyDefaults.ts",
      "import { readStateSnapshot } from '../../defaults/state/stateStoreDefaults.js';\nexport const read = readStateSnapshot;\n"
    );

    const report = await buildApplicationDefaultsBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) =>
      detail.includes("application imports defaults runtime wiring")
    )).toBe(true);
  });
});
