import { readdirSync, statSync } from "node:fs";
import { access, readFile, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createAlmostE2eSmokeFixtureRepo,
  createCompiledCliHarness,
  installCompiledCliShimEnvironment
} from "../helpers/almostE2eSmoke/index.js";

interface BubbleStatusJson {
  bubbleId: string;
  state: string;
  round: number;
  worktreePath?: string;
}

interface CompiledCliReadiness {
  ready: boolean;
  error?: Error;
}

const compiledCliEntrypointPath = resolve("dist/cli/index.js");
const requireCompiledCliSmoke = process.env.PAIRFLOW_REQUIRE_COMPILED_CLI_SMOKE === "1";

function parseJson<T>(stdout: string): T {
  return JSON.parse(stdout) as T;
}

function commandNamesFor(invocations: { argv: string[] }[]): string[] {
  return invocations.map((invocation) => invocation.argv.slice(0, 2).join(" "));
}

function expectedSmokeWorktreePath(fixtureRoot: string, bubbleId: string): string {
  return join(dirname(fixtureRoot), ".pairflow-worktrees", basename(fixtureRoot), bubbleId);
}

function isSafeSmokeWorktreeCleanupTarget(
  fixtureRoot: string,
  bubbleId: string,
  candidatePath: string
): boolean {
  const smokeWorktreesRoot = resolve(dirname(fixtureRoot), ".pairflow-worktrees");
  const resolvedCandidate = resolve(candidatePath);
  return (
    dirname(dirname(resolvedCandidate)) === smokeWorktreesRoot
    && basename(dirname(resolvedCandidate)) === basename(fixtureRoot)
    && basename(resolvedCandidate) === bubbleId
  );
}

function newestMtimeMsUnder(path: string): number {
  if (path.endsWith(".generated.ts")) {
    return 0;
  }
  const entry = statSync(path);
  if (!entry.isDirectory()) {
    return entry.mtimeMs;
  }
  const children = readdirSync(path);
  const childMtimes = children.map((child) => newestMtimeMsUnder(join(path, child)));
  return Math.max(entry.mtimeMs, ...childMtimes);
}

function getCompiledEntrypointFreshnessError(entrypointPath: string): Error | undefined {
  let entrypoint;
  try {
    entrypoint = statSync(entrypointPath);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      return new Error(
        "COMPILED_CLI_ENTRYPOINT_MISSING: dist/cli/index.js is absent. Run `pnpm build` before running the compiled CLI lifecycle smoke."
      );
    }
    throw error;
  }
  const sourceFreshnessInputs = [
    "src",
    "scripts",
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "tsconfig.build.json"
  ];
  const newestSourceMtimeMs = Math.max(
    ...sourceFreshnessInputs.map((path) => newestMtimeMsUnder(path))
  );
  if (entrypoint.mtimeMs < newestSourceMtimeMs) {
    return new Error(
      [
        "COMPILED_CLI_ENTRYPOINT_STALE: dist/cli/index.js is older than source/build inputs.",
        "Run `pnpm build` before running the compiled CLI lifecycle smoke."
      ].join(" ")
    );
  }
  return undefined;
}

function getCompiledCliReadiness(entrypointPath: string): CompiledCliReadiness {
  const error = getCompiledEntrypointFreshnessError(entrypointPath);
  return error === undefined ? { ready: true } : { ready: false, error };
}

describe("compiled CLI lifecycle smoke", () => {
  const compiledCliReadiness = getCompiledCliReadiness(compiledCliEntrypointPath);
  const compiledCliSmokeIt = compiledCliReadiness.ready || requireCompiledCliSmoke
    ? it
    : it.skip;

  it("fails clearly when the compiled CLI entrypoint is missing", async () => {
    const missingEntrypoint = resolve(
      "tests",
      "fixtures",
      "missing-dist",
      "cli",
      "index.js"
    );
    const cli = createCompiledCliHarness({ entrypointPath: missingEntrypoint });

    await expect(cli.run(["bubble", "status", "--help"])).rejects.toThrow(
      /COMPILED_CLI_ENTRYPOINT_MISSING:.*pnpm build/
    );
    expect(cli.invocations).toHaveLength(0);
  });

  compiledCliSmokeIt("runs create, start, restart, open, and delete through dist/cli/index.js", async () => {
    if (!compiledCliReadiness.ready) {
      throw compiledCliReadiness.error ?? new Error("Compiled CLI smoke is not ready.");
    }
    const entrypointPath = compiledCliEntrypointPath;

    const fixture = await createAlmostE2eSmokeFixtureRepo({
      prefix: "cli-lifecycle-smoke"
    });
    const cli = createCompiledCliHarness({ entrypointPath });
    const shims = await installCompiledCliShimEnvironment(fixture);
    const bubbleId = "smoke-cli-lifecycle";
    const commonEnv = shims.env;
    const expectedWorktreePath = expectedSmokeWorktreePath(fixture.root, bubbleId);
    let bubbleCreated = false;
    let bubbleDeleted = false;
    let observedWorktreePath: string | undefined;

    try {
      await cli.run(
        [
          "bubble",
          "create",
          "--id",
          bubbleId,
          "--repo",
          fixture.root,
          "--review-artifact-type",
          "code",
          "--task",
          "compiled CLI lifecycle smoke"
        ],
        { cwd: fixture.root, env: commonEnv }
      );
      bubbleCreated = true;

      const created = parseJson<BubbleStatusJson>(
        (await cli.run(
          ["bubble", "status", "--id", bubbleId, "--repo", fixture.root, "--json"],
          { cwd: fixture.root, env: commonEnv }
        )).stdout
      );
      expect(created.bubbleId).toBe(bubbleId);
      expect(created.state).toBe("CREATED");
      expect(created.worktreePath).toBe(expectedWorktreePath);
      observedWorktreePath = created.worktreePath;

      await cli.run(
        ["bubble", "start", "--id", bubbleId, "--repo", fixture.root],
        { cwd: fixture.root, env: commonEnv }
      );

      const running = parseJson<BubbleStatusJson>(
        (await cli.run(
          ["bubble", "status", "--id", bubbleId, "--repo", fixture.root, "--json"],
          { cwd: fixture.root, env: commonEnv }
        )).stdout
      );
      expect(running.state).toBe("RUNNING");
      expect(running.round).toBe(1);
      expect(running.worktreePath).toBeDefined();
      observedWorktreePath = running.worktreePath;
      await expect(access(running.worktreePath as string)).resolves.toBeUndefined();
      const sideEffectsAfterStart = await shims.readSideEffects();
      expect(
        sideEffectsAfterStart.some(
          (record) => record.tool === "tmux" && record.args[0] === "new-session"
        )
      ).toBe(true);
      expect(
        sideEffectsAfterStart.some(
          (record) => record.tool === "tmux" && record.args[0] === "send-keys"
        )
      ).toBe(true);
      expect(
        sideEffectsAfterStart.some(
          (record) =>
            record.tool === "tmux"
            && record.args[0] === "send-keys"
            && record.args.includes("-l")
        )
      ).toBe(true);
      expect(
        sideEffectsAfterStart.some(
          (record) =>
            record.tool === "tmux"
            && record.args[0] === "send-keys"
            && record.args.includes("Enter")
        )
      ).toBe(true);

      const sideEffectCountBeforeRestart = (await shims.readSideEffects()).length;

      await cli.run(
        ["bubble", "restart", "--id", bubbleId, "--repo", fixture.root],
        { cwd: fixture.root, env: commonEnv }
      );

      const sideEffectsAfterRestart = await shims.readSideEffects();
      const restartSideEffects = sideEffectsAfterRestart.slice(
        sideEffectCountBeforeRestart
      );
      expect(
        restartSideEffects.some(
          (record) => record.tool === "tmux" && record.args[0] === "kill-session"
        )
      ).toBe(true);
      expect(
        restartSideEffects.some(
          (record) => record.tool === "tmux" && record.args[0] === "new-session"
        )
      ).toBe(true);
      expect(
        restartSideEffects.some(
          (record) =>
            record.tool === "tmux"
            && record.args[0] === "send-keys"
            && record.args.includes("-l")
        )
      ).toBe(true);
      expect(
        restartSideEffects.some(
          (record) =>
            record.tool === "tmux"
            && record.args[0] === "send-keys"
            && record.args.includes("Enter")
        )
      ).toBe(true);

      const restarted = parseJson<BubbleStatusJson>(
        (await cli.run(
          ["bubble", "status", "--id", bubbleId, "--repo", fixture.root, "--json"],
          { cwd: fixture.root, env: commonEnv }
        )).stdout
      );
      expect(restarted.state).toBe("RUNNING");
      expect(restarted.worktreePath).toBe(running.worktreePath);

      const sideEffectCountBeforeOpen = (await shims.readSideEffects()).length;

      await cli.run(
        ["bubble", "open", "--id", bubbleId, "--repo", fixture.root],
        { cwd: fixture.root, env: commonEnv }
      );

      const sideEffectsAfterOpen = await shims.readSideEffects();
      const openSideEffects = sideEffectsAfterOpen.slice(sideEffectCountBeforeOpen);
      expect(
        openSideEffects.some(
          (record) =>
            record.tool === "pairflow-smoke-open"
            && record.args.includes(running.worktreePath as string)
        )
      ).toBe(true);

      const sideEffectCountBeforeDelete = (await shims.readSideEffects()).length;

      await cli.run(
        ["bubble", "delete", "--id", bubbleId, "--repo", fixture.root, "--force"],
        { cwd: fixture.root, env: commonEnv }
      );

      await expect(
        access(join(fixture.root, ".pairflow", "bubbles", bubbleId))
      ).rejects.toThrow();
      await expect(access(running.worktreePath as string)).rejects.toThrow();
      bubbleDeleted = true;

      const sideEffects = await shims.readSideEffects();
      const deleteSideEffects = sideEffects.slice(sideEffectCountBeforeDelete);
      expect(
        deleteSideEffects.some(
          (record) => record.tool === "tmux" && record.args[0] === "kill-session"
        )
      ).toBe(true);

      expect(commandNamesFor(cli.invocations)).toEqual([
        "bubble create",
        "bubble status",
        "bubble start",
        "bubble status",
        "bubble restart",
        "bubble status",
        "bubble open",
        "bubble delete"
      ]);
      for (const invocation of cli.invocations) {
        expect(invocation.entrypointPath).toBe(resolve("dist/cli/index.js"));
      }
      await expect(readFile(shims.repoRegistryPath, "utf8")).resolves.toContain(
        fixture.root
      );
    } finally {
      if (bubbleCreated && !bubbleDeleted) {
        await cli.run(
          ["bubble", "delete", "--id", bubbleId, "--repo", fixture.root, "--force"],
          { cwd: fixture.root, env: commonEnv }
        ).then(
          () => {
            bubbleDeleted = true;
          },
          (error: unknown) => {
            console.warn(
              `COMPILED_CLI_SMOKE_DELETE_CLEANUP_FAILED: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        );
      }
      if (
        !bubbleDeleted
        && observedWorktreePath !== undefined
        && isSafeSmokeWorktreeCleanupTarget(fixture.root, bubbleId, observedWorktreePath)
      ) {
        await rm(observedWorktreePath, { recursive: true, force: true });
      }
      if (!bubbleDeleted) {
        await rm(expectedWorktreePath, { recursive: true, force: true });
      }
      await fixture.cleanup();
    }
  }, 180_000);
});
