import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildDependencyCheckReport } from "../../../tools/fitness/checks/dependency.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-dependency-"));
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

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("dependency fitness check", () => {
  it("fails on forbidden layer import direction", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/handler.ts",
      "export const handler = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/rule.ts",
      "import { handler } from '../application/handler.js';\nexport const rule = handler;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: undefined
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("forbidden layer import"))
    ).toBe(true);
  });

  it("fails on import cycle", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/a.ts",
      "import { b } from './b.js';\nexport const a = b;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/b.ts",
      "import { a } from './a.js';\nexport const b = a;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: undefined
    });

    expect(report.status).toBe("fail");
    expect(report.details?.some((detail) => detail.includes("import cycle detected"))).toBe(
      true
    );
  });

  it("passes for clean dependency graph", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/types.ts",
      "export type Id = string;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/rule.ts",
      "import type { Id } from '../shared/types.js';\nexport const rule = (id: Id): Id => id;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/use-case.ts",
      "import { rule } from '../domain/rule.js';\nexport const run = (id: string): string => rule(id);\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: undefined
    });

    expect(report.status).toBe("pass");
    expect(report.details?.some((detail) => detail.startsWith("import_edges="))).toBe(true);
  });

  it("passes on application to application imports within the same layer", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/feature-a.ts",
      "export const featureA = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/application/feature-b.ts",
      "import { featureA } from './feature-a.js';\nexport const featureB = featureA;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: undefined
    });

    expect(report.status).toBe("pass");
    expect(
      report.details?.some((detail) =>
        detail.includes("forbidden layer import application -> application")
      )
    ).toBe(false);
  });

  it("applies allow-edge exception for forbidden layer import", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/handler.ts",
      "export const handler = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/rule.ts",
      "import { handler } from '../application/handler.js';\nexport const rule = handler;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: [
          {
            id: "dep-allow-edge-001",
            kind: "allow-edge",
            owner: "architecture",
            reason: "temporary migration bridge",
            expires_milestone: "M2",
            from: "src/v11/domain/rule.ts",
            to: "src/v11/application/handler.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: undefined
    });

    expect(report.status).toBe("pass");
    expect(report.details?.some((detail) => detail === "exceptions_applied=1")).toBe(true);
    expect(
      report.details?.some((detail) =>
        detail.includes("exceptions_applied_ids=dep-allow-edge-001")
      )
    ).toBe(true);
  });

  it("applies allow-cycle exception for cycle violation", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/a.ts",
      "import { b } from './b.js';\nexport const a = b;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/b.ts",
      "import { a } from './a.js';\nexport const b = a;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: [
          {
            id: "dep-allow-cycle-001",
            kind: "allow-cycle",
            owner: "architecture",
            reason: "temporary migration cycle",
            expires_milestone: "M2",
            from: undefined,
            to: undefined,
            paths: ["src/v11/domain/a.ts", "src/v11/domain/b.ts"]
          }
        ]
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: undefined
    });

    expect(report.status).toBe("pass");
    expect(report.details?.some((detail) => detail === "exceptions_applied=1")).toBe(true);
    expect(
      report.details?.some((detail) =>
        detail.includes("exceptions_applied_ids=dep-allow-cycle-001")
      )
    ).toBe(true);
  });

  it("warns when applied exception is expired for current milestone", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/handler.ts",
      "export const handler = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/rule.ts",
      "import { handler } from '../application/handler.js';\nexport const rule = handler;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: undefined,
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: [
          {
            id: "dep-allow-edge-expired",
            kind: "allow-edge",
            owner: "architecture",
            reason: "temporary migration bridge",
            expires_milestone: "M1",
            from: "src/v11/domain/rule.ts",
            to: "src/v11/application/handler.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: "M2"
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) => detail === "exceptions_expired=1")
    ).toBe(true);
    expect(
      report.details?.some((detail) =>
        detail.includes("exceptions_expired_ids=dep-allow-edge-expired")
      )
    ).toBe(true);
  });

  it("fails when lifecycle mode is hard-fail and exception is expired", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/handler.ts",
      "export const handler = 1;\n"
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/domain/rule.ts",
      "import { handler } from '../application/handler.js';\nexport const rule = handler;\n"
    );

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: "hard-fail",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: [
          {
            id: "dep-allow-edge-expired-hard",
            kind: "allow-edge",
            owner: "architecture",
            reason: "temporary migration bridge",
            expires_milestone: "M1",
            from: "src/v11/domain/rule.ts",
            to: "src/v11/application/handler.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: "M2"
    });

    expect(report.status).toBe("fail");
    expect(report.mode).toBe("hard-fail");
    expect(
      report.summary.includes("exception lifecycle violation")
    ).toBe(true);
  });

  it("fails for expired lifecycle exception in hard-fail mode even with zero scoped files", async () => {
    const repoRoot = await createTempRoot();

    const report = await buildDependencyCheckReport({
      check: {
        id: "dependency",
        metric: "cycle and forbidden import direction detection",
        mode: "report-only",
        exception_lifecycle_mode: "hard-fail",
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: [
          {
            id: "dep-expired-no-files",
            kind: "allow-edge",
            owner: "architecture",
            reason: "seed",
            expires_milestone: "M1",
            from: "src/v11/domain/a.ts",
            to: "src/v11/application/b.ts",
            paths: undefined
          }
        ]
      },
      repoRoot,
      fallbackMode: "report-only",
      currentMilestone: "M2"
    });

    expect(report.status).toBe("fail");
    expect(report.mode).toBe("hard-fail");
    expect(
      report.details?.some((detail) => detail === "files_scanned=0")
    ).toBe(true);
  });
});
