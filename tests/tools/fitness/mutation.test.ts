import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildMutationCheckReport } from "../../../tools/fitness/checks/mutation.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-mutation-"));
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

describe("mutation fitness check", () => {
  it("fails when state persist happens before transcript append", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/mutation-order.ts",
      [
        "export async function run(): Promise<void> {",
        "  await writeStateSnapshot('state.json', {});",
        "  await appendProtocolEnvelope({});",
        "}"
      ].join("\n")
    );

    const report = await buildMutationCheckReport({
      check: {
        id: "mutation",
        metric: "mutation boundary and transcript-first pipeline usage",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["src/v11/infrastructure/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("state persist before transcript append")
      )
    ).toBe(true);
  });

  it("warns when state persist is found without transcript append evidence", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/infrastructure/mutation-write-only.ts",
      [
        "export async function run(): Promise<void> {",
        "  await writeStateSnapshot('state.json', {});",
        "}"
      ].join("\n")
    );

    const report = await buildMutationCheckReport({
      check: {
        id: "mutation",
        metric: "mutation boundary and transcript-first pipeline usage",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["src/v11/infrastructure/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) =>
        detail.includes("state persist without transcript append evidence")
      )
    ).toBe(true);
  });
});
