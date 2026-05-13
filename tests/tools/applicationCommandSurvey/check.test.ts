import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  checkApplicationCommandSurveyDrift,
  parseSurveyLaneRows
} from "../../../tools/application-command-survey/check.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-application-survey-"));
  tempDirs.push(root);
  return root;
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content, "utf8");
}

function surveyMarkdown(rows: readonly string[]): string {
  return [
    "# Application Command Shapes — Survey",
    "",
    "## Lane inventory (28 lanes)",
    "",
    "| Lane | Top | Int | Sub | Defaults | CLI | Score | Status |",
    "|------|----:|:---:|----:|---------:|:---:|------:|--------|",
    ...rows,
    "",
    "## Common naming conventions"
  ].join("\n");
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("application command survey drift check", () => {
  it("parses survey inventory rows", () => {
    const rows = parseSurveyLaneRows(
      surveyMarkdown([
        "| demo | 2 | yes | 3 | yes | — | 0 | structured |",
        "| tiny | 1 | no | — | — | yes | -1 | trivial |"
      ])
    );

    expect(rows).toEqual([
      {
        lane: "demo",
        top: 2,
        hasInternal: true,
        internalSubAreaCount: 3,
        hasDefaults: true
      },
      {
        lane: "tiny",
        top: 1,
        hasInternal: false,
        internalSubAreaCount: null,
        hasDefaults: false
      }
    ]);
  });

  it("passes when the documented lane shape matches the filesystem", async () => {
    const root = await createTempRoot();
    await mkdir(join(root, "src/v11/application/demo/internal/a"), {
      recursive: true
    });
    await mkdir(join(root, "src/v11/defaults/demo"), { recursive: true });
    await writeText(join(root, "src/v11/application/demo/demo.ts"), "");
    await writeText(join(root, "src/v11/application/demo/demoContract.ts"), "");
    await writeText(
      join(root, "docs/refactoring/application-command-shapes-survey.md"),
      surveyMarkdown([
        "| demo | 2 | yes | 1 | yes | — | 0 | structured |"
      ])
    );

    await expect(
      checkApplicationCommandSurveyDrift({ repoRoot: root })
    ).resolves.toMatchObject({
      status: "pass",
      checkedLanes: 1,
      issues: []
    });
  });

  it("reports drift when the top-level file count changes", async () => {
    const root = await createTempRoot();
    await mkdir(join(root, "src/v11/application/demo"), { recursive: true });
    await writeText(join(root, "src/v11/application/demo/demo.ts"), "");
    await writeText(join(root, "src/v11/application/demo/extra.ts"), "");
    await writeText(
      join(root, "docs/refactoring/application-command-shapes-survey.md"),
      surveyMarkdown([
        "| demo | 1 | no | — | — | — | 0 | small |"
      ])
    );

    const report = await checkApplicationCommandSurveyDrift({ repoRoot: root });

    expect(report.status).toBe("fail");
    expect(report.issues).toContainEqual({
      lane: "demo",
      field: "top",
      expected: "1",
      actual: "2"
    });
  });

  it("reports drift when lanes are missing from either side", async () => {
    const root = await createTempRoot();
    await mkdir(join(root, "src/v11/application/current"), { recursive: true });
    await writeText(join(root, "src/v11/application/current/current.ts"), "");
    await writeText(
      join(root, "docs/refactoring/application-command-shapes-survey.md"),
      surveyMarkdown([
        "| documented | 1 | no | — | — | — | 0 | small |"
      ])
    );

    const report = await checkApplicationCommandSurveyDrift({ repoRoot: root });

    expect(report.status).toBe("fail");
    expect(report.issues).toEqual([
      {
        lane: "documented",
        field: "lane",
        expected: "present",
        actual: "missing"
      },
      {
        lane: "current",
        field: "lane",
        expected: "absent",
        actual: "present"
      }
    ]);
  });
});
