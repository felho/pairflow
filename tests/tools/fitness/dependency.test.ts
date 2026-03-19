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
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
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
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
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
        owner: "architecture",
        scope: ["src/v11/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
    expect(report.details?.some((detail) => detail.startsWith("import_edges="))).toBe(true);
  });
});
