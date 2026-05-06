import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildSharedDefaultsBoundaryCheckReport } from "../../../tools/fitness/checks/shared-defaults-boundary.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-shared-defaults-"));
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

function checkInput(mode: string = "soft-fail") {
  return {
    id: "shared_defaults_boundary",
    metric: "shared layer must not hide default runtime wiring behind shared defaults facades",
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

describe("shared defaults boundary fitness check", () => {
  it("warns when shared imports defaults runtime wiring", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/defaults/state/stateStoreDefaults.ts",
      "export const readStateSnapshot = () => undefined;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/state/stateStoreDefaults.ts",
      "export { readStateSnapshot } from '../../defaults/state/stateStoreDefaults.js';\n"
    );

    const report = await buildSharedDefaultsBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("warn");
    expect(report.mode).toBe("soft-fail");
    expect(report.details?.some((detail) =>
      detail.includes("shared imports defaults runtime wiring")
    )).toBe(true);
    expect(report.details).toContain("shared_imports_defaults=1");
  });

  it("warns when application imports a shared defaults facade", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/transcript/transcriptDependencyDefaults.ts",
      "export const appendProtocolEnvelope = () => undefined;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/passTranscriptDefaults.ts",
      "import { appendProtocolEnvelope } from '../../shared/transcript/transcriptDependencyDefaults.js';\nexport const append = appendProtocolEnvelope;\n"
    );

    const report = await buildSharedDefaultsBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("warn");
    expect(report.details?.some((detail) =>
      detail.includes("application imports shared defaults facade")
    )).toBe(true);
    expect(report.details).toContain("application_imports_shared_defaults=1");
  });

  it("does not warn on application imports of shared ports", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/ports/stateSnapshots.ts",
      "export type ReadStateSnapshotPort = () => unknown;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/pass/passStatePorts.ts",
      "import type { ReadStateSnapshotPort } from '../../shared/ports/stateSnapshots.js';\nexport type Port = ReadStateSnapshotPort;\n"
    );

    const report = await buildSharedDefaultsBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("hard-fails after the policy mode is promoted", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/defaults/process/processSpawnDefaults.ts",
      "export const processSpawnDefault = () => undefined;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/process/processSpawnDefaults.ts",
      "import { processSpawnDefault } from '../../defaults/process/processSpawnDefaults.js';\nexport const processSpawn = processSpawnDefault;\n"
    );

    const report = await buildSharedDefaultsBoundaryCheckReport({
      check: checkInput("hard-fail"),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
  });

  it("honors explicit from/to exceptions", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/defaults/bubbleLookup/bubbleLookupDefaults.ts",
      "export const resolveBubbleById = () => undefined;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/bubbleLookup/bubbleLookupDefaults.ts",
      "export { resolveBubbleById } from '../../defaults/bubbleLookup/bubbleLookupDefaults.js';\n"
    );

    const report = await buildSharedDefaultsBoundaryCheckReport({
      check: {
        ...checkInput(),
        exceptions: [
          {
            id: "temporary-bubble-lookup-bridge",
            kind: "allow-shared-defaults-boundary-import",
            owner: "architecture/composition",
            reason: "temporary bridge during defaults migration",
            from: "src/v11/shared/bubbleLookup/bubbleLookupDefaults.ts",
            to: "src/v11/defaults/bubbleLookup/bubbleLookupDefaults.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(report.details).toContain("exceptions_applied=1");
    expect(report.details).toContain(
      "exceptions_applied_ids=temporary-bubble-lookup-bridge"
    );
  });
});
