import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

const tempDirs: string[] = [];
const tempRepoArtifacts: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-check-ci-"));
  tempDirs.push(root);
  return root;
}

function runCommand(input: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}): Promise<CommandResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env: input.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (exitCode) => {
      resolvePromise({
        exitCode,
        stdout,
        stderr
      });
    });
  });
}

afterEach(async () => {
  await Promise.all(
    [
      ...tempDirs.splice(0),
      ...tempRepoArtifacts.splice(0)
    ].map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("fitness:check:ci milestone gate behavior", () => {
  it(
    "keeps merge-allowed at M2 soft-fail but blocks at M3 hard-fail",
    async () => {
      const root = await createTempRoot();
      const policyPath = join(root, "policy.json");
      const reportPath = join(root, "fitness-report.json");
      const scriptPath = resolve(process.cwd(), "scripts/fitness-check-ci.sh");

      await writeFile(
        policyPath,
        JSON.stringify(
          {
            version: 1,
            defaults: {
              mode: "report-only",
              current_milestone: "M0"
            },
            checks: [
              {
                id: "dependency",
                metric: "cycle and forbidden import direction detection",
                mode: "report-only",
                mode_by_milestone: {
                  M2: "soft-fail",
                  M3: "hard-fail"
                },
                owner: "architecture",
                scope: ["src/no-files/**"],
                exceptions: [
                  {
                    id: "dep-expired-seed",
                    kind: "allow-edge",
                    owner: "architecture",
                    reason: "seed lifecycle for ci-gate e2e",
                    expires_milestone: "M1",
                    from: "src/v11/domain/a.ts",
                    to: "src/v11/application/b.ts"
                  }
                ]
              }
            ]
          },
          null,
          2
        ),
        "utf8"
      );

      const baseEnv = {
        ...process.env,
        PAIRFLOW_FITNESS_POLICY_PATH: policyPath,
        PAIRFLOW_FITNESS_REPORT_PATH: reportPath
      };

      const softFailRun = await runCommand({
        command: "bash",
        args: [scriptPath],
        cwd: process.cwd(),
        env: {
          ...baseEnv,
          PAIRFLOW_CI_MILESTONE: "M2"
        }
      });

      expect(softFailRun.exitCode).toBe(0);
      expect(softFailRun.stderr).toContain("soft-fail warnings");
      expect(softFailRun.stdout).toContain("milestone=M2");

      const softFailReport = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; mode: string; status: string }>;
      };
      const softFailDependency = softFailReport.checks.find(
        (check) => check.id === "dependency"
      );
      expect(softFailDependency?.mode).toBe("soft-fail");
      expect(softFailDependency?.status).toBe("warn");

      const hardFailRun = await runCommand({
        command: "bash",
        args: [scriptPath],
        cwd: process.cwd(),
        env: {
          ...baseEnv,
          PAIRFLOW_CI_MILESTONE: "M3"
        }
      });

      expect(hardFailRun.exitCode).toBe(1);
      expect(hardFailRun.stderr).toContain("blocked");
      expect(hardFailRun.stdout).toContain("milestone=M3");

      const hardFailReport = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; mode: string; status: string }>;
      };
      const hardFailDependency = hardFailReport.checks.find(
        (check) => check.id === "dependency"
      );
      expect(hardFailDependency?.mode).toBe("hard-fail");
      expect(hardFailDependency?.status).toBe("fail");
    },
    30_000
  );

  it(
    "keeps complexity merge-allowed at M2 soft-fail but blocks at M3 hard-fail",
    async () => {
      const root = await createTempRoot();
      const policyPath = join(root, "policy.json");
      const reportPath = join(root, "fitness-report.json");
      const scriptPath = resolve(process.cwd(), "scripts/fitness-check-ci.sh");

      const fixtureDir = await mkdtemp(
        join(process.cwd(), "src/.fitness-complexity-ci-")
      );
      tempRepoArtifacts.push(fixtureDir);
      const fixtureRelativePath = fixtureDir
        .replace(`${process.cwd()}/`, "")
        .replaceAll("\\", "/");
      const fixtureFilePath = join(fixtureDir, "complexity-hard-fail-seed.ts");
      const oversizedSource = [
        "export const complexityHardFailSeed = 1;",
        ...Array.from({ length: 520 }, (_, index) => `// filler ${String(index + 1)}`)
      ].join("\n");
      await writeFile(fixtureFilePath, `${oversizedSource}\n`, "utf8");

      await writeFile(
        policyPath,
        JSON.stringify(
          {
            version: 1,
            defaults: {
              mode: "report-only",
              current_milestone: "M0"
            },
            checks: [
              {
                id: "complexity",
                metric: "file and function complexity budget with top offenders",
                mode: "report-only",
                mode_by_milestone: {
                  M2: "soft-fail",
                  M3: "hard-fail"
                },
                owner: "architecture",
                scope: [`${fixtureRelativePath}/**`],
                exceptions: []
              }
            ]
          },
          null,
          2
        ),
        "utf8"
      );

      const baseEnv = {
        ...process.env,
        PAIRFLOW_FITNESS_POLICY_PATH: policyPath,
        PAIRFLOW_FITNESS_REPORT_PATH: reportPath
      };

      const softFailRun = await runCommand({
        command: "bash",
        args: [scriptPath],
        cwd: process.cwd(),
        env: {
          ...baseEnv,
          PAIRFLOW_CI_MILESTONE: "M2"
        }
      });

      expect(softFailRun.exitCode).toBe(0);
      expect(softFailRun.stderr).toContain("soft-fail warnings");
      expect(softFailRun.stdout).toContain("milestone=M2");

      const softFailReport = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; mode: string; status: string }>;
      };
      const softFailComplexity = softFailReport.checks.find(
        (check) => check.id === "complexity"
      );
      expect(softFailComplexity?.mode).toBe("soft-fail");
      expect(softFailComplexity?.status).toBe("fail");

      const hardFailRun = await runCommand({
        command: "bash",
        args: [scriptPath],
        cwd: process.cwd(),
        env: {
          ...baseEnv,
          PAIRFLOW_CI_MILESTONE: "M3"
        }
      });

      expect(hardFailRun.exitCode).toBe(1);
      expect(hardFailRun.stderr).toContain("blocked");
      expect(hardFailRun.stdout).toContain("milestone=M3");

      const hardFailReport = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; mode: string; status: string }>;
      };
      const hardFailComplexity = hardFailReport.checks.find(
        (check) => check.id === "complexity"
      );
      expect(hardFailComplexity?.mode).toBe("hard-fail");
      expect(hardFailComplexity?.status).toBe("fail");
    },
    30_000
  );
});
