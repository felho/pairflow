import { execFile } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const ciLintCommand = "exec eslint .";

function outputFrom(error: unknown, stream: "stdout" | "stderr"): string {
  if (typeof error === "object" && error !== null && stream in error) {
    const value = (error as Record<typeof stream, unknown>)[stream];
    return typeof value === "string" ? value : "";
  }
  return "";
}

async function createCiFixture(): Promise<{ fixtureDir: string; commandLog: string }> {
  const fixtureDir = await mkdtemp(join(tmpdir(), "pairflow-ci-local-"));
  const binDir = join(fixtureDir, "bin");
  const commandLog = join(fixtureDir, "commands.log");
  await mkdir(join(fixtureDir, "scripts"), { recursive: true });
  await mkdir(binDir, { recursive: true });
  await writeFile(
    join(fixtureDir, "scripts/ci-local.sh"),
    await readFile(join(repoRoot, "scripts/ci-local.sh"), "utf8"),
    "utf8"
  );
  await chmod(join(fixtureDir, "scripts/ci-local.sh"), 0o755);
  await writeFile(
    join(binDir, "pnpm"),
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      "if [[ \"${PAIRFLOW_TEST_FAIL_ON_CODEX_VISIBLE:-0}\" == \"1\" ]] && command -v codex >/dev/null 2>&1; then",
      `  echo "codex-visible:$(command -v codex)" >> "${commandLog}"`,
      "  exit 42",
      "fi",
      `echo "$*" >> "${commandLog}"`,
      "if [[ \"${PAIRFLOW_TEST_FAIL_PNPM_ARGS:-}\" == \"$*\" ]]; then",
      "  exit 37",
      "fi",
      "exit 0",
      ""
    ].join("\n"),
    "utf8"
  );
  await chmod(join(binDir, "pnpm"), 0o755);
  return { fixtureDir, commandLog };
}

async function runCiFixture(
  fixtureDir: string,
  env: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string }> {
  const fixturePath = `${join(fixtureDir, "bin")}${delimiter}${process.env.PATH ?? ""}`;
  return execFileAsync("bash", ["scripts/ci-local.sh"], {
    cwd: fixtureDir,
    env: {
      ...process.env,
      PATH: fixturePath,
      PAIRFLOW_CI_ALLOW_CODEX: "1",
      ...env
    }
  });
}

describe("ci-local commit range integration", () => {
  it("validates an explicit range before install and quality steps", async () => {
    const { fixtureDir, commandLog } = await createCiFixture();
    await runCiFixture(fixtureDir, {
      PAIRFLOW_COMMIT_RANGE_FROM: "base",
      PAIRFLOW_COMMIT_RANGE_TO: "head"
    });

    const commands = (await readFile(commandLog, "utf8")).trim().split("\n");
    expect(commands[0]).toBe(
      "commit-policy:validate-range -- --from base --to head"
    );
    expect(commands).toContain("install --frozen-lockfile");
    expect(commands).toContain("--dir ui install --frozen-lockfile");
    expect(commands).toContain("codegen:reviewer-ontology");
    expect(commands).toContain(ciLintCommand);
    expect(commands).toContain("exec tsc --noEmit");
    expect(commands).toContain("exec vitest run --maxWorkers=8");
    expect(commands).toContain("--dir ui test --maxWorkers=2");
    expect(commands).toContain("fitness:check:ci");
    expect(commands).toContain("exec tsc -p tsconfig.build.json");
    expect(commands).toContain("--dir ui build");
    expect(commands).toContain("exec vitest run --config vitest.smoke.config.ts");
    expect(commands.indexOf("--dir ui install --frozen-lockfile")).toBeLessThan(
      commands.indexOf("--dir ui test --maxWorkers=2")
    );
    expect(commands.indexOf("--dir ui install --frozen-lockfile")).toBeLessThan(
      commands.indexOf("--dir ui build")
    );
  });

  it("fails closed before side-effectful steps when a range is required but missing", async () => {
    const { fixtureDir, commandLog } = await createCiFixture();

    let failure: unknown;
    try {
      await runCiFixture(fixtureDir, { PAIRFLOW_COMMIT_RANGE_REQUIRED: "1" });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ code: 1 });
    expect(outputFrom(failure, "stdout")).toContain("not validated");

    await expect(readFile(commandLog, "utf8")).rejects.toThrow();
  });

  it("fails closed before side-effectful steps when only one range endpoint is provided", async () => {
    const { fixtureDir, commandLog } = await createCiFixture();

    let failure: unknown;
    try {
      await runCiFixture(fixtureDir, {
        PAIRFLOW_COMMIT_RANGE_FROM: "base"
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ code: 1 });
    expect(outputFrom(failure, "stdout")).toContain("incomplete safe range");

    await expect(readFile(commandLog, "utf8")).rejects.toThrow();
  });

  it("fails closed before side-effectful steps when only the range head is provided", async () => {
    const { fixtureDir, commandLog } = await createCiFixture();

    let failure: unknown;
    try {
      await runCiFixture(fixtureDir, {
        PAIRFLOW_COMMIT_RANGE_TO: "head"
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ code: 1 });
    expect(outputFrom(failure, "stdout")).toContain("incomplete safe range");

    await expect(readFile(commandLog, "utf8")).rejects.toThrow();
  });

  it("honestly skips range validation by default without claiming a pass", async () => {
    const { fixtureDir, commandLog } = await createCiFixture();
    const result = await runCiFixture(fixtureDir);

    expect(result.stdout).toContain("commit range not validated");
    expect(result.stdout).toContain("no safe range");
    expect(result.stdout).not.toContain("range validation passed");

    const commands = (await readFile(commandLog, "utf8")).trim().split("\n");
    expect(commands[0]).toBe("install --frozen-lockfile");
    expect(commands[1]).toBe("--dir ui install --frozen-lockfile");
    expect(commands[2]).toBe("codegen:reviewer-ontology");
    expect(commands).toContain(ciLintCommand);
    expect(commands).toContain("exec tsc --noEmit");
    expect(commands).toContain("exec vitest run --maxWorkers=8");
    expect(commands).toContain("--dir ui test --maxWorkers=2");
    expect(commands).toContain("fitness:check:ci");
    expect(commands).toContain("exec tsc -p tsconfig.build.json");
    expect(commands).toContain("--dir ui build");
    expect(commands).toContain("exec vitest run --config vitest.smoke.config.ts");
    expect(commands.indexOf("--dir ui install --frozen-lockfile")).toBeLessThan(
      commands.indexOf("--dir ui test --maxWorkers=2")
    );
    expect(commands.indexOf("--dir ui install --frozen-lockfile")).toBeLessThan(
      commands.indexOf("--dir ui build")
    );
  });

  it("waits for every parallel validation branch before reporting failure", async () => {
    const { fixtureDir, commandLog } = await createCiFixture();

    let failure: unknown;
    try {
      await runCiFixture(fixtureDir, {
        PAIRFLOW_TEST_FAIL_PNPM_ARGS: ciLintCommand
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ code: 1 });
    expect(outputFrom(failure, "stdout")).toContain("quality suite failed");

    const commands = (await readFile(commandLog, "utf8")).trim().split("\n");
    expect(commands).toContain(ciLintCommand);
    expect(commands).toContain("exec tsc --noEmit");
    expect(commands).toContain("exec vitest run --maxWorkers=8");
    expect(commands).toContain("--dir ui test --maxWorkers=2");
    expect(commands).toContain("fitness:check:ci");
    expect(commands).toContain("exec tsc -p tsconfig.build.json");
    expect(commands).toContain("--dir ui build");
    expect(commands).toContain("exec vitest run --config vitest.smoke.config.ts");
  });

  it("hides local codex from ci child commands by default", async () => {
    const { fixtureDir, commandLog } = await createCiFixture();
    const codexPath = join(fixtureDir, "bin", "codex");
    await writeFile(
      codexPath,
      ["#!/usr/bin/env bash", "echo local-codex", ""].join("\n"),
      "utf8"
    );
    await chmod(codexPath, 0o755);

    const result = await runCiFixture(fixtureDir, {
      PATH: `${join(fixtureDir, "bin")}${delimiter}/bin${delimiter}/usr/bin`,
      PAIRFLOW_CI_ALLOW_CODEX: "0"
    });

    expect(result.stdout).toContain("codex visibility: hidden");
    expect(await readFile(commandLog, "utf8")).not.toContain("codex-visible");
  });
});
