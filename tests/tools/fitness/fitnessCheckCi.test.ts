import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { buildCheckReport } from "../../../tools/fitness/checks/index.js";

interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-check-ci-"));
  tempDirs.push(root);
  return root;
}

async function writeFixtureFile(
  repoRoot: string,
  relativePath: string,
  content: string
): Promise<void> {
  const absolutePath = join(repoRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
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
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
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

      const fixtureRepoRoot = await createTempRoot();
      const fixtureRelativePath = "src/.fitness-complexity-ci";
      const oversizedSource = [
        "export const complexityHardFailSeed = 1;",
        ...Array.from({ length: 520 }, (_, index) => `// filler ${String(index + 1)}`)
      ].join("\n");
      await writeFixtureFile(
        fixtureRepoRoot,
        `${fixtureRelativePath}/complexity-hard-fail-seed.ts`,
        `${oversizedSource}\n`
      );

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
          PAIRFLOW_FITNESS_REPORT_PATH: reportPath,
          PAIRFLOW_FITNESS_REPO_ROOT: fixtureRepoRoot
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

  it(
    "passes the current repo router-port check with explicit exception diagnostics",
    async () => {
      const root = await createTempRoot();
      const policyPath = join(root, "router-port-policy.json");
      const reportPath = join(root, "fitness-report.json");
      const scriptPath = resolve(process.cwd(), "scripts/fitness-check-ci.sh");
      const policy = JSON.parse(
        await readFile(resolve(process.cwd(), "tools/fitness/policy.json"), "utf8")
      ) as {
        defaults?: { mode?: string };
        checks: Array<{ id: string; exceptions?: unknown[] }>;
      };
      const routerPortPolicy = policy.checks.find(
        (check) => check.id === "ui_router_port_boundary"
      );
      expect(routerPortPolicy).toBeDefined();
      await writeFile(
        policyPath,
        JSON.stringify(
          {
            version: 1,
            defaults: policy.defaults ?? { mode: "hard-fail" },
            checks: [routerPortPolicy]
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

      const report = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; status: string; details?: string[] }>;
      };
      const expectedExceptionCount = routerPortPolicy?.exceptions?.length ?? 0;
      const routerPort = report.checks.find(
        (check) => check.id === "ui_router_port_boundary"
      );
      expect(routerPort?.status).toBe("pass");
      expect(routerPort?.details).toContainEqual(
        expect.stringContaining(`exceptions_applied=${String(expectedExceptionCount)}`)
      );
      expect(routerPort?.details).toContainEqual(
        expect.stringContaining("TRANSITIONAL_EXCEPTION_APPLIED")
      );
    },
    60_000
  );

  it(
    "blocks unlisted router-port broad-bag drift through the CI entrypoint",
    async () => {
      const root = await createTempRoot();
      const fixtureRepoRoot = await createTempRoot();
      const policyPath = join(root, "policy.json");
      const reportPath = join(root, "fitness-report.json");
      const scriptPath = resolve(process.cwd(), "scripts/fitness-check-ci.sh");
      const fixturePath =
        "src/v11/infrastructure/ui/.fitnessRouterPortDrift.ts";

      await writeFixtureFile(
        fixtureRepoRoot,
        fixturePath,
        "import type { UiRouterDependencies } from './routerContracts.js';\nexport interface Drift { dependencies: UiRouterDependencies; }\n"
      );
      await writeFile(
        policyPath,
        JSON.stringify(
          {
            version: 1,
            defaults: { mode: "hard-fail" },
            checks: [
              {
                id: "ui_router_port_boundary",
                metric:
                  "UI router port full-composite and command-owned import leakage",
                mode: "hard-fail",
                owner: "architecture/ui-router",
                scope: [fixturePath],
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
          PAIRFLOW_FITNESS_REPORT_PATH: reportPath,
          PAIRFLOW_FITNESS_REPO_ROOT: fixtureRepoRoot
        }
      });

      expect(run.exitCode).toBe(1);
      expect(run.stderr).toContain("blocked");
      const report = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; status: string; details?: string[] }>;
      };
      const routerPort = report.checks.find(
        (check) => check.id === "ui_router_port_boundary"
      );
      expect(routerPort?.status).toBe("fail");
      expect(routerPort?.details).toContainEqual(
        expect.stringContaining("FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE")
      );
    },
    30_000
  );

  it(
    "blocks current-repo router-port inventory drift for both violation families",
    async () => {
      const root = await createTempRoot();
      const fixtureRepoRoot = await createTempRoot();
      const policyPath = join(root, "policy.json");
      const reportPath = join(root, "fitness-report.json");
      const scriptPath = resolve(process.cwd(), "scripts/fitness-check-ci.sh");
      const broadBagPath =
        "src/v11/infrastructure/ui/.fitnessRouterPortBroadBagDrift.ts";
      const portPath = "src/v11/shared/ports/.fitnessRouterPortCommandDrift.ts";
      const commandPath = "src/v11/shared/list/.fitnessListCommandContract.ts";

      await writeFixtureFile(
        fixtureRepoRoot,
        broadBagPath,
        "import type { UiRouterDependencies } from './routerContracts.js';\nexport interface Drift { dependencies: UiRouterDependencies; }\n"
      );
      await writeFixtureFile(
        fixtureRepoRoot,
        commandPath,
        "export interface FitnessListCommandContract { id: string; }\n"
      );
      await writeFixtureFile(
        fixtureRepoRoot,
        portPath,
        "import type { FitnessListCommandContract } from '../list/.fitnessListCommandContract.js';\nexport type Drift = FitnessListCommandContract;\n"
      );
      await writeFile(
        policyPath,
        JSON.stringify(
          {
            version: 1,
            defaults: { mode: "hard-fail" },
            checks: [
              {
                id: "ui_router_port_boundary",
                metric:
                  "UI router port full-composite and command-owned import leakage",
                mode: "hard-fail",
                owner: "architecture/ui-router",
                scope: [broadBagPath, portPath],
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
          PAIRFLOW_FITNESS_REPORT_PATH: reportPath,
          PAIRFLOW_FITNESS_REPO_ROOT: fixtureRepoRoot
        }
      });

      expect(run.exitCode).toBe(1);
      const report = JSON.parse(await readFile(reportPath, "utf8")) as {
        checks: Array<{ id: string; status: string; details?: string[] }>;
      };
      const routerPort = report.checks.find(
        (check) => check.id === "ui_router_port_boundary"
      );
      expect(routerPort?.details).toContainEqual(
        expect.stringContaining("FULL_UI_ROUTER_DEPENDENCY_BAG_USAGE")
      );
      expect(routerPort?.details).toContainEqual(
        expect.stringContaining("COMMAND_OWNED_UI_PORT_IMPORT")
      );
    },
    30_000
  );

  it("dispatches the router-port check ID through the shared registry", async () => {
    const report = await buildCheckReport({
      check: {
        id: "ui_router_port_boundary",
        metric: "UI router port full-composite and command-owned import leakage",
        mode: "hard-fail",
        owner: "architecture/ui-router",
        scope: ["src/no-files/**"],
        exceptions: []
      },
      repoRoot: process.cwd(),
      fallbackMode: "hard-fail"
    });

    expect(report.id).toBe("ui_router_port_boundary");
    expect(report.status).not.toBe("not_implemented");
  });

  it("keeps the existing UI contract boundary policy entry alongside router-port", async () => {
    const policy = JSON.parse(
      await readFile(resolve(process.cwd(), "tools/fitness/policy.json"), "utf8")
    ) as { checks: Array<{ id: string }> };

    expect(policy.checks.some((check) => check.id === "ui_contract_boundary")).toBe(
      true
    );
    expect(
      policy.checks.some((check) => check.id === "ui_router_port_boundary")
    ).toBe(true);
  });

  it(
    "writes the default report path under the scan repo root override",
    async () => {
      const root = await createTempRoot();
      const fixtureRepoRoot = await createTempRoot();
      const policyPath = join(root, "policy.json");
      const scriptPath = resolve(process.cwd(), "scripts/fitness-check-ci.sh");
      const expectedReportPath = join(
        fixtureRepoRoot,
        ".pairflow",
        "evidence",
        "fitness-report.json"
      );

      await writeFile(
        policyPath,
        JSON.stringify(
          {
            version: 1,
            defaults: { mode: "hard-fail" },
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
          PAIRFLOW_FITNESS_REPO_ROOT: fixtureRepoRoot
        }
      });

      expect(run.exitCode).toBe(0);
      expect(run.stdout).toContain(`out=${expectedReportPath}`);
      const report = JSON.parse(await readFile(expectedReportPath, "utf8")) as {
        checks: Array<{ id: string; status: string }>;
      };
      expect(report.checks[0]?.status).toBe("pass");
    },
    30_000
  );

  it(
    "prefers explicit report path over scan repo root default",
    async () => {
      const root = await createTempRoot();
      const fixtureRepoRoot = await createTempRoot();
      const policyPath = join(root, "policy.json");
      const explicitReportPath = join(root, "explicit-report.json");
      const defaultReportPath = join(
        fixtureRepoRoot,
        ".pairflow",
        "evidence",
        "fitness-report.json"
      );
      const scriptPath = resolve(process.cwd(), "scripts/fitness-check-ci.sh");

      await writeFile(
        policyPath,
        JSON.stringify(
          {
            version: 1,
            defaults: { mode: "hard-fail" },
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
          PAIRFLOW_FITNESS_REPO_ROOT: fixtureRepoRoot,
          PAIRFLOW_FITNESS_REPORT_PATH: explicitReportPath
        }
      });

      expect(run.exitCode).toBe(0);
      expect(run.stdout).toContain(`out=${explicitReportPath}`);
      const report = JSON.parse(await readFile(explicitReportPath, "utf8")) as {
        checks: Array<{ id: string; status: string }>;
      };
      expect(report.checks[0]?.status).toBe("pass");
      await expect(readFile(defaultReportPath, "utf8")).rejects.toThrow();
    },
    30_000
  );

  it("keeps the §2a router-port exception inventory synchronized with policy", async () => {
    const task = await readFile(
      resolve(process.cwd(), "plans/tasks/1-router-fitness-guards.md"),
      "utf8"
    );
    const policy = JSON.parse(
      await readFile(resolve(process.cwd(), "tools/fitness/policy.json"), "utf8")
    ) as {
      checks: Array<{
        id: string;
        exceptions?: Array<{
          id: string;
          kind: string;
          paths?: string[];
          from?: string;
          to?: string;
        }>;
      }>;
    };

    const lines = task.split("\n");
    const headerIndex = lines.findIndex((line) =>
      line.includes("| Exception ID | Kind | Exact Match |")
    );
    expect(headerIndex).toBeGreaterThanOrEqual(0);
    const headers = lines[headerIndex]
      ?.split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    expect(headers).toContain("Exception ID");
    expect(headers).toContain("Kind");
    expect(headers).toContain("Exact Match");
    const idIndex = headers?.indexOf("Exception ID") ?? -1;
    const kindIndex = headers?.indexOf("Kind") ?? -1;
    const exactMatchIndex = headers?.indexOf("Exact Match") ?? -1;
    const inventoryRows = lines
      .slice(headerIndex + 2)
      .filter((line) => line.startsWith("| `router-port-"))
      .map((line) => {
        const cells = line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim().replaceAll("`", ""));
        expect(cells.length).toBeGreaterThan(
          Math.max(idIndex, kindIndex, exactMatchIndex)
        );
        const id = cells[idIndex];
        const kind = cells[kindIndex];
        const exactMatch = cells[exactMatchIndex];
        expect(id).toMatch(/^router-port-/u);
        expect(kind).toMatch(
          /^allow-(?:full-dependency-bag|command-owned-ui-port-import)$/u
        );
        expect(exactMatch).toBeTruthy();
        return { id, kind, exactMatch };
      })
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));

    const routerPortPolicy = policy.checks.find(
      (check) => check.id === "ui_router_port_boundary"
    );
    const policyRows = (routerPortPolicy?.exceptions ?? [])
      .map((exception) => ({
        id: exception.id,
        kind: exception.kind,
        exactMatch:
          exception.kind === "allow-full-dependency-bag"
            ? exception.paths?.[0]
            : `${exception.from ?? ""} -> ${exception.to ?? ""}`
      }))
      .sort((left, right) => left.id.localeCompare(right.id));

    expect(policyRows).toEqual(inventoryRows);
  });
});
