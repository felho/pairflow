import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface AlmostE2eSmokeFixtureRepo {
  root: string;
  pairflowTomlPath: string;
  cleanup(): Promise<void>;
}

export interface CreateAlmostE2eSmokeFixtureRepoOptions {
  prefix?: string;
  pairflowToml?: string;
}

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const defaultPairflowToml = [
  "[defaults]",
  'base_branch = "main"',
  "watchdog_timeout_minutes = 30",
  "max_rounds = 3",
  "",
  "[validation]",
  'required = ["lint", "typecheck"]',
  "",
  "[validation.commands]",
  'lint = "echo lint"',
  'typecheck = "echo typecheck"',
  ""
].join("\n");

function sanitizeTempPrefix(prefix: string | undefined): string {
  if (prefix === undefined) {
    return "pairflow-almost-e2e-smoke-";
  }
  const safePrefix = prefix.replace(/[^A-Za-z0-9_-]/g, "-");
  return safePrefix.length > 0
    ? `pairflow-${safePrefix}-`
    : "pairflow-almost-e2e-smoke-";
}

function runCommand(
  cwd: string,
  command: string,
  args: string[]
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      const code = exitCode ?? 1;
      if (code !== 0) {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed in ${cwd} (${code}): ${stderr.trim()}`
          )
        );
        return;
      }
      resolve({ stdout, stderr, exitCode: code });
    });
  });
}

export async function createAlmostE2eSmokeFixtureRepo(
  options: CreateAlmostE2eSmokeFixtureRepoOptions = {}
): Promise<AlmostE2eSmokeFixtureRepo> {
  const root = await mkdtemp(join(tmpdir(), sanitizeTempPrefix(options.prefix)));
  try {
    await mkdir(join(root, "plans", "tasks"), { recursive: true });
    await writeFile(join(root, "README.md"), "# Smoke Fixture\n", "utf8");
    const pairflowTomlPath = join(root, "pairflow.toml");
    await writeFile(
      pairflowTomlPath,
      options.pairflowToml ?? defaultPairflowToml,
      "utf8"
    );
    await runCommand(root, "git", ["init", "-b", "main"]);
    await runCommand(root, "git", ["config", "user.email", "pairflow@example.test"]);
    await runCommand(root, "git", ["config", "user.name", "Pairflow Test"]);
    await runCommand(root, "git", ["add", "."]);
    await runCommand(root, "git", ["commit", "-m", "fixture baseline"]);
    return {
      root,
      pairflowTomlPath,
      cleanup: async () => {
        await rm(root, { recursive: true, force: true });
      }
    };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    if (error instanceof Error) {
      throw new Error(`SMOKE_FIXTURE_SETUP_FAILED: ${root}: ${error.message}`);
    }
    throw error;
  }
}
