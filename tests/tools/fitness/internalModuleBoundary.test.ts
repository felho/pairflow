import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildInternalModuleBoundaryCheckReport } from "../../../tools/fitness/checks/internal-module-boundary.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-internal-module-"));
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
    id: "internal_module_boundary",
    metric: "internal module implementation privacy boundary",
    mode,
    owner: "architecture/runtime",
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

describe("internal module boundary fitness check", () => {
  it("fails when an external module imports another module's internal file", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/internal/policy.ts",
      "export const policy = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/use-case.ts",
      "import { policy } from '../../shared/metaReviewGate/internal/policy.js';\nexport const value = policy;\n"
    );

    const report = await buildInternalModuleBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("use-case.ts:1"))).toBe(
      true
    );
    expect(
      report.details?.some((detail) =>
        detail.includes("owner_root=src/v11/shared/metaReviewGate")
      )
    ).toBe(true);
  });

  it("allows imports from the same module root into internal files", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/internal/policy.ts",
      "export const policy = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/index.ts",
      "export { policy } from './internal/policy.js';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/internal/consumer.ts",
      "import { policy } from './policy.js';\nexport const value = policy;\n"
    );

    const report = await buildInternalModuleBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("allows external imports of the module public surface", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/internal/policy.ts",
      "export const policy = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/index.ts",
      "export { policy } from './internal/policy.js';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/use-case.ts",
      "import { policy } from '../../shared/metaReviewGate/index.js';\nexport const value = policy;\n"
    );

    const report = await buildInternalModuleBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
  });

  it("checks export-from and dynamic import targets", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/internal/policy.ts",
      "export const policy = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/reexport.ts",
      "export { policy } from '../../shared/metaReviewGate/internal/policy.js';\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/dynamic.ts",
      "export async function load() { return import('../../shared/metaReviewGate/internal/policy.js'); }\n"
    );

    const report = await buildInternalModuleBoundaryCheckReport({
      check: checkInput(),
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.filter((detail) =>
        detail.includes("imports private internal module")
      )
    ).toHaveLength(2);
  });

  it("supports explicit temporary exceptions", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/metaReviewGate/internal/policy.ts",
      "export const policy = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/converged/use-case.ts",
      "import { policy } from '../../shared/metaReviewGate/internal/policy.js';\nexport const value = policy;\n"
    );

    const report = await buildInternalModuleBoundaryCheckReport({
      check: {
        ...checkInput(),
        exceptions: [
          {
            id: "internal-boundary-temp-001",
            kind: "allow-internal-module-import",
            owner: "architecture",
            reason: "temporary migration bridge",
            from: "src/v11/application/converged/use-case.ts",
            to: "src/v11/shared/metaReviewGate/internal/policy.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "hard-fail"
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("exceptions_applied_ids=internal-boundary-temp-001")
      )
    ).toBe(true);
  });
});
