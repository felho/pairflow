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

describe("fitness:check:ci", () => {
  it(
    "passes through configured policy and report paths",
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
              mode: "hard-fail"
            },
            checks: [
              {
                id: "dependency",
                metric: "cycle and forbidden import direction detection",
                mode: "hard-fail",
                owner: "architecture",
                scope: ["src/no-files/**"],
                exceptions: []
              }
            ]
          },
          null,
          2
        ),
        "utf8"
      );

      const run = await runCommand({
        command: "bash",
        args: [scriptPath],
        cwd: process.cwd(),
        env: {
          ...process.env,
          PAIRFLOW_FITNESS_POLICY_PATH: policyPath,
          PAIRFLOW_FITNESS_REPORT_PATH: reportPath
        }
      });

      expect(run.exitCode).toBe(0);
      expect(run.stderr).not.toContain("blocked");
      expect(run.stdout).toContain(`policy=${policyPath}`);
      expect(run.stdout).toContain(`out=${reportPath}`);

      const report = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; mode: string; status: string; summary: string }>;
      };
      const dependency = report.checks.find((check) => check.id === "dependency");
      expect(dependency?.mode).toBe("hard-fail");
      expect(dependency?.status).toBe("pass");
      expect(dependency?.summary).toContain("passed");
    },
    30_000
  );

  it(
    "blocks when an explicit hard-fail policy check fails",
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
              mode: "hard-fail"
            },
            checks: [
              {
                id: "complexity",
                metric: "file and function complexity budget with top offenders",
                mode: "hard-fail",
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

      const run = await runCommand({
        command: "bash",
        args: [scriptPath],
        cwd: process.cwd(),
        env: {
          ...process.env,
          PAIRFLOW_FITNESS_POLICY_PATH: policyPath,
          PAIRFLOW_FITNESS_REPORT_PATH: reportPath
        }
      });

      expect(run.exitCode).toBe(1);
      expect(run.stderr).toContain("blocked");

      const report = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; mode: string; status: string }>;
      };
      const complexity = report.checks.find((check) => check.id === "complexity");
      expect(complexity?.mode).toBe("hard-fail");
      expect(complexity?.status).toBe("fail");
    },
    30_000
  );
});
