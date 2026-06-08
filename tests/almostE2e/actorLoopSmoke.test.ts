import { readdirSync, statSync } from "node:fs";
import { access, readFile, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createAlmostE2eSmokeFixtureRepo,
  createAlmostE2eSmokeRunner,
  createCompiledCliHarness,
  installCompiledCliShimEnvironment,
  type SmokeActorEmitInvoker,
  type SmokeAuthorityResolver
} from "../helpers/almostE2eSmoke/index.js";

interface BubbleStatusJson {
  bubbleId: string;
  state: string;
  round: number;
  worktreePath?: string;
  activeRole: "implementer" | "reviewer" | "meta_reviewer" | null;
  executionContext: {
    activeRole: "implementer" | "reviewer" | "meta_reviewer";
    awaitedOutputType: "pass_result" | "meta_review_result";
    handoffId: string;
    executionId: string;
    round: number;
  } | null;
  reviewPolicy?: {
    meta_review_consecutive_clean_runs_required: number;
  };
  metaReview: {
    consecutiveCleanRuns: number;
  };
  transcript: {
    totalMessages: number;
    lastMessageType: string | null;
  };
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

async function readTranscriptTypes(
  fixtureRoot: string,
  bubbleId: string
): Promise<string[]> {
  const raw = await readFile(
    join(fixtureRoot, ".pairflow", "bubbles", bubbleId, "transcript.ndjson"),
    "utf8"
  );
  return raw
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => (JSON.parse(line) as { type: string }).type);
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
        "COMPILED_CLI_ENTRYPOINT_MISSING: dist/cli/index.js is absent. Run `pnpm build` before running the compiled CLI actor-loop smoke."
      );
    }
    throw error;
  }
  const sourceFreshnessInputs = [
    "src",
    "scripts",
    "docs/reviewer-severity-ontology.md",
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
        "Run `pnpm build` before running the compiled CLI actor-loop smoke."
      ].join(" ")
    );
  }
  return undefined;
}

function getCompiledCliReadiness(entrypointPath: string): CompiledCliReadiness {
  const error = getCompiledEntrypointFreshnessError(entrypointPath);
  return error === undefined ? { ready: true } : { ready: false, error };
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

function createSingleCleanMetaReviewPairflowToml(): string {
  return [
    "[defaults]",
    'base_branch = "main"',
    "watchdog_timeout_minutes = 30",
    "max_rounds = 4",
    "",
    "[defaults.review_policy]",
    "meta_review_consecutive_clean_runs_required = 1",
    "",
    "[validation]",
    'required = ["lint", "typecheck"]',
    "",
    "[validation.commands]",
    'lint = "echo lint"',
    'typecheck = "echo typecheck"',
    ""
  ].join("\n");
}

describe("actor loop smoke", () => {
  const compiledCliReadiness = getCompiledCliReadiness(compiledCliEntrypointPath);
  const compiledCliSmokeIt = compiledCliReadiness.ready || requireCompiledCliSmoke
    ? it
    : it.skip;

  compiledCliSmokeIt("drives pass, convergence, and meta-review approve through public actor emit", async () => {
    if (!compiledCliReadiness.ready) {
      throw compiledCliReadiness.error ?? new Error("Compiled CLI smoke is not ready.");
    }

    const fixture = await createAlmostE2eSmokeFixtureRepo({
      prefix: "actor-loop-smoke",
      pairflowToml: createSingleCleanMetaReviewPairflowToml()
    });
    const cli = createCompiledCliHarness({ entrypointPath: compiledCliEntrypointPath });
    const shims = await installCompiledCliShimEnvironment(fixture);
    const bubbleId = "smoke-actor-loop";
    const commonEnv = shims.env;
    const expectedWorktreePath = expectedSmokeWorktreePath(fixture.root, bubbleId);
    let bubbleCreated = false;
    let bubbleDeleted = false;
    let observedWorktreePath: string | undefined;

    const status = async () =>
      parseJson<BubbleStatusJson>(
        (await cli.run(
          ["bubble", "status", "--id", bubbleId, "--repo", fixture.root, "--json"],
          { cwd: fixture.root, env: commonEnv }
        )).stdout
      );

    const actorEmitInvoker: SmokeActorEmitInvoker = async ({ args }) =>
      cli.run(args, {
        cwd: fixture.root,
        env: commonEnv,
        timeoutMs: 60_000
      });
    const authorityResolver: SmokeAuthorityResolver = async () => {
      const currentStatus = await status();
      if (currentStatus.executionContext === null) {
        return null;
      }
      return {
        handoffId: currentStatus.executionContext.handoffId,
        executionId: currentStatus.executionContext.executionId,
        awaitedOutputType: currentStatus.executionContext.awaitedOutputType,
        activeRole: currentStatus.executionContext.activeRole,
        round: currentStatus.executionContext.round,
        stateFingerprintGuardMode: "emit_surface"
      };
    };

    const runner = createAlmostE2eSmokeRunner({
      repoPath: fixture.root,
      bubbleId,
      scenario: {
        id: "actor-loop-smoke",
        steps: [
          {
            kind: "pass",
            label: "implementer-pass-round-1",
            summary: "Implementation smoke step complete.",
            expectedRole: "implementer",
            expectedRound: 1
          },
          {
            kind: "pass",
            label: "reviewer-pass-round-1",
            summary: "Reviewer found no blocking findings.",
            noFindings: true,
            expectedRole: "reviewer",
            expectedRound: 1
          },
          {
            kind: "pass",
            label: "implementer-pass-round-2",
            summary: "Implementation addressed the review loop.",
            expectedRole: "implementer",
            expectedRound: 2
          },
          {
            kind: "convergence",
            label: "reviewer-convergence",
            summary: "Reviewer convergence reached with no remaining findings.",
            expectedRole: "reviewer",
            expectedRound: 2
          },
          {
            kind: "meta_review_result",
            label: "meta-review-approve",
            round: 2,
            recommendation: "approve",
            summary: "No findings remain after this review.",
            reportJson: {
              findings_claim_state: "clean",
              findings_claim_source: "meta_review_artifact",
              findings_count: 0
            },
            expectedRole: "meta_reviewer",
            expectedRound: 2
          }
        ]
      },
      authorityResolver,
      actorEmitInvoker
    });

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
          "actor loop smoke"
        ],
        { cwd: fixture.root, env: commonEnv }
      );
      bubbleCreated = true;

      const created = await status();
      expect(created.state).toBe("CREATED");
      expect(created.worktreePath).toBe(expectedWorktreePath);
      observedWorktreePath = created.worktreePath;

      const bubbleToml = await readFile(
        join(fixture.root, ".pairflow", "bubbles", bubbleId, "bubble.toml"),
        "utf8"
      );
      expect(bubbleToml).toContain("meta_review_consecutive_clean_runs_required = 1");

      await expect(access(expectedWorktreePath)).rejects.toThrow();

      await runner.start({
        start: async () => {
          await cli.run(
            ["bubble", "start", "--id", bubbleId, "--repo", fixture.root],
            { cwd: fixture.root, env: commonEnv }
          );
          const started = await status();
          expect(started.worktreePath).toBe(expectedWorktreePath);
          runner.registerLaunch({
            bubbleId,
            workspacePath: started.worktreePath as string,
            statusCommand: "pairflow bubble status",
            implementerCommand: "codex",
            reviewerCommand: "claude",
            metaReviewerCommand: "codex"
          });
        }
      });

      const running = await status();
      expect(running.state).toBe("RUNNING");
      expect(running.round).toBe(1);
      expect(running.executionContext).toMatchObject({
        activeRole: "implementer",
        awaitedOutputType: "pass_result",
        round: 1
      });
      expect(running.reviewPolicy?.meta_review_consecutive_clean_runs_required).toBe(1);
      observedWorktreePath = running.worktreePath;

      await runner.advance("implementer-pass-round-1");
      const afterImplementerPassRound1 = await status();
      expect(afterImplementerPassRound1.state).toBe("RUNNING");
      expect(afterImplementerPassRound1.executionContext).toMatchObject({
        activeRole: "reviewer",
        awaitedOutputType: "pass_result",
        round: 1
      });
      expect(afterImplementerPassRound1.transcript.lastMessageType).toBe("PASS");

      await runner.advance("reviewer-pass-round-1");
      const afterReviewerPassRound1 = await status();
      expect(afterReviewerPassRound1.state).toBe("RUNNING");
      expect(afterReviewerPassRound1.executionContext).toMatchObject({
        activeRole: "implementer",
        awaitedOutputType: "pass_result",
        round: 2
      });

      await runner.advance("implementer-pass-round-2");
      const afterImplementerPassRound2 = await status();
      expect(afterImplementerPassRound2.state).toBe("RUNNING");
      expect(afterImplementerPassRound2.executionContext).toMatchObject({
        activeRole: "reviewer",
        awaitedOutputType: "pass_result",
        round: 2
      });

      await runner.advance("reviewer-convergence");
      const afterConvergence = await status();
      expect(afterConvergence.state).toBe("RUNNING");
      expect(afterConvergence.executionContext).toMatchObject({
        activeRole: "meta_reviewer",
        awaitedOutputType: "meta_review_result",
        round: 2
      });
      await expect(readTranscriptTypes(fixture.root, bubbleId)).resolves.toContain(
        "CONVERGENCE"
      );
      expect(afterConvergence.reviewPolicy?.meta_review_consecutive_clean_runs_required).toBe(1);

      await runner.advance("meta-review-approve");
      const approvalReady = await status();
      expect(approvalReady.state).toBe("READY_FOR_HUMAN_APPROVAL");
      expect(approvalReady.round).toBe(2);
      expect(approvalReady.executionContext).toBeNull();
      expect(approvalReady.metaReview.consecutiveCleanRuns).toBe(1);
      await expect(readTranscriptTypes(fixture.root, bubbleId)).resolves.toContain(
        "APPROVAL_REQUEST"
      );

      const snapshot = runner.snapshot();
      expect(snapshot.advances.map((advance) => advance.step.kind)).toEqual([
        "pass",
        "pass",
        "pass",
        "convergence",
        "meta_review_result"
      ]);
      expect(snapshot.advances.map((advance) => advance.authority.handoffId)).toEqual(
        expect.arrayContaining([
          running.executionContext?.handoffId,
          afterImplementerPassRound1.executionContext?.handoffId,
          afterReviewerPassRound1.executionContext?.handoffId,
          afterImplementerPassRound2.executionContext?.handoffId,
          afterConvergence.executionContext?.handoffId
        ])
      );
      expect(
        snapshot.advances.every((advance) =>
          advance.command.args.slice(0, 3).join(" ") === "agent emit --kind"
        )
      ).toBe(true);

      const actorEmitCommands = cli.invocations.filter(
        (invocation) =>
          invocation.argv[0] === "agent" && invocation.argv[1] === "emit"
      );
      expect(actorEmitCommands.map((invocation) => invocation.argv[3])).toEqual([
        "pass",
        "pass",
        "pass",
        "convergence",
        "meta_review_result"
      ]);
      expect(
        actorEmitCommands.every((invocation) =>
          invocation.argv.includes("--handoff-id")
          && invocation.argv.includes("--execution-id")
        )
      ).toBe(true);
      const metaReviewEmit = actorEmitCommands.at(-1);
      expect(metaReviewEmit?.argv).toEqual(expect.arrayContaining([
        "--round",
        "2",
        "--recommendation",
        "approve",
        "--summary",
        "No findings remain after this review.",
        "--report-json",
        JSON.stringify({
          findings_claim_state: "clean",
          findings_claim_source: "meta_review_artifact",
          findings_count: 0
        })
      ]));

      const sideEffects = await shims.readSideEffects();
      expect(
        sideEffects.some(
          (record) => record.tool === "tmux" && record.args[0] === "new-session"
        )
      ).toBe(true);
      expect(
        sideEffects.every((record) => {
          if (record.tool === "codex") {
            return record.args.join(" ") === "mcp list --json";
          }
          return record.tool === "tmux"
            && [
              "has-session",
              "new-session",
              "set-option",
              "set-window-option",
              "set-environment",
              "set-hook",
              "run-shell",
              "resize-pane",
              "respawn-pane",
              "split-window",
              "display-message",
              "capture-pane",
              "send-keys",
              "kill-session"
            ].includes(record.args[0] ?? "");
        })
      ).toBe(true);

      await cli.run(
        ["bubble", "delete", "--id", bubbleId, "--repo", fixture.root, "--force"],
        { cwd: fixture.root, env: commonEnv }
      );
      await expect(
        access(join(fixture.root, ".pairflow", "bubbles", bubbleId))
      ).rejects.toThrow();
      await expect(access(expectedWorktreePath)).rejects.toThrow();
      bubbleDeleted = true;
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
              `ACTOR_LOOP_SMOKE_DELETE_CLEANUP_FAILED: ${
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
  }, 240_000);
});
