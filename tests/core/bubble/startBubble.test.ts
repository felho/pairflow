import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawn } from "node:child_process";

import { afterEach, describe, expect, it, vi } from "vitest";

import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../src/v11/shared/state/executionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import {
  startBubbleV11 as startBubble,
  StartBubbleErrorV11 as StartBubbleError
} from "../../../src/v11/application/start/emitStartV11.js";
import {
  startBubble as startBubblePublicApi,
  StartBubbleError as PublicStartBubbleError
} from "../../../src/index.js";
import { upsertRuntimeSession } from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { BubbleLookupError } from "../../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import {
  REVIEWER_COMMAND_GATE_FORBIDDEN,
  REVIEWER_COMMAND_GATE_REQ_A,
  REVIEWER_COMMAND_GATE_REQ_B,
  REVIEWER_COMMAND_GATE_REQ_C,
  REVIEWER_COMMAND_GATE_REQ_D,
  REVIEWER_COMMAND_GATE_REQ_E,
  REVIEWER_COMMAND_GATE_REQ_F
} from "../../../src/v11/shared/reviewer/reviewerCommandGateGuidance.js";
import {
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "../../../src/v11/infrastructure/artifact/reviewer/testEvidenceRuntime.js";
import {
  resolveReviewerTestEvidenceArtifactPath
} from "../../../src/v11/shared/reviewer/testEvidence.js";
import {
  reviewerSeverityOntologyFullMarkdown
} from "../../../src/v11/shared/reviewer/reviewerSeverityOntology.generated.js";
import { shellQuote } from "../../../src/v11/shared/foundation/shellQuote.js";
import type { BubbleStateSnapshot } from "../../../src/types/bubble.js";
import type { WorktreeBootstrapInput } from "../../../src/v11/shared/ports/worktreeWorkspace.js";
import type * as WorktreeManagerModule from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { writeEvidenceLog } from "../../helpers/evidence.js";
import { buildWorktreeBootstrapResult } from "../../helpers/worktreeBootstrapResult.js";
import {
  reviewerPolicySnapshotFileName,
  reviewerPolicySnapshotUnavailableReasonCode
} from "../../../src/v11/application/start/startCommandContext.js";
import { buildResumedState } from "../../../src/v11/application/start/startCommandFlows.js";
import { startCommandContextDefaults } from "../../../src/v11/application/start/startCommandDependencyDefaults.js";
import type { UpsertRuntimeSessionInput } from "../../../src/v11/shared/ports/runtimeSessions.js";
import {
  remoteCloneExternalPairflowCommandEnvVar,
  remoteCloneStartModeEnvVar,
  remoteCloneStartModeValue,
  remoteCloneWorkspaceRootEnvVar
} from "../../../src/v11/application/start/startCommandRemoteExecution.js";
import type { ExecuteRemoteBubbleStartInput } from "../../../src/v11/application/start/startCommandContract.js";
import {
  readRemotePointer,
  readRemoteStateCache,
  writeRemotePointer
} from "../../../src/v11/infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { runGit } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix: string = "pairflow-start-bubble-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function addOriginRemote(repoPath: string, remoteName: string = "origin"): Promise<string> {
  const remotePath = await mkdtemp(join(tmpdir(), "pairflow-start-origin-"));
  tempDirs.push(remotePath);
  await runGit(remotePath, ["init", "--bare"]);
  await runGit(repoPath, ["remote", "add", remoteName, remotePath]);
  return remotePath;
}

async function assertBashParses(command: string): Promise<void> {
  const assertSnippetParses = async (snippet: string): Promise<void> => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn("bash", ["-n", "-c", snippet], {
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stderr = "";
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });

      child.on("error", (error) => {
        rejectPromise(error);
      });
      child.on("close", (code) => {
        if ((code ?? 1) !== 0) {
          rejectPromise(new Error(`bash could not parse command: ${stderr.trim()}`));
          return;
        }
        resolvePromise();
      });
    });
  };

  await assertSnippetParses(command);
  if (command.startsWith("bash -lc ")) {
    await assertSnippetParses(extractBashLcScript(command));
  }
}

function extractBashLcScript(command: string): string {
  const prefix = "bash -lc ";
  expect(command.startsWith(prefix)).toBe(true);
  const quotedScript = command.slice(prefix.length);
  expect(quotedScript.startsWith("'")).toBe(true);
  expect(quotedScript.endsWith("'")).toBe(true);
  return quotedScript.slice(1, -1).replace(/'\\''/gu, "'");
}

async function updateBubbleState(
  statePath: string,
  updater: (current: BubbleStateSnapshot) => BubbleStateSnapshot
): Promise<void> {
  const loaded = await readStateSnapshot(statePath);
  const nextState = updater(loaded.state);
  let normalizedState = nextState;

  if (nextState.state === "RUNNING" && nextState.active_role === "meta_reviewer") {
    normalizedState = {
      ...nextState,
      execution_context: metaReviewExecutionContextToRunningContext(
        nextState.meta_review?.execution_context ?? null
      )
    };
  } else if (nextState.state === "RUNNING") {
    if (nextState.round === 0) {
      normalizedState = {
        ...nextState,
        execution_context: null
      };
    } else if (nextState.active_role !== null && nextState.active_since !== null) {
      normalizedState = {
        ...nextState,
        execution_context: buildRunningExecutionContext({
          bubbleId: nextState.bubble_id,
          round: nextState.round,
          activeRole: nextState.active_role,
          startedAt: nextState.active_since,
          watchdogTimeoutMinutes: 60,
          attempt: nextState.execution_context?.attempt ?? 1
        })
      };
    }
  } else {
    normalizedState = {
      ...nextState,
      execution_context: null
    };
  }

  await writeStateSnapshot(
    statePath,
    normalizedState,
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: loaded.state.state
    }
  );
}

function expectNoForbiddenReviewerCommandGateTokens(text: string | undefined): void {
  expect(text).toBeDefined();
  for (const forbiddenToken of REVIEWER_COMMAND_GATE_FORBIDDEN) {
    expect(text).not.toContain(forbiddenToken);
  }
}

function expectReviewerValidationClaimGuardrails(text: string | undefined): void {
  expect(text).toBeDefined();
  expect(text).toContain(
    "Validation claim guardrail (applies to review output): derive validation claims from explicit evidence sources first, command-by-command for `lint`, `typecheck`, and `test`."
  );
  expect(text).toContain(
    "Never publish aggregate validation shorthand such as `typecheck/lint pass` or `all checks pass` without command-level evidence-backed statuses."
  );
  expect(text).toContain(
    "`Scout Coverage` must include command-level validation statuses: `lint=<pass|failed|not-run|unknown>`, `typecheck=<pass|failed|not-run|unknown>`, `test=<pass|failed|not-run|unknown>`."
  );
  expect(text).toContain(
    "Each validation status claim must cite an evidence source (for example evidence log path or transcript/reference anchor)."
  );
  expect(text).toContain(
    "Forbidden aggregate shorthand without command-level evidence: `typecheck/lint pass`, `all checks pass`, or equivalent aggregate phrasing."
  );
  expect(text).toContain(
    "If a command evidence source is missing or ambiguous, report `unknown` or `not-run` for that command and do not claim `pass`."
  );
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("startBubble", () => {
  it("starts ideation bubble in RUNNING round 0 and sends ideation kickoff guidance", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_ideation_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      ideation: true,
      cwd: repoPath
    });

    let capturedKickoff: string | undefined;
    let implementerCommand: string | undefined;
    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          capturedKickoff = input.implementerKickoffMessage;
          implementerCommand = input.implementerCommand;
          return Promise.resolve({ sessionName: "pf-b_start_ideation_01" });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          })
      }
    );

    expect(result.state.state).toBe("RUNNING");
    expect(result.state.round).toBe(0);
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round_role_history).toEqual([]);
    expect(capturedKickoff).toContain("kickoff (ideation pending)");
    expect(capturedKickoff).toContain(
      "no implementer action is required"
    );
    expect(capturedKickoff).toContain(
      "Stay idle and wait for explicit human instruction."
    );
    expect(implementerCommand).toContain(
      "Do nothing now. Stay idle."
    );
    expect(implementerCommand).toContain(
      "Do not read task files, scan the repository, or search for kickoff sources."
    );
    expect(implementerCommand).not.toContain(
      "Read task:"
    );
    expect(implementerCommand).not.toContain(
      "Implement in this worktree and run relevant validation before handoff."
    );
  });

  it("transitions CREATED -> PREPARING_WORKSPACE -> RUNNING and launches tmux", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Start bubble task",
      cwd: repoPath
    });

    const calls: string[] = [];
    let implementerCommand: string | undefined;
    let reviewerCommand: string | undefined;
    let metaReviewerCommand: string | undefined;
    const claims: Array<{
      bubbleId: string;
      session: string;
      worktreePath: string;
      workspacePath?: string;
      workspaceKind?: string;
    }> = [];
    const upserts: Array<{
      bubbleId: string;
      session: string;
      worktreePath: string;
      workspacePath?: string;
      workspaceKind?: string;
    }> = [];
    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: (bootstrapInput) => {
          calls.push("bootstrap");
          expect(bootstrapInput.localOverlay).toEqual({
            enabled: true,
            mode: "symlink",
            entries: [".claude", ".mcp.json", ".env.local", ".env.production"]
          });
          return Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          );
        },
        launchBubbleTmuxSession: (input) => {
          calls.push("launch");
          implementerCommand = input.implementerCommand;
          reviewerCommand = input.reviewerCommand;
          metaReviewerCommand = input.metaReviewerCommand;
          // Bootstrap messages removed — startup prompts are embedded in agent commands.
          expect(input.implementerBootstrapMessage).toBeUndefined();
          expect(input.reviewerBootstrapMessage).toBeUndefined();
          expect(input.implementerKickoffMessage).toContain(
            `bubble=${created.bubbleId} kickoff`
          );
          expect(input.implementerKickoffMessage).toContain(
            created.paths.taskArtifactPath
          );
          return Promise.resolve({ sessionName: "pf-b_start_01" });
        },
        claimRuntimeSession: (input) => {
          claims.push({
            bubbleId: input.bubbleId,
            session: input.tmuxSessionName,
            worktreePath: input.worktreePath,
            ...(input.workspacePath !== undefined
              ? { workspacePath: input.workspacePath }
              : {}),
            ...(input.workspaceKind !== undefined
              ? { workspaceKind: input.workspaceKind }
              : {})
          });
          return Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          });
        },
        upsertRuntimeSession: (input) => {
          upserts.push({
            bubbleId: input.bubbleId,
            session: input.tmuxSessionName,
            worktreePath: input.worktreePath,
            ...(input.workspacePath !== undefined
              ? { workspacePath: input.workspacePath }
              : {}),
            ...(input.workspaceKind !== undefined
              ? { workspaceKind: input.workspaceKind }
              : {})
          });
          return Promise.resolve({
            bubbleId: input.bubbleId,
            repoPath: input.repoPath,
            worktreePath: input.worktreePath,
            ...(input.workspacePath !== undefined
              ? { workspacePath: input.workspacePath }
              : {}),
            ...(input.workspaceKind !== undefined
              ? { workspaceKind: input.workspaceKind }
              : {}),
            tmuxSessionName: input.tmuxSessionName,
            updatedAt: "2026-02-22T13:00:00.000Z"
          });
        }
      }
    );

    expect(calls).toEqual(["bootstrap", "launch"]);
    expect(result.tmuxSessionName).toBe("pf-b_start_01");
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.active_agent).toBe("codex");
    expect(result.state.active_role).toBe("implementer");
    expect(result.state.round).toBe(1);
    expect(claims).toEqual([
      {
        bubbleId: created.bubbleId,
        session: "pf-b_start_01",
        worktreePath: created.paths.worktreePath
      }
    ]);
    expect(upserts).toEqual([
      {
        bubbleId: created.bubbleId,
        session: "pf-b_start_01",
        worktreePath: created.paths.worktreePath,
        workspacePath: created.paths.worktreePath,
        workspaceKind: "worktree"
      }
    ]);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");

    if (
      implementerCommand === undefined ||
      reviewerCommand === undefined ||
      metaReviewerCommand === undefined
    ) {
      throw new Error("Expected agent commands to be captured.");
    }
    const implementerScript = extractBashLcScript(implementerCommand);
    const reviewerScript = extractBashLcScript(reviewerCommand);
    const metaReviewerScript = extractBashLcScript(metaReviewerCommand);
    expect(implementerCommand).toContain("Dropping to interactive shell");
    expect(reviewerCommand).toContain("Dropping to interactive shell");
    expect(implementerScript).toContain("set +e");
    expect(reviewerScript).toContain("set +e");
    expect(implementerScript).toContain(
      `if ! cd ${shellQuote(created.paths.worktreePath)}; then`
    );
    expect(reviewerScript).toContain(
      `if ! cd ${shellQuote(created.paths.worktreePath)}; then`
    );
    expect(metaReviewerScript).toContain(
      `if ! cd ${shellQuote(created.paths.worktreePath)}; then`
    );
    expect(implementerCommand).toContain("exec bash -i");
    expect(reviewerCommand).toContain("exec bash -i");
    expect(implementerCommand).toContain("codex");
    expect(implementerCommand).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(implementerCommand).toContain("Pairflow implementer start");
    expect(implementerCommand).toContain(created.paths.taskArtifactPath);
    expect(implementerCommand).toContain(
      join(created.paths.artifactsDir, "done-package.md")
    );
    expect(implementerCommand).toContain(
      "Run validation via `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check`"
    );
    expect(implementerCommand).toContain(
      `Execute pairflow commands from this launch workspace path only (Phase 1C1 no-split worktree root): ${created.paths.worktreePath}.`
    );
    expect(implementerCommand).toContain("`executionContext.executionId`");
    expect(implementerCommand).toContain(
      "--handoff-id <handoff-id> --execution-id <execution-id> --summary"
    );
    expect(reviewerCommand).toContain("claude");
    expect(reviewerCommand).toContain("--dangerously-skip-permissions");
    expect(reviewerCommand).toContain("--permission-mode");
    expect(reviewerCommand).toContain("bypassPermissions");
    expect(reviewerCommand).toContain("Pairflow reviewer start");
    expect(reviewerCommand).not.toContain(
      "Reviewer brief (persisted artifact `reviewer-brief.md`)"
    );
    expect(reviewerCommand).toContain("Stand by first. Do not start reviewing");
    expect(reviewerCommand).toContain("Severity Ontology v1 reminder");
    expect(reviewerCommand).not.toContain(
      "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
    );
    expect(reviewerCommand).toContain(
      `Reviewer policy file: ${join(created.paths.artifactsDir, reviewerPolicySnapshotFileName)}`
    );
    expect(reviewerCommand).toContain("Read this file before first review action.");
    expect(reviewerCommand).toContain("Blocker severities (`P0/P1`) require concrete evidence");
    expect(reviewerCommand).toContain("Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default");
    expect(reviewerCommand).toContain("Cosmetic/comment-only findings are `P3`");
    expect(reviewerCommand).toContain("Out-of-scope observations should be notes (`P3`)");
    expect(reviewerCommand).toContain("Phase 1 reviewer round flow (prompt-level only):");
    expect(reviewerCommand).toContain("`Parallel Scout Scan`");
    expect(reviewerCommand).toContain(
      "same current worktree diff scope (`max_scout_agents=2` hard cap)"
    );
    expect(reviewerCommand).toContain("`required_scout_agents=2`");
    expect(reviewerCommand).toContain("`max_scout_agents=2`");
    expect(reviewerCommand).toContain("`max_scout_candidates_per_agent=8`");
    expect(reviewerCommand).toContain("`max_class_expansions_per_round=2`");
    expect(reviewerCommand).toContain("`max_expansion_siblings_per_class=5`");
    expect(metaReviewerCommand).toContain("codex");
    expect(metaReviewerCommand).toContain(
      "--dangerously-bypass-approvals-and-sandbox"
    );
    expect(metaReviewerCommand).toContain("Pairflow meta-reviewer start");
    expect(metaReviewerCommand).toContain("--report-json");
    expect(metaReviewerCommand).toContain("findings_claim_state");
    expect(metaReviewerCommand).toContain("findings_claim_source");
    expect(metaReviewerCommand).toContain("findings_count");
    expect(metaReviewerCommand).toContain("findings_claimed_open_total");
    expect(metaReviewerCommand).toContain("findings_blocking_open_total");
    expect(metaReviewerCommand).toContain("findings_advisory_open_total");
    expect(metaReviewerCommand).toContain(created.paths.taskArtifactPath);
    expect(reviewerCommand).toContain(
      "Summary scope guardrail: scope statements must cover only current worktree changes."
    );
    expect(reviewerCommand).toContain(
      "For summary scope claims, do not use branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(reviewerCommand).not.toContain(
      "For summary scope claims, do not use `git diff main..HEAD` or any branch-range diff (`<revA>..<revB>`)."
    );
    expect(reviewerCommand).toContain(
      "Do not derive summary scope from history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(reviewerCommand).toContain(
      "Establish scope from current worktree changes using `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard` (staged, unstaged, and untracked)."
    );
    expect(reviewerCommand).toContain(
      "If current worktree scope cannot be resolved reliably, avoid numeric file-operation claims."
    );
    expect(reviewerCommand).toMatch(/(<revA>\.\.<revB>|main\.\.HEAD)/);
    expect(reviewerCommand).toMatch(/git\s+(log|show)\s+--name-status/);
    expect(reviewerCommand).toMatch(/git diff --name-status/);
    expect(reviewerCommand).toMatch(
      /(cannot be resolved reliably|avoid numeric file-operation claims)/i
    );
    expect(reviewerCommand).toContain("Stop rules: stop expansion immediately when no new concrete locations are found");
    expect(reviewerCommand).toContain("repo-wide expansion scans are forbidden");
    expect(reviewerCommand).toContain("If class detection is uncertain, classify as `one_off`");
    expect(reviewerCommand).toContain("Required reviewer output contract (machine-checkable)");
    expect(reviewerCommand).toContain("`Scout Coverage`");
    expect(reviewerCommand).toContain("`Deduplicated Findings`");
    expect(reviewerCommand).toContain("`Issue-Class Expansions`");
    expect(reviewerCommand).toContain("`Residual Risk / Notes`");
    expect(reviewerCommand).toContain("`scouts_executed`, `scope_covered`, `guardrail_confirmation`, `raw_candidates_count`, `deduplicated_count`");
    expect(reviewerCommand).toContain(
      "`Scout Coverage.scope_covered` must describe current worktree changes only"
    );
    expect(reviewerCommand).toContain(
      "grounded in `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(reviewerCommand).not.toContain(
      "`Scout Coverage.scope_covered` must cover only current worktree changes, grounded in `git diff HEAD --name-status` + `git ls-files --others --exclude-standard` or the combined trio `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(reviewerCommand).toContain(
      "Do not justify `scope_covered` with branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(reviewerCommand).toContain(
      "Do not justify `scope_covered` with history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(reviewerCommand).toContain("`title`, `severity`, `class`, `locations`, `evidence`, `expansion_siblings`");
    expect(reviewerCommand).toContain("`class`, `source_finding_title`, `scan_scope`, `siblings`, `stop_reason`");
    expect(reviewerCommand).toContain("`Deduplicated Findings: []`");
    expect(reviewerCommand).toContain("`Issue-Class Expansions: []`");
    expectReviewerValidationClaimGuardrails(reviewerCommand);
    expect(reviewerCommand).toContain(
      "--handoff-id <handoff-id> --execution-id <execution-id> --summary"
    );
    expect(reviewerCommand).toContain("P1:...|artifact://...");
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_A);
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(reviewerCommand).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expectNoForbiddenReviewerCommandGateTokens(reviewerCommand);
    expect(implementerCommand).not.toContain("then;");
    expect(reviewerCommand).not.toContain("then;");
    const policySnapshotPath = join(
      created.paths.artifactsDir,
      reviewerPolicySnapshotFileName
    );
    const policySnapshot = await readFile(policySnapshotPath, "utf8");
    expect(policySnapshot).toBe(`${reviewerSeverityOntologyFullMarkdown}\n`);
    await assertBashParses(implementerCommand);
    await assertBashParses(reviewerCommand);
  });

  it("runs remote first-start through the remote execution seam and persists started artifacts", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote start task",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab",
      portForwards: [3000]
    });
    const expectedRemoteClonePath = `~/repos/${basename(repoPath)}--${created.bubbleId}`;

    const executeRemoteBubbleStart = vi.fn(async (input: ExecuteRemoteBubbleStartInput) => {
      const syncedBubbleToml = input.controlFiles.find((file) =>
        file.relativePath.endsWith("/bubble.toml")
      );
      const syncedState = input.controlFiles.find((file) =>
        file.relativePath.endsWith("/state.json")
      );
      expect(syncedBubbleToml?.content).toContain(`repo_path = "${input.remoteClonePath}"`);
      expect(JSON.parse(syncedState?.content ?? "{}")).toMatchObject({
        state: "CREATED"
      });
      return {
        remoteClonePath: input.remoteClonePath,
        tmuxSessionName: "pf-b_start_remote_01",
        startedAt: "2026-04-16T10:20:30.000Z",
        instanceId: "inst_20260416T102030000Z",
        remoteState: {
          lastCheckedAt: "2026-04-16T10:20:31.000Z",
          state: "RUNNING" as const,
          round: 4,
          maxRounds: 8,
          implementerStatus: "idle",
          reviewerStatus: "working"
        }
      };
    });

    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-04-16T10:20:30.000Z")
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "homelab",
              repo_base: "~/repos"
            }
          }
        }),
        executeRemoteBubbleStart,
        claimRuntimeSession: vi.fn(async () => {
          throw new Error("remote start must not claim runtime session ownership");
        }),
        bootstrapWorktreeWorkspace: vi.fn(async () => {
          throw new Error("remote start must not bootstrap a local worktree");
        }),
        launchBubbleTmuxSession: vi.fn(async () => {
          throw new Error("remote outer start must not launch local tmux");
        })
      }
    );

    expect(executeRemoteBubbleStart).toHaveBeenCalledTimes(1);
    expect(result.executionTarget).toBe("remote");
    expect(result.runtimeWorkspacePath).toBe(expectedRemoteClonePath);
    expect(result.tmuxSessionName).toBe("pf-b_start_remote_01");
    expect(result.state.state).toBe("RUNNING");

    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "started",
      host: "homelab",
      instanceId: "inst_20260416T102030000Z",
      remoteClonePath: expectedRemoteClonePath,
      tmuxSession: "pf-b_start_remote_01",
      startedAt: "2026-04-16T10:20:30.000Z",
      portForwards: [3000]
    });
    await expect(readRemoteStateCache(created.paths.remoteStateCachePath)).resolves.toEqual({
      lastCheckedAt: "2026-04-16T10:20:31.000Z",
      state: "RUNNING",
      round: 4,
      maxRounds: 8,
      implementerStatus: "idle",
      reviewerStatus: "working"
    });
    await expect(readStateSnapshot(created.paths.statePath)).resolves.toMatchObject({
      state: {
        state: "RUNNING"
      }
    });
  });

  it("fails closed before remote execution when the created remote pointer is missing", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_missing_pointer_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote pointer missing",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );

    const executeRemoteBubbleStart = vi.fn(async () => {
      throw new Error("should not execute remote start");
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T10:30:00.000Z")
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "homelab",
                repo_base: "~/repos"
              }
            }
          }),
          executeRemoteBubbleStart
        }
      )
    ).rejects.toThrow(/START_REMOTE_POINTER_MISSING/u);

    expect(executeRemoteBubbleStart).not.toHaveBeenCalled();
  });

  it("fails remote preflight before SSH execution when origin is missing", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_remote_preflight_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote preflight",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });

    const executeRemoteBubbleStart = vi.fn(async () => {
      throw new Error("should not execute remote start");
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T10:40:00.000Z")
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "homelab",
                repo_base: "~/repos"
              }
            }
          }),
          executeRemoteBubbleStart
        }
      )
    ).rejects.toThrow(/START_REMOTE_PREFLIGHT_FAILED/u);

    expect(executeRemoteBubbleStart).not.toHaveBeenCalled();
    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
  });

  it("fails remote preflight before SSH execution when the repository has tracked dirty changes", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_preflight_dirty_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote preflight dirty",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });
    await writeFile(join(repoPath, "README.md"), "# Pairflow dirty\n", "utf8");

    const executeRemoteBubbleStart = vi.fn(async () => {
      throw new Error("should not execute remote start");
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T10:42:00.000Z")
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "homelab",
                repo_base: "~/repos"
              }
            }
          }),
          executeRemoteBubbleStart
        }
      )
    ).rejects.toThrow(/START_REMOTE_PREFLIGHT_FAILED/u);

    expect(executeRemoteBubbleStart).not.toHaveBeenCalled();
    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
  });

  it("fails closed before SSH execution when the created pointer host drifts from the configured remote host", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_host_drift_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote host drift",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "old-homelab"
    });

    const executeRemoteBubbleStart = vi.fn(async () => {
      throw new Error("should not execute remote start");
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T10:45:00.000Z")
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "homelab",
                repo_base: "~/repos"
              }
            }
          }),
          executeRemoteBubbleStart
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_POINTER_INVALID"
    });

    expect(executeRemoteBubbleStart).not.toHaveBeenCalled();
    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "old-homelab"
    });
  });

  it("fails closed before remote execution when the configured remote alias is missing", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_config_invalid_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote config invalid",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });

    const executeRemoteBubbleStart = vi.fn(async () => {
      throw new Error("should not execute remote start");
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T10:45:00.000Z")
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              other: {
                host: "other",
                repo_base: "~/repos"
              }
            }
          }),
          executeRemoteBubbleStart
        }
      )
    ).rejects.toThrow(/START_REMOTE_CONFIG_INVALID/u);

    expect(executeRemoteBubbleStart).not.toHaveBeenCalled();
    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
  });

  it("reports remote warning messages and still succeeds when the sync hook warns", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_warning_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote warning task",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });

    const warnings: string[] = [];
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-04-16T10:50:00.000Z")
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "homelab",
              repo_base: "~/repos",
              pairflow_sync_command: "false"
            }
          }
        }),
        executeRemoteBubbleStart: async (input) => ({
          remoteClonePath: input.remoteClonePath,
          tmuxSessionName: "pf-b_start_remote_warning_01",
          startedAt: "2026-04-16T10:50:00.000Z",
          instanceId: "inst_warning_01",
          remoteState: {
            lastCheckedAt: "2026-04-16T10:50:01.000Z",
            state: "RUNNING" as const,
            round: 1,
            maxRounds: 8
          },
          warnings: ["Pairflow warning: remote sync hook failed but start will continue"]
        }),
        reportWarning: (message) => {
          warnings.push(message);
        }
      }
    );

    expect(warnings).toEqual([
      "Pairflow warning: remote sync hook failed but start will continue"
    ]);
  });

  it("does not recurse into remote orchestration during explicit inner remote start", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_remote_inner_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote inner start task",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );

    const previousMode = process.env[remoteCloneStartModeEnvVar];
    const previousExternalPairflowCommand =
      process.env[remoteCloneExternalPairflowCommandEnvVar];
    const previousWorkspaceRoot = process.env[remoteCloneWorkspaceRootEnvVar];
    const previousPairflowWorktreeRoot = process.env.PAIRFLOW_WORKTREE_ROOT;
    process.env[remoteCloneStartModeEnvVar] = remoteCloneStartModeValue;
    process.env[remoteCloneExternalPairflowCommandEnvVar] =
      "/home/dev/.local/share/pnpm/pairflow";
    process.env[remoteCloneWorkspaceRootEnvVar] = repoPath;
    process.env.PAIRFLOW_WORKTREE_ROOT = repoPath;
    try {
      const result = await startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T11:00:00.000Z")
        },
        {
          claimRuntimeSession: vi.fn(async () => {
            throw new Error("inner remote start must not claim runtime session");
          }),
          bootstrapWorktreeWorkspace: vi.fn(async () => {
            throw new Error("inner remote start must not bootstrap a worktree");
          }),
          executeRemoteBubbleStart: vi.fn(async () => {
            throw new Error("inner remote start must not re-enter remote SSH execution");
          }),
          launchBubbleTmuxSession: vi.fn(async (input) => {
            expect(extractBashLcScript(input.statusCommand)).toContain(
              "'/home/dev/.local/share/pnpm/pairflow' bubble status --id"
            );
            expect(extractBashLcScript(input.implementerCommand)).toContain(
              "export PAIRFLOW_EXTERNAL_COMMAND='/home/dev/.local/share/pnpm/pairflow'"
            );
            return {
              sessionName: "pf-b_start_remote_inner_01"
            };
          })
        }
      );

      expect(result.executionTarget).toBe("remote");
      expect(result.runtimeWorkspacePath).toBe(repoPath);
      expect(result.tmuxSessionName).toBe("pf-b_start_remote_inner_01");
      expect(result.state.state).toBe("RUNNING");
    } finally {
      if (previousMode === undefined) {
        delete process.env[remoteCloneStartModeEnvVar];
      } else {
        process.env[remoteCloneStartModeEnvVar] = previousMode;
      }
      if (previousExternalPairflowCommand === undefined) {
        delete process.env[remoteCloneExternalPairflowCommandEnvVar];
      } else {
        process.env[remoteCloneExternalPairflowCommandEnvVar] =
          previousExternalPairflowCommand;
      }
      if (previousWorkspaceRoot === undefined) {
        delete process.env[remoteCloneWorkspaceRootEnvVar];
      } else {
        process.env[remoteCloneWorkspaceRootEnvVar] = previousWorkspaceRoot;
      }
      if (previousPairflowWorktreeRoot === undefined) {
        delete process.env.PAIRFLOW_WORKTREE_ROOT;
      } else {
        process.env.PAIRFLOW_WORKTREE_ROOT = previousPairflowWorktreeRoot;
      }
    }
  });

  it("fails closed when remote inner-start env leaks into a non-ssh bubble", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_remote_env_leak_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote env leak",
      cwd: repoPath
    });

    const previousMode = process.env[remoteCloneStartModeEnvVar];
    const previousWorkspaceRoot = process.env[remoteCloneWorkspaceRootEnvVar];
    process.env[remoteCloneStartModeEnvVar] = remoteCloneStartModeValue;
    process.env[remoteCloneWorkspaceRootEnvVar] = repoPath;
    try {
      await expect(
        startBubble(
          {
            bubbleId: created.bubbleId,
            cwd: repoPath,
            now: new Date("2026-04-16T11:05:00.000Z")
          }
        )
      ).rejects.toMatchObject({
        reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID"
      });
    } finally {
      if (previousMode === undefined) {
        delete process.env[remoteCloneStartModeEnvVar];
      } else {
        process.env[remoteCloneStartModeEnvVar] = previousMode;
      }
      if (previousWorkspaceRoot === undefined) {
        delete process.env[remoteCloneWorkspaceRootEnvVar];
      } else {
        process.env[remoteCloneWorkspaceRootEnvVar] = previousWorkspaceRoot;
      }
    }
  });

  it("fails closed when remote inner-start env leaks into a local ssh source repo", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_source_env_leak_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote source env leak",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });

    const previousMode = process.env[remoteCloneStartModeEnvVar];
    const previousWorkspaceRoot = process.env[remoteCloneWorkspaceRootEnvVar];
    const previousPairflowWorktreeRoot = process.env.PAIRFLOW_WORKTREE_ROOT;
    process.env[remoteCloneStartModeEnvVar] = remoteCloneStartModeValue;
    process.env[remoteCloneWorkspaceRootEnvVar] = repoPath;
    process.env.PAIRFLOW_WORKTREE_ROOT = repoPath;
    const executeRemoteBubbleStart = vi.fn(async () => {
      throw new Error("source repo env leak must not bypass remote SSH activation");
    });
    try {
      await expect(
        startBubble(
          {
            bubbleId: created.bubbleId,
            cwd: repoPath,
            now: new Date("2026-04-16T11:06:00.000Z")
          },
          {
            loadPairflowGlobalConfig: async () => ({
              remotes: {
                homelab: {
                  host: "homelab",
                  repo_base: "~/repos"
                }
              }
            }),
            executeRemoteBubbleStart,
            launchBubbleTmuxSession: vi.fn(async () => {
              throw new Error("source repo env leak must not launch local inner-start tmux");
            })
          }
        )
      ).rejects.toMatchObject({
        reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID"
      });
    } finally {
      if (previousMode === undefined) {
        delete process.env[remoteCloneStartModeEnvVar];
      } else {
        process.env[remoteCloneStartModeEnvVar] = previousMode;
      }
      if (previousWorkspaceRoot === undefined) {
        delete process.env[remoteCloneWorkspaceRootEnvVar];
      } else {
        process.env[remoteCloneWorkspaceRootEnvVar] = previousWorkspaceRoot;
      }
      if (previousPairflowWorktreeRoot === undefined) {
        delete process.env.PAIRFLOW_WORKTREE_ROOT;
      } else {
        process.env.PAIRFLOW_WORKTREE_ROOT = previousPairflowWorktreeRoot;
      }
    }

    expect(executeRemoteBubbleStart).not.toHaveBeenCalled();
    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
    await expect(readStateSnapshot(created.paths.statePath)).resolves.toMatchObject({
      state: {
        state: "CREATED"
      }
    });
  });

  it("fails closed when local RUNNING reconciliation fails after remote confirmation", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_persist_fail_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote persist failure",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T11:10:00.000Z")
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "homelab",
                repo_base: "~/repos"
              }
            }
          }),
          executeRemoteBubbleStart: async (input) => ({
            remoteClonePath: input.remoteClonePath,
            tmuxSessionName: "pf-b_start_remote_persist_fail_01",
            startedAt: "2026-04-16T11:10:00.000Z",
            instanceId: "inst_persist_fail_01",
            remoteState: {
              lastCheckedAt: "2026-04-16T11:10:01.000Z",
              state: "RUNNING" as const,
              round: 1,
              maxRounds: 8
            }
          }),
          writeStateSnapshot: async (statePath, state, options) => {
            if (state.state === "RUNNING") {
              throw new Error("forced running persistence failure");
            }
            return writeStateSnapshot(statePath, state, options);
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_RECONCILIATION_FAILED"
    });

    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
    await expect(readRemoteStateCache(created.paths.remoteStateCachePath)).resolves.toBeNull();
    await expect(readStateSnapshot(created.paths.statePath)).resolves.toMatchObject({
      state: {
        state: "FAILED"
      }
    });
  });

  it("fails closed when the confirmed remote snapshot is not RUNNING", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_confirmation_invalid_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote confirmation invalid",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T11:10:30.000Z")
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "homelab",
                repo_base: "~/repos"
              }
            }
          }),
          executeRemoteBubbleStart: async (input) => ({
            remoteClonePath: input.remoteClonePath,
            tmuxSessionName: "pf-b_start_remote_confirmation_invalid_01",
            startedAt: "2026-04-16T11:10:30.000Z",
            instanceId: "inst_confirmation_invalid_01",
            remoteState: {
              lastCheckedAt: "2026-04-16T11:10:31.000Z",
              state: "WAITING_HUMAN" as const,
              round: 1,
              maxRounds: 8
            }
          })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_CONFIRMATION_INVALID"
    });

    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
    await expect(readRemoteStateCache(created.paths.remoteStateCachePath)).resolves.toBeNull();
    await expect(readStateSnapshot(created.paths.statePath)).resolves.toMatchObject({
      state: {
        state: "FAILED"
      }
    });
  });

  it("surfaces rollback failures when local reconciliation rollback also fails", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_rollback_fail_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote rollback failure",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });

    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-04-16T11:11:00.000Z")
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            homelab: {
              host: "homelab",
              repo_base: "~/repos"
            }
          }
        }),
        executeRemoteBubbleStart: async (input) => ({
          remoteClonePath: input.remoteClonePath,
          tmuxSessionName: "pf-b_start_remote_rollback_fail_01",
          startedAt: "2026-04-16T11:11:00.000Z",
          instanceId: "inst_rollback_fail_01",
          remoteState: {
            lastCheckedAt: "2026-04-16T11:11:01.000Z",
            state: "RUNNING" as const,
            round: 1,
            maxRounds: 8
          }
        }),
        writeStateSnapshot: async (statePath, state, options) => {
          if (state.state === "RUNNING") {
            throw new Error("forced running persistence failure");
          }
          return writeStateSnapshot(statePath, state, options);
        },
        removeRemoteStateCache: async () => {
          throw new Error("forced cache rollback failure");
        },
        writeRemotePointer: async (path, value) => {
          if (value.kind === "created") {
            throw new Error("forced pointer rollback failure");
          }
          return writeRemotePointer(path, value);
        }
      }
    ).catch((error: unknown) => error);

    expect(result).toBeInstanceOf(StartBubbleError);
    expect(result).toMatchObject({
      reasonCode: "START_REMOTE_RECONCILIATION_ROLLBACK_FAILED"
    });
    if (!(result instanceof StartBubbleError)) {
      throw new Error("Expected rollback failure to throw StartBubbleError.");
    }
    expect(result.context?.rollback_failures).toEqual([
      "remote_state_cache=forced cache rollback failure",
      "remote_pointer=forced pointer rollback failure"
    ]);
  });

  it("fails closed when remote SSH execution throws before runtime confirmation", async () => {
    const repoPath = await createTempRepo();
    await addOriginRemote(repoPath);
    const created = await createBubble({
      id: "b_start_remote_exec_fail_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Remote execution failure",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        executor: {
          type: "ssh",
          remote: "homelab"
        }
      }),
      "utf8"
    );
    await writeRemotePointer(created.paths.remotePointerPath, {
      kind: "created",
      host: "homelab"
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-04-16T11:05:00.000Z")
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              homelab: {
                host: "homelab",
                repo_base: "~/repos"
              }
            }
          }),
          executeRemoteBubbleStart: async () => {
            throw new Error("simulated remote ssh mid-sequence failure");
          }
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_EXECUTION_FAILED"
    });

    await expect(readRemotePointer(created.paths.remotePointerPath)).resolves.toEqual({
      kind: "created",
      host: "homelab"
    });
    await expect(readRemoteStateCache(created.paths.remoteStateCachePath)).resolves.toBeNull();
    await expect(readStateSnapshot(created.paths.statePath)).resolves.toMatchObject({
      state: {
        state: "FAILED"
      }
    });
  });

  it("persists fresh canonical launch workspace authority before tmux launch", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_canonical_workspace_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Persist canonical launch workspace"
    });

    const canonicalWorkspacePath = `${created.paths.worktreePath}/../canonicalized-worktree`;
    let capturedUpsertInput: UpsertRuntimeSessionInput | undefined;
    const upsertRuntimeSessionMock = vi.fn(async (input: UpsertRuntimeSessionInput) => {
      capturedUpsertInput = input;
      return {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.worktreePath,
      ...(input.workspacePath !== undefined
        ? { workspacePath: input.workspacePath }
        : {}),
      ...(input.workspaceKind !== undefined
        ? { workspaceKind: input.workspaceKind }
        : {}),
      tmuxSessionName: input.tmuxSessionName,
      updatedAt: "2026-02-22T14:00:00.000Z"
      };
    });

    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T14:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath,
            workspacePath: canonicalWorkspacePath,
            workspaceKind: "worktree",
            branchPrepared: true
          }),
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T14:00:00.000Z"
            }
          }),
        upsertRuntimeSession: upsertRuntimeSessionMock,
        launchBubbleTmuxSession: (input) => {
          expect(input.workspacePath).toBe(canonicalWorkspacePath);
          return Promise.resolve({
            sessionName: "pf-b_start_canonical_workspace_01"
          });
        }
      }
    );

    expect(capturedUpsertInput).toMatchObject({
      bubbleId: created.bubbleId,
      worktreePath: created.paths.worktreePath,
      workspacePath: canonicalWorkspacePath,
      workspaceKind: "worktree"
    });
    expect(capturedUpsertInput?.tmuxSessionName).toEqual(expect.any(String));
  });

  it("runs configured commands.bootstrap from the canonical launch workspace", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_bootstrap_canonical_workspace_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Run bootstrap command in canonical workspace",
      bootstrapCommand: "pnpm install --frozen-lockfile && pnpm build",
      cwd: repoPath
    });
    const canonicalWorkspacePath = `${created.paths.worktreePath}/../canonicalized-worktree`;

    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T14:10:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath,
            workspacePath: canonicalWorkspacePath,
            workspaceKind: "worktree",
            branchPrepared: true
          }),
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T14:10:00.000Z"
            }
          }),
        runWorktreeBootstrapCommand: async (input) => {
          expect(input.workspacePath).toBe(canonicalWorkspacePath);
          expect(input.worktreePath).toBe(created.paths.worktreePath);
          expect(input.command).toBe("pnpm install --frozen-lockfile && pnpm build");
        },
        launchBubbleTmuxSession: (input) => {
          expect(input.workspacePath).toBe(canonicalWorkspacePath);
          return Promise.resolve({
            sessionName: "pf-b_start_bootstrap_canonical_workspace_01"
          });
        }
      }
    );
  });

  it("accepts fresh bootstrap clone workspace authority when canonical authority is explicit", async () => {
    vi.resetModules();
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_bootstrap_clone_authority_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Fresh bootstrap clone authority is launched from explicit canonical authority"
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        work_mode: "clone"
      }),
      "utf8"
    );

    let upsertInput:
      | {
          workspacePath: string | undefined;
          workspaceKind: string | undefined;
        }
      | undefined;
    let launchCalled = false;
    let cleanupCalled = false;
    let removeCalled = false;
    let requestedWorkspaceKind: string | undefined;

    try {
      const actualWorktreeManager =
        await vi.importActual<typeof WorktreeManagerModule>(
          "../../../src/v11/infrastructure/workspace/worktreeManager.js"
        );
      vi.doMock("../../../src/v11/infrastructure/workspace/worktreeManager.js", () => ({
        ...actualWorktreeManager,
        bootstrapWorktreeWorkspace: vi.fn(async (bootstrapInput: WorktreeBootstrapInput) => {
          requestedWorkspaceKind = bootstrapInput.workspaceKind;
          return {
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath,
            workspacePath: `${created.paths.worktreePath}/../clone-authority`,
            workspaceKind: "clone" as const,
            branchPrepared: true
          };
        })
      }));

      const { startBubbleV11: startBubbleWithMock } = await import(
        "../../../src/v11/application/start/emitStartV11.js"
      );

      const result = await startBubbleWithMock(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T14:20:00.000Z")
        },
        {
          claimRuntimeSession: (input) =>
            Promise.resolve({
              claimed: true,
              record: {
                bubbleId: input.bubbleId,
                repoPath: input.repoPath,
                worktreePath: input.worktreePath,
                tmuxSessionName: input.tmuxSessionName,
                updatedAt: "2026-02-22T14:20:00.000Z"
              }
            }),
          upsertRuntimeSession: async (input) => {
            const workspacePath = input.workspacePath;
            const workspaceKind = input.workspaceKind;
            upsertInput = {
              workspacePath,
              workspaceKind
            };
            expect(workspacePath).toBe(`${created.paths.worktreePath}/../clone-authority`);
            expect(workspaceKind).toBe("clone");
            return {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              workspacePath: workspacePath!,
              workspaceKind: workspaceKind!,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T14:20:00.000Z"
            };
          },
          launchBubbleTmuxSession: async (input) => {
            launchCalled = true;
            expect(input.workspacePath).toBe(
              `${created.paths.worktreePath}/../clone-authority`
            );
            return { sessionName: "pf-b_start_bootstrap_clone_authority_01" };
          },
          cleanupWorktreeWorkspace: async () => {
            cleanupCalled = true;
            return {
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath,
              removedWorktree: true,
              removedBranch: true
            };
          },
          removeRuntimeSession: async () => {
            removeCalled = true;
            return true;
          }
        }
      );

      expect(result.state.state).toBe("RUNNING");
      expect(upsertInput).toEqual({
        workspacePath: `${created.paths.worktreePath}/../clone-authority`,
        workspaceKind: "clone"
      });
      expect(requestedWorkspaceKind).toBe("clone");
      expect(launchCalled).toBe(true);
      expect(cleanupCalled).toBe(false);
      expect(removeCalled).toBe(false);
    } finally {
      vi.doUnmock("../../../src/v11/infrastructure/workspace/worktreeManager.js");
      vi.resetModules();
    }
  });

  it("runs clone-mode fresh start through runtime mutation and requests clone bootstrap topology", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_clone_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Clone mode starts successfully from a local clone workspace",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        work_mode: "clone"
      }),
      "utf8"
    );

    let claimCalled = false;
    let launchCalled = false;
    let removeCalled = false;
    let upsertCalled = false;

    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:01:00.000Z")
      },
      {
        claimRuntimeSession: () => {
          claimCalled = true;
          return Promise.resolve({
            claimed: true,
            record: {
              bubbleId: created.bubbleId,
              repoPath,
              worktreePath: created.paths.worktreePath,
              tmuxSessionName: "pf-b_start_clone_01",
              updatedAt: "2026-02-22T13:01:00.000Z"
            }
          });
        },
        upsertRuntimeSession: (input) => {
          const workspacePath = input.workspacePath;
          const workspaceKind = input.workspaceKind;
          upsertCalled = true;
          expect(workspacePath).toBe(created.paths.worktreePath);
          expect(workspaceKind).toBe("clone");
          return Promise.resolve({
            bubbleId: input.bubbleId,
            repoPath: input.repoPath,
            worktreePath: input.worktreePath,
            workspacePath: workspacePath!,
            workspaceKind: workspaceKind!,
            tmuxSessionName: input.tmuxSessionName,
            updatedAt: "2026-02-22T13:01:00.000Z"
          });
        },
        launchBubbleTmuxSession: (input) => {
          launchCalled = true;
          expect(input.workspacePath).toBe(created.paths.worktreePath);
          return Promise.resolve({ sessionName: "pf-b_start_clone_01" });
        },
        removeRuntimeSession: () => {
          removeCalled = true;
          return Promise.resolve(true);
        }
      }
    );

    expect(result.state.state).toBe("RUNNING");
    expect(claimCalled).toBe(true);
    expect(upsertCalled).toBe(true);
    expect(launchCalled).toBe(true);
    expect(removeCalled).toBe(false);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");
  });

  it("runs commands.bootstrap from clone canonical workspace authority before tmux launch", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_clone_bootstrap_cmd_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Clone mode runs bootstrap command from canonical authority",
      bootstrapCommand: "pnpm install --frozen-lockfile && pnpm build",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        work_mode: "clone"
      }),
      "utf8"
    );

    const callOrder: string[] = [];

    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:03:00.000Z")
      },
      {
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:03:00.000Z"
            }
          }),
        runWorktreeBootstrapCommand: async (input) => {
          callOrder.push("workspace");
          callOrder.push("commands.bootstrap");
          expect(input.workspacePath).toBe(created.paths.worktreePath);
          expect(input.worktreePath).toBe(created.paths.worktreePath);
        },
        launchBubbleTmuxSession: (input) => {
          callOrder.push("launch");
          expect(input.workspacePath).toBe(created.paths.worktreePath);
          return Promise.resolve({ sessionName: "pf-b_start_clone_bootstrap_cmd_01" });
        }
      }
    );

    expect(callOrder).toEqual(["workspace", "commands.bootstrap", "launch"]);
  });

  it("fails startup when clone bootstrap returns a mismatched workspace kind", async () => {
    vi.resetModules();
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_clone_workspace_kind_mismatch_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Clone mode must fail closed when bootstrap returns worktree authority",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        work_mode: "clone"
      }),
      "utf8"
    );

    let upsertCalled = false;
    let launchCalled = false;
    let cleanupCalled = false;
    const removedSessions: string[] = [];
    let requestedWorkspaceKind: string | undefined;

    try {
      const actualWorktreeManager =
        await vi.importActual<typeof WorktreeManagerModule>(
          "../../../src/v11/infrastructure/workspace/worktreeManager.js"
        );
      vi.doMock("../../../src/v11/infrastructure/workspace/worktreeManager.js", () => ({
        ...actualWorktreeManager,
        bootstrapWorktreeWorkspace: vi.fn(async (bootstrapInput: WorktreeBootstrapInput) => {
          requestedWorkspaceKind = bootstrapInput.workspaceKind;
          return {
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath,
            workspacePath: created.paths.worktreePath,
            workspaceKind: "worktree" as const,
            branchPrepared: true
          };
        })
      }));

      const {
        startBubbleV11: startBubbleWithMock,
        StartBubbleErrorV11: StartBubbleErrorWithMock
      } = await import("../../../src/v11/application/start/emitStartV11.js");

      const thrown = await startBubbleWithMock(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T13:04:00.000Z")
        },
        {
          claimRuntimeSession: (input) =>
            Promise.resolve({
              claimed: true,
              record: {
                bubbleId: input.bubbleId,
                repoPath: input.repoPath,
                worktreePath: input.worktreePath,
                tmuxSessionName: input.tmuxSessionName,
                updatedAt: "2026-02-22T13:04:00.000Z"
              }
            }),
          upsertRuntimeSession: async () => {
            upsertCalled = true;
            throw new Error("upsert should not run after workspace-kind mismatch");
          },
          launchBubbleTmuxSession: async () => {
            launchCalled = true;
            return { sessionName: "pf-b_start_clone_workspace_kind_mismatch_01" };
          },
          cleanupWorktreeWorkspace: async () => {
            cleanupCalled = true;
            return {
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath,
              removedWorktree: true,
              removedBranch: true
            };
          },
          removeRuntimeSession: async (input) => {
            removedSessions.push(input.bubbleId);
            return true;
          }
        }
      ).catch((error: unknown) => error);

      expect(thrown).toBeInstanceOf(StartBubbleErrorWithMock);
      expect((thrown as InstanceType<typeof StartBubbleErrorWithMock>).reasonCode).toBe(
        "START_LAUNCH_WORKSPACE_UNAVAILABLE"
      );
      expect((thrown as Error).message).toContain(
        "bootstrap returned workspace kind worktree, but start requested clone"
      );
      expect(requestedWorkspaceKind).toBe("clone");
      expect(upsertCalled).toBe(false);
      expect(launchCalled).toBe(false);
      expect(cleanupCalled).toBe(true);
      expect(removedSessions).toEqual([created.bubbleId]);

      const loaded = await readStateSnapshot(created.paths.statePath);
      expect(loaded.state.state).toBe("FAILED");
    } finally {
      vi.doUnmock("../../../src/v11/infrastructure/workspace/worktreeManager.js");
      vi.resetModules();
    }
  });

  it("fails startup when worktree bootstrap returns a mismatched clone workspace kind", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_worktree_kind_mismatch_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Worktree mode must fail closed when bootstrap returns clone authority",
      cwd: repoPath
    });

    let upsertCalled = false;
    let launchCalled = false;
    let cleanupCalled = false;
    const removedSessions: string[] = [];

    const thrown = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:05:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: async () => ({
          repoPath,
          baseRef: "refs/heads/main",
          bubbleBranch: created.config.bubble_branch,
          worktreePath: created.paths.worktreePath,
          workspacePath: `${created.paths.worktreePath}/../clone-authority`,
          workspaceKind: "clone",
          branchPrepared: true
        }),
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:05:00.000Z"
            }
          }),
        upsertRuntimeSession: async () => {
          upsertCalled = true;
          throw new Error("upsert should not run after workspace-kind mismatch");
        },
        launchBubbleTmuxSession: async () => {
          launchCalled = true;
          return { sessionName: "pf-b_start_worktree_kind_mismatch_01" };
        },
        cleanupWorktreeWorkspace: async () => {
          cleanupCalled = true;
          return {
            repoPath,
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath,
            removedWorktree: true,
            removedBranch: true
          };
        },
        removeRuntimeSession: async (input) => {
          removedSessions.push(input.bubbleId);
          return true;
        }
      }
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).reasonCode).toBe(
      "START_LAUNCH_WORKSPACE_UNAVAILABLE"
    );
    expect((thrown as Error).message).toContain(
      "bootstrap returned workspace kind clone, but start requested worktree"
    );
    expect(upsertCalled).toBe(false);
    expect(launchCalled).toBe(false);
    expect(cleanupCalled).toBe(true);
    expect(removedSessions).toEqual([created.bubbleId]);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("FAILED");
  });

  it("resumes clone-mode bubbles across resumable states from persisted canonical workspace authority", async () => {
    const repoPath = await createTempRepo();
    const resumableStates = [
      "RUNNING",
      "WAITING_HUMAN",
      "READY_FOR_HUMAN_APPROVAL",
      "APPROVED_FOR_COMMIT",
      "COMMITTED"
    ] as const;

    for (const stateValue of resumableStates) {
      const bubble = await setupRunningBubbleFixture({
        repoPath,
        bubbleId: `b_start_clone_resume_${stateValue.toLowerCase()}`,
        task: `Clone resume ${stateValue}`
      });

      await writeFile(
        bubble.paths.bubbleTomlPath,
        renderBubbleConfigToml({
          ...bubble.config,
          work_mode: "clone"
        }),
        "utf8"
      );

      if (stateValue !== "RUNNING") {
        await updateBubbleState(bubble.paths.statePath, (current) => ({
          ...current,
          state: stateValue
        }));
      }

      let summaryCalled = 0;
      let launchCalled = 0;
      let claimCalls = 0;
      const cloneWorkspacePath =
        `${bubble.paths.worktreePath}/../clone-authority-${stateValue.toLowerCase()}`;

      const result = await startBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-23T09:06:30.000Z")
        },
        {
          readRuntimeSessionsRegistry: async () => ({
            [bubble.bubbleId]: {
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath,
              workspacePath: cloneWorkspacePath,
              workspaceKind: "clone",
              tmuxSessionName: `pf-b_start_clone_resume_${stateValue.toLowerCase()}`,
              updatedAt: "2026-02-23T09:06:00.000Z"
            }
          }),
          claimRuntimeSession: () => {
            claimCalls += 1;
            return Promise.resolve({
              claimed: claimCalls > 1,
              record: {
                bubbleId: bubble.bubbleId,
                repoPath,
                worktreePath: bubble.paths.worktreePath,
                workspacePath: cloneWorkspacePath,
                workspaceKind: "clone",
                tmuxSessionName: `pf-b_start_clone_resume_${stateValue.toLowerCase()}`,
                updatedAt: "2026-02-23T09:06:00.000Z"
              }
            });
          },
          isTmuxSessionAlive: () => Promise.resolve(false),
          buildResumeTranscriptSummary: () => {
            summaryCalled += 1;
            return Promise.resolve(`resume-summary: state=${stateValue}`);
          },
          launchBubbleTmuxSession: (input) => {
            launchCalled += 1;
            expect(input.workspacePath).toBe(cloneWorkspacePath);
            return Promise.resolve({
              sessionName: `pf-b_start_clone_resume_${stateValue.toLowerCase()}`
            });
          }
        }
      );

      expect(result.state.state).toBe(stateValue);
      expect(summaryCalled).toBe(1);
      expect(launchCalled).toBe(1);

      const loaded = await readStateSnapshot(bubble.paths.statePath);
      expect(loaded.state.state).toBe(stateValue);
    }
  });

  it("normalizes missing-bubble lookup errors on the public start export before clone preflight", async () => {
    const repoPath = await createTempRepo();

    const thrown = await startBubblePublicApi({
      bubbleId: "missing_clone_guard_bubble",
      repoPath,
      now: new Date("2026-02-23T09:07:30.000Z")
    }).then(
      () => null,
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(PublicStartBubbleError);
    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect(thrown).not.toBeInstanceOf(BubbleLookupError);
    expect((thrown as PublicStartBubbleError).name).toBe("StartBubbleError");
    expect((thrown as PublicStartBubbleError).message).toContain(
      "Bubble missing_clone_guard_bubble does not exist in repository"
    );
  });

  it("preserves non-startable state errors for clone bubbles on the public start export", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_clone_failed_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Clone preflight must not mask state-not-startable",
      cwd: repoPath
    });

    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...created.config,
        work_mode: "clone"
      }),
      "utf8"
    );
    await updateBubbleState(created.paths.statePath, (current) => ({
      ...current,
      state: "FAILED",
      active_agent: null,
      active_role: null,
      active_since: null,
      execution_context: null
    }));

    const thrown = await startBubblePublicApi({
      bubbleId: created.bubbleId,
      repoPath,
      now: new Date("2026-02-23T09:08:00.000Z")
    }).then(
      () => null,
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(PublicStartBubbleError);
    expect((thrown as PublicStartBubbleError).reasonCode).toBe(
      "START_STATE_NOT_STARTABLE"
    );
    expect((thrown as PublicStartBubbleError).message).toContain(
      "bubble start requires state CREATED or resumable runtime state (current: FAILED)."
    );
    expect((thrown as PublicStartBubbleError).message).not.toContain(
      "WORKSPACE_MODE_CLONE_NOT_ACTIVATED"
    );
  });

  it("reuses preflight bubble resolution for non-clone start", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_lookup_once_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Non-clone start should resolve bubble only once",
      cwd: repoPath
    });

    const resolveSpy = vi.spyOn(startCommandContextDefaults, "resolveBubbleById");
    try {
      const result = await startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-23T09:08:30.000Z")
        },
        {
          bootstrapWorktreeWorkspace: () =>
            Promise.resolve(
              buildWorktreeBootstrapResult({
                repoPath,
                bubbleBranch: created.config.bubble_branch,
                worktreePath: created.paths.worktreePath
              })
            ),
          launchBubbleTmuxSession: () =>
            Promise.resolve({ sessionName: "pf-b_start_lookup_once_01" })
        }
      );

      expect(result.state.state).toBe("RUNNING");
      expect(resolveSpy).toHaveBeenCalledTimes(1);
    } finally {
      resolveSpy.mockRestore();
    }
  });

  it("runs configured commands.bootstrap before tmux launch", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_bootstrap_cmd_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Run bootstrap command before tmux launch",
      bootstrapCommand: "pnpm install --frozen-lockfile && pnpm build",
      cwd: repoPath
    });

    const callOrder: string[] = [];
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () => {
          callOrder.push("workspace");
          return Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          );
        },
        runWorktreeBootstrapCommand: async (input) => {
          callOrder.push("commands.bootstrap");
          expect(input.bubbleId).toBe(created.bubbleId);
          expect(input.workspacePath).toBe(created.paths.worktreePath);
          expect(input.worktreePath).toBe(created.paths.worktreePath);
          expect(input.command).toBe("pnpm install --frozen-lockfile && pnpm build");
        },
        launchBubbleTmuxSession: () => {
          callOrder.push("launch");
          return Promise.resolve({ sessionName: "pf-b_start_bootstrap_cmd_01" });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          })
      }
    );

    expect(callOrder).toEqual(["workspace", "commands.bootstrap", "launch"]);
  });

  it("fails startup and cleans workspace when commands.bootstrap fails", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_bootstrap_cmd_fail_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Fail startup when bootstrap command fails",
      bootstrapCommand: "pnpm install --frozen-lockfile && pnpm build",
      cwd: repoPath
    });

    let launchCalled = false;
    let cleanupCalled = false;
    const removedSessions: string[] = [];

    const thrown = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        runWorktreeBootstrapCommand: () =>
          Promise.reject(new Error("bootstrap command failed")),
        launchBubbleTmuxSession: () => {
          launchCalled = true;
          return Promise.resolve({ sessionName: "pf-b_start_bootstrap_cmd_fail_01" });
        },
        cleanupWorktreeWorkspace: () => {
          cleanupCalled = true;
          return Promise.resolve({
            repoPath,
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath,
            removedWorktree: true,
            removedBranch: true
          });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          }),
        removeRuntimeSession: (input) => {
          removedSessions.push(input.bubbleId);
          return Promise.resolve(true);
        }
      }
    ).then(
      () => null,
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).message).toContain(
      "Bubble b_start_bootstrap_cmd_fail_01 startup did not complete."
    );
    expect((thrown as StartBubbleError).message).toContain(
      "This bubble is not resumable with `pairflow bubble start` and must not be treated as running."
    );
    expect((thrown as StartBubbleError).message).toContain(
      "pairflow bubble delete --id b_start_bootstrap_cmd_fail_01 --force"
    );
    expect((thrown as StartBubbleError).message).toContain(
      "create a new bubble"
    );
    expect((thrown as StartBubbleError).message).toContain(
      "Cause: bootstrap command failed"
    );
    expect((thrown as StartBubbleError).message).not.toMatch(
      /restart required|reconcile may fix this startup|continue from here/u
    );

    expect(launchCalled).toBe(false);
    expect(cleanupCalled).toBe(true);
    expect(removedSessions).toEqual([created.bubbleId]);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("FAILED");
  });

  it("injects document-focused reviewer guidance for doc-centric bubbles", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_doc_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "document",
      task: "Document-only task file iteration for docs/ markdown and PRD clarity.",
      cwd: repoPath
    });

    let implementerCommand: string | undefined;
    let implementerKickoffMessage: string | undefined;
    let reviewerCommand: string | undefined;
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          implementerCommand = input.implementerCommand;
          implementerKickoffMessage = input.implementerKickoffMessage;
          reviewerCommand = input.reviewerCommand;
          return Promise.resolve({ sessionName: "pf-b_start_doc_01" });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          })
      }
    );

    expect(created.config.review_artifact_type).toBe("document");
    expect(implementerCommand).toContain(
      "runtime checks are not required in this round"
    );
    expect(implementerCommand).toContain(
      "Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output."
    );
    expect(implementerCommand).toContain(
      "Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path."
    );
    expect(implementerCommand).toContain(
      "Docs-only scope: choose one mode and keep it consistent in the same PASS."
    );
    expect(implementerCommand).toContain(
      "Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs."
    );
    expect(implementerCommand).toContain(
      "Mode B (checks executed): if you run validation"
    );
    expect(implementerCommand).not.toContain(
      "Missing expected evidence logs should be treated as incomplete validation packaging."
    );
    expect(implementerKickoffMessage).toContain(
      "runtime checks are not required in this round"
    );
    expect(reviewerCommand).toContain("document/task artifacts");
    expect(reviewerCommand).toContain("Do not force `feature-dev:code-reviewer`");
    expect(reviewerCommand).toContain(
      "Document scope: canonical `pairflow agent emit --kind pass ... --finding ...` for blockers is valid only when structured findings include strict qualifiers (`timing=required-now` + `layer=L1`)."
    );
    expect(reviewerCommand).toContain(
      "CLI `--finding` cannot encode these qualifiers"
    );
    expect(reviewerCommand).toContain(
      "`pairflow agent emit --kind convergence ... --finding ...` (`P2/P3` only)"
    );
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(reviewerCommand).toContain(
      "Runtime checks are not required for document-only scope."
    );
    expect(reviewerCommand).toContain(
      "Primary artifact review rule (docs-only): treat a PASS as out-of-scope if it only adds a new standalone review/synthesis document while the referenced source task/document file is unchanged."
    );
    expect(reviewerCommand).toContain(
      "In that case, request rework so the primary referenced artifact is refined directly."
    );
    expectReviewerValidationClaimGuardrails(reviewerCommand);
  });

  it("injects persisted reviewer brief into reviewer startup prompt", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_reviewer_brief_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Accuracy-critical reviewer brief startup injection",
      reviewerBrief: "Always verify each claim against concrete source refs.",
      cwd: repoPath
    });

    let reviewerCommand: string | undefined;
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          reviewerCommand = input.reviewerCommand;
          return Promise.resolve({ sessionName: "pf-b_start_reviewer_brief_01" });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          })
      }
    );

    expect(reviewerCommand).toContain("Reviewer brief (persisted artifact `reviewer-brief.md`)");
    expect(reviewerCommand).toContain("Always verify each claim against concrete source refs.");
  });

  it("injects bridged reviewer focus block into reviewer startup prompt exactly once", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_reviewer_focus_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: [
        "# Task",
        "## Reviewer Focus",
        "- Validate extraction reason-code behavior",
        "- Keep fallback fail-open"
      ].join("\n"),
      cwd: repoPath
    });

    let reviewerCommand: string | undefined;
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          reviewerCommand = input.reviewerCommand;
          return Promise.resolve({ sessionName: "pf-b_start_reviewer_focus_01" });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          })
      }
    );

    expect(reviewerCommand).toContain(
      "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):"
    );
    expect(reviewerCommand).toContain("- Validate extraction reason-code behavior");
    const bridgeOccurrences =
      reviewerCommand?.match(
        /Reviewer Focus \(bridged from task artifact `reviewer-focus\.json`\):/gu
      )?.length ?? 0;
    expect(bridgeOccurrences).toBe(1);
  });

  it("does not inject reviewer focus block when extracted status is absent", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_reviewer_focus_absent_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "# Task\n## Scope\nNo focus section here.",
      cwd: repoPath
    });

    let reviewerCommand: string | undefined;
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          reviewerCommand = input.reviewerCommand;
          return Promise.resolve({ sessionName: "pf-b_start_reviewer_focus_absent_01" });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          })
      }
    );

    expect(reviewerCommand).not.toContain(
      "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):"
    );
  });

  it("does not inject reviewer focus block when artifact status is invalid", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_reviewer_focus_invalid_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "# Task\n## Scope\nNo focus section here.",
      cwd: repoPath
    });

    await writeFile(
      created.paths.reviewerFocusArtifactPath,
      JSON.stringify(
        {
          status: "invalid",
          source: "frontmatter",
          reason_code: "REVIEWER_FOCUS_EMPTY_FRONTMATTER"
        },
        null,
        2
      ),
      "utf8"
    );

    let reviewerCommand: string | undefined;
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          reviewerCommand = input.reviewerCommand;
          return Promise.resolve({ sessionName: "pf-b_start_reviewer_focus_invalid_01" });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          })
      }
    );

    expect(reviewerCommand).not.toContain(
      "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):"
    );
  });

  it("continues startup when reviewer brief artifact is unreadable", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_reviewer_brief_unreadable_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Startup should tolerate unreadable optional reviewer brief artifact.",
      cwd: repoPath
    });

    await mkdir(created.paths.reviewerBriefArtifactPath, { recursive: true });

    let reviewerCommand: string | undefined;
    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          reviewerCommand = input.reviewerCommand;
          return Promise.resolve({ sessionName: "pf-b_start_reviewer_brief_unreadable_01" });
        },
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-22T13:00:00.000Z"
            }
          })
      }
    );

    expect(result.state.state).toBe("RUNNING");
    expect(reviewerCommand).not.toContain(
      "Reviewer brief (persisted artifact `reviewer-brief.md`)"
    );
  });

  it("overwrites existing reviewer policy snapshot artifact on every start", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_policy_snapshot_overwrite_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Always overwrite reviewer policy snapshot",
      cwd: repoPath
    });

    const policySnapshotPath = join(
      created.paths.artifactsDir,
      reviewerPolicySnapshotFileName
    );
    await writeFile(policySnapshotPath, "stale reviewer policy\n", "utf8");

    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-23T10:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: () =>
          Promise.resolve({ sessionName: "pf-b_start_policy_snapshot_overwrite_01" }),
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-03-23T10:00:00.000Z"
            }
          })
      }
    );

    const snapshot = await readFile(policySnapshotPath, "utf8");
    expect(snapshot).toBe(`${reviewerSeverityOntologyFullMarkdown}\n`);
  });

  it("fails fast with snapshot reasonCode when reviewer policy snapshot write fails during context load", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_policy_snapshot_write_fail_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Fail-fast reviewer policy snapshot write",
      cwd: repoPath
    });

    await mkdir(
      join(created.paths.artifactsDir, reviewerPolicySnapshotFileName),
      { recursive: true }
    );

    await expect(
      startBubble({
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-23T10:01:00.000Z")
      })
    ).rejects.toMatchObject({
      reasonCode: reviewerPolicySnapshotUnavailableReasonCode
    });
  });

  it("fails fast with snapshot reasonCode when reviewer policy snapshot read-back is empty", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_policy_snapshot_empty_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Fail-fast reviewer policy snapshot empty read-back",
      cwd: repoPath
    });

    const policySnapshotPath = join(
      created.paths.artifactsDir,
      reviewerPolicySnapshotFileName
    );
    await symlink("/dev/null", policySnapshotPath);

    await expect(
      startBubble({
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-23T10:02:00.000Z")
      })
    ).rejects.toMatchObject({
      reasonCode: reviewerPolicySnapshotUnavailableReasonCode
    });
  });

  it("preserves incoming StartBubbleError reasonCode in top-level start catch", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_reason_preserve_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Preserve StartBubbleError reason code",
      cwd: repoPath
    });

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-23T10:03:00.000Z")
        },
        {
          bootstrapWorktreeWorkspace: () =>
            Promise.resolve(
              buildWorktreeBootstrapResult({
                repoPath,
                bubbleBranch: created.config.bubble_branch,
                worktreePath: created.paths.worktreePath
              })
            ),
          launchBubbleTmuxSession: () =>
            Promise.reject(
              new StartBubbleError({
                reasonCode: reviewerPolicySnapshotUnavailableReasonCode,
                message: "Injected snapshot failure for reason-code preservation"
              })
            ),
          cleanupWorktreeWorkspace: () =>
            Promise.resolve({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath,
              removedBranch: true,
              removedWorktree: true
            }),
          claimRuntimeSession: (input) =>
            Promise.resolve({
              claimed: true,
              record: {
                bubbleId: input.bubbleId,
                repoPath: input.repoPath,
                worktreePath: input.worktreePath,
                tmuxSessionName: input.tmuxSessionName,
                updatedAt: "2026-03-23T10:03:00.000Z"
              }
            }),
          removeRuntimeSession: () => Promise.resolve(true)
        }
      )
    ).rejects.toMatchObject({
      reasonCode: reviewerPolicySnapshotUnavailableReasonCode
    });
  });

  it("fails closed from explicit launch ack rejection on the default start seam", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_launch_ack_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Explicit launch ack rejection should fail closed",
      cwd: repoPath
    });

    const thrown = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-23T10:03:30.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSessionAck: async () => ({
          status: "failed_to_start",
          reason_code: "LAUNCH_ACK_TMUX_COMMAND_FAILED",
          failure_kind: "tmux_command_failed",
          error_message: "tmux launch rejected in test",
          sessionName: `pf-${created.bubbleId}`
        }),
        cleanupWorktreeWorkspace: () =>
          Promise.resolve({
            repoPath,
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath,
            removedBranch: true,
            removedWorktree: true
          }),
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-03-23T10:03:30.000Z"
            }
          }),
        removeRuntimeSession: () => Promise.resolve(true)
      }
    ).then(
      () => null,
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).reasonCode).toBe(
      "LAUNCH_ACK_TMUX_COMMAND_FAILED"
    );
    expect((thrown as StartBubbleError).context).toMatchObject({
      bubble_id: created.bubbleId,
      stage: "launch_tmux",
      failure_kind: "tmux_command_failed",
      tmux_session_name: `pf-${created.bubbleId}`
    });
    expect((thrown as StartBubbleError).message).toContain(
      `Bubble ${created.bubbleId} startup did not complete.`
    );
    expect((thrown as StartBubbleError).message).toContain(
      "Cause: LAUNCH_ACK_TMUX_COMMAND_FAILED: tmux launch rejected in test"
    );
  });

  it("preserves StartBubbleError metadata when startup-incomplete catch rewrites the message", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_reason_incomplete_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Preserve StartBubbleError metadata in startup-incomplete catch",
      cwd: repoPath
    });

    const injectedError = new StartBubbleError({
      reasonCode: reviewerPolicySnapshotUnavailableReasonCode,
      message: "Injected startup-incomplete StartBubbleError",
      context: {
        stage: "launch_tmux",
        bubble_id: created.bubbleId
      }
    });

    const thrown = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-23T10:04:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: () => Promise.reject(injectedError),
        cleanupWorktreeWorkspace: () =>
          Promise.resolve({
            repoPath,
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath,
            removedBranch: true,
            removedWorktree: true
          }),
        claimRuntimeSession: (input) =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-03-23T10:04:00.000Z"
            }
          }),
        removeRuntimeSession: () => Promise.resolve(true)
      }
    ).then(
      () => null,
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).reasonCode).toBe(
      reviewerPolicySnapshotUnavailableReasonCode
    );
    expect((thrown as StartBubbleError).context).toMatchObject({
      command_name: "start",
      stage: "launch_tmux",
      bubble_id: created.bubbleId
    });
    expect((thrown as StartBubbleError).cause).toBe(injectedError);
    expect((thrown as StartBubbleError).message).toContain(
      `Bubble ${created.bubbleId} startup did not complete.`
    );
    expect((thrown as StartBubbleError).message).toContain(
      "This bubble is not resumable with `pairflow bubble start` and must not be treated as running."
    );
    expect((thrown as StartBubbleError).message).toContain(
      `pairflow bubble delete --id ${created.bubbleId} --force`
    );
    expect((thrown as StartBubbleError).message).toContain(
      "Cause: REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE: Injected startup-incomplete StartBubbleError"
    );
  });

  it("fails before bootstrap when runtime session ownership claim fails", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_021",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Start bubble task",
      cwd: repoPath
    });

    let cleanupCalled = false;
    const removedSessions: string[] = [];
    const terminatedSessions: string[] = [];
    let bootstrapCalled = false;

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T13:11:00.000Z")
        },
        {
          claimRuntimeSession: () =>
            Promise.reject(new Error("sessions registry unavailable")),
          bootstrapWorktreeWorkspace: () =>
            {
              bootstrapCalled = true;
              return Promise.resolve(
                buildWorktreeBootstrapResult({
                  repoPath,
                  bubbleBranch: created.config.bubble_branch,
                  worktreePath: created.paths.worktreePath
                })
              );
            },
          launchBubbleTmuxSession: () =>
            Promise.resolve({ sessionName: "pf-b_start_021" }),
          removeRuntimeSession: (input) => {
            removedSessions.push(input.bubbleId);
            return Promise.resolve(true);
          },
          terminateBubbleTmuxSession: (input) => {
            if (input.sessionName !== undefined) {
              terminatedSessions.push(input.sessionName);
            }
            return Promise.resolve({
              sessionName: input.sessionName ?? "unknown",
              existed: true
            });
          },
          cleanupWorktreeWorkspace: () => {
            cleanupCalled = true;
            return Promise.resolve({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath,
              removedBranch: true,
              removedWorktree: true
            });
          }
        }
      )
    ).rejects.toBeInstanceOf(StartBubbleError);

    expect(bootstrapCalled).toBe(false);
    expect(cleanupCalled).toBe(false);
    expect(removedSessions).toEqual([]);
    expect(terminatedSessions).toEqual([]);

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("CREATED");
  });

  it("marks bubble FAILED when tmux launch fails", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_02",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Start bubble task",
      cwd: repoPath
    });

    let cleanupCalled = false;
    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T13:10:00.000Z")
        },
        {
          bootstrapWorktreeWorkspace: () =>
            Promise.resolve(
              buildWorktreeBootstrapResult({
                repoPath,
                bubbleBranch: created.config.bubble_branch,
                worktreePath: created.paths.worktreePath
              })
            ),
          launchBubbleTmuxSession: () =>
            Promise.reject(new Error("tmux unavailable")),
          cleanupWorktreeWorkspace: () => {
            cleanupCalled = true;
            return Promise.resolve({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath,
              removedBranch: true,
              removedWorktree: true
            });
          }
        }
      )
    ).rejects.toBeInstanceOf(StartBubbleError);

    expect(cleanupCalled).toBe(true);
    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("FAILED");
  });

  it("builds status pane command that remains shell-parseable with quoted repo path", async () => {
    const repoPath = await createTempRepo("pairflow-start-bubble-quote'-");
    const created = await createBubble({
      id: "b_start_03",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Start bubble task",
      cwd: repoPath
    });

    let statusCommand: string | undefined;
    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:20:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          statusCommand = input.statusCommand;
          return Promise.resolve({ sessionName: "pf-b_start_03" });
        }
      }
    );

    if (statusCommand === undefined) {
      throw new Error("Expected status command to be captured.");
    }
    expect(statusCommand).toContain("bubble watchdog --id");
    expect(statusCommand).toContain("bubble status --id");
    expect(statusCommand).toContain("--json");
    const homePath = homedir();
    const expectedDisplayWorktreePath =
      created.paths.worktreePath === homePath
        ? "~"
        : created.paths.worktreePath.startsWith(`${homePath}/`)
          ? `~${created.paths.worktreePath.slice(homePath.length)}`
          : created.paths.worktreePath;
    const statusScript = extractBashLcScript(statusCommand);
    expect(statusScript).toContain(`printf '%s\\n' ${shellQuote(expectedDisplayWorktreePath)}`);
    expect(statusScript).toContain("set +e");
    expect(statusScript).toContain("prev_signature=''");
    expect(statusScript).toContain("heartbeat_bucket=$(date -u '+%Y-%m-%dT%H:%M:%S'");
    expect(statusScript).toContain("next_signature=$(");
    expect(statusScript).toContain("status_json_exit=$?");
    expect(statusScript).toContain("__heartbeat_bucket__=");
    expect(statusScript).toContain("TMUX_PANE");
    expect(statusScript).toContain("#{pane_width}x#{pane_height}");
    expect(statusScript).toContain("if [ \"$next_signature\" != \"$prev_signature\" ]; then");
    expect(statusScript).toContain("status_text_exit=$?");
    expect(statusScript).toContain("status pane render error (exit %s)");
    expect(statusScript).toContain("pairflow bubble status --id");
    expect(statusScript).not.toContain("clear;");
    await assertBashParses(statusCommand);
  });

  it("uses self_host command profile wiring when bubble config opts in", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_self_host_01",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      pairflowCommandProfile: "self_host",
      task: "Start bubble self_host profile task",
      cwd: repoPath
    });

    let statusCommand: string | undefined;
    let implementerCommand: string | undefined;
    let reviewerCommand: string | undefined;
    let metaReviewerCommand: string | undefined;

    await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T13:25:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: (input) => {
          statusCommand = input.statusCommand;
          implementerCommand = input.implementerCommand;
          reviewerCommand = input.reviewerCommand;
          metaReviewerCommand = input.metaReviewerCommand;
          return Promise.resolve({ sessionName: "pf-b_start_self_host_01" });
        }
      }
    );

    const statusScript = extractBashLcScript(statusCommand as string);
    expect(statusScript).toContain(
      `node ${shellQuote(`${created.paths.worktreePath}/dist/cli/index.js`)} bubble status --id`
    );

    for (const command of [implementerCommand, reviewerCommand, metaReviewerCommand]) {
      expect(command).toBeDefined();
      const script = extractBashLcScript(command as string);
      expect(script).toContain("PAIRFLOW_LOCAL_ENTRYPOINT");
      expect(script).toContain("PAIRFLOW_COMMAND_PATH_STALE");
      expect(script).not.toContain("PAIRFLOW_EXTERNAL_COMMAND");
    }
  });

  it("resumes RUNNING bubble with resume prompts and active implementer kickoff", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_01",
      task: [
        "# Task",
        "## Reviewer Focus",
        "- Resume path should keep reviewer focus context",
        "",
        "## Scope",
        "Resume bubble"
      ].join("\n"),
      reviewerBrief: "Resume must keep reviewer brief context."
    });

    let bootstrapCalled = false;
    let summaryPath: string | undefined;
    const result = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () => {
          bootstrapCalled = true;
          return Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: bubble.config.bubble_branch,
              worktreePath: bubble.paths.worktreePath
            })
          );
        },
        buildResumeTranscriptSummary: (input) => {
          summaryPath = input.transcriptPath;
          return Promise.resolve("resume-summary: messages=3");
        },
        launchBubbleTmuxSession: (input) => {
          const implementerScript = extractBashLcScript(input.implementerCommand);
          const reviewerScript = extractBashLcScript(input.reviewerCommand);
          expect(input.implementerBootstrapMessage).toBeUndefined();
          expect(input.reviewerBootstrapMessage).toBeUndefined();
          expect(input.implementerKickoffMessage).toContain("resume kickoff (implementer)");
          expect(input.reviewerKickoffMessage).toBeUndefined();
          expect(input.implementerCommand).toContain(
            "--dangerously-bypass-approvals-and-sandbox"
          );
          expect(implementerScript).toContain(
            `if ! cd ${shellQuote(bubble.paths.worktreePath)}; then`
          );
          expect(reviewerScript).toContain(
            `if ! cd ${shellQuote(bubble.paths.worktreePath)}; then`
          );
          expect(input.implementerCommand).toContain("Pairflow implementer resume");
          expect(input.implementerCommand).toContain(
            `Execute pairflow commands from this launch workspace path only (Phase 1C1 no-split worktree root): ${bubble.paths.worktreePath}.`
          );
          expect(input.implementerCommand).toContain(
            "Default command profile is `external`; Pairflow commands are resolved from PATH."
          );
          expect(input.implementerCommand).toContain("resume-summary: messages=3");
          expect(input.reviewerCommand).toContain("--dangerously-skip-permissions");
          expect(input.reviewerCommand).toContain("Pairflow reviewer resume");
          expect(input.reviewerCommand).toContain(
            "Default command profile is `external`; Pairflow commands are resolved from PATH."
          );
          expect(input.reviewerCommand).toContain("resume-summary: messages=3");
          expect(input.reviewerCommand).toContain(
            "Resume must keep reviewer brief context."
          );
          expect(input.reviewerCommand).toContain(
            "Treat this reviewer brief as mandatory review context."
          );
          expect(input.reviewerCommand).toContain(
            "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):"
          );
          expect(input.reviewerCommand).toContain(
            "- Resume path should keep reviewer focus context"
          );
          expect(input.reviewerCommand).toContain("Severity Ontology v1 reminder");
          expect(input.reviewerCommand).not.toContain(
            "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
          );
          expect(input.reviewerCommand).toContain(
            `Reviewer policy file: ${join(bubble.paths.artifactsDir, reviewerPolicySnapshotFileName)}`
          );
          expect(input.reviewerCommand).toContain(
            "Read this file before first review action."
          );
          expect(input.reviewerCommand).toContain("Blocker severities (`P0/P1`) require concrete evidence");
          expect(input.reviewerCommand).toContain("Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default");
          expect(input.reviewerCommand).toContain(
            "Phase 1 reviewer round flow (prompt-level only):"
          );
          expect(input.reviewerCommand).toContain("`Parallel Scout Scan`");
          expect(input.reviewerCommand).toContain(
            "same current worktree diff scope (`max_scout_agents=2` hard cap)"
          );
          expect(input.reviewerCommand).toContain("`required_scout_agents=2`");
          expect(input.reviewerCommand).toContain("`max_scout_agents=2`");
          expect(input.reviewerCommand).toContain(
            "`max_scout_candidates_per_agent=8`"
          );
          expect(input.reviewerCommand).toContain("`max_class_expansions_per_round=2`");
          expect(input.reviewerCommand).toContain(
            "`max_expansion_siblings_per_class=5`"
          );
          expect(input.reviewerCommand).toContain(
            "Summary scope guardrail: scope statements must cover only current worktree changes."
          );
          expect(input.reviewerCommand).toContain(
            "For summary scope claims, do not use branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
          );
          expect(input.reviewerCommand).not.toContain(
            "For summary scope claims, do not use `git diff main..HEAD` or any branch-range diff (`<revA>..<revB>`)."
          );
          expect(input.reviewerCommand).toContain(
            "Do not derive summary scope from history/log sources such as `git log --name-status` or `git show --name-status`."
          );
          expect(input.reviewerCommand).toContain(
            "Establish scope from current worktree changes using `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard` (staged, unstaged, and untracked)."
          );
          expect(input.reviewerCommand).toContain(
            "If current worktree scope cannot be resolved reliably, avoid numeric file-operation claims."
          );
          expect(input.reviewerCommand).toMatch(/(<revA>\.\.<revB>|main\.\.HEAD)/);
          expect(input.reviewerCommand).toMatch(
            /git\s+(log|show)\s+--name-status/
          );
          expect(input.reviewerCommand).toMatch(/git diff --name-status/);
          expect(input.reviewerCommand).toMatch(
            /(cannot be resolved reliably|avoid numeric file-operation claims)/i
          );
          expect(input.reviewerCommand).toContain(
            "Stop rules: stop expansion immediately when no new concrete locations are found"
          );
          expect(input.reviewerCommand).toContain("repo-wide expansion scans are forbidden");
          expect(input.reviewerCommand).toContain(
            "Required reviewer output contract (machine-checkable)"
          );
          expect(input.reviewerCommand).toContain(
            "`Scout Coverage.scope_covered` must describe current worktree changes only"
          );
          expect(input.reviewerCommand).toContain(
            "grounded in `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
          );
          expect(input.reviewerCommand).not.toContain(
            "`Scout Coverage.scope_covered` must cover only current worktree changes, grounded in `git diff HEAD --name-status` + `git ls-files --others --exclude-standard` or the combined trio `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
          );
          expect(input.reviewerCommand).toContain(
            "Do not justify `scope_covered` with branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
          );
          expect(input.reviewerCommand).toContain(
            "Do not justify `scope_covered` with history/log sources such as `git log --name-status` or `git show --name-status`."
          );
          expect(input.reviewerCommand).toContain("`Issue-Class Expansions`");
          expect(input.reviewerCommand).toContain("`Residual Risk / Notes`");
          expectReviewerValidationClaimGuardrails(input.reviewerCommand);
          expect(input.reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_A);
          expect(input.reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_B);
          expect(input.reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_C);
          expect(input.reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_D);
          expect(input.reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_F);
          expect(input.reviewerCommand).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
          expectNoForbiddenReviewerCommandGateTokens(input.reviewerCommand);
          return Promise.resolve({ sessionName: "pf-b_start_resume_01" });
        }
      }
    );

    expect(bootstrapCalled).toBe(false);
    expect(summaryPath).toBe(bubble.paths.transcriptPath);
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.active_since).toBe("2026-02-23T09:00:00.000Z");
    expect(result.state.last_command_at).toBe("2026-02-23T09:00:00.000Z");
    expect(result.state.execution_context).toMatchObject({
      active_role: "implementer",
      awaited_output_type: "pass_result",
      handoff_id: `implementer:${bubble.bubbleId}:round:1:attempt:2`,
      round: 1,
      started_at: "2026-02-23T09:00:00.000Z",
      deadline_at: "2026-02-23T09:30:00.000Z",
      attempt: 2
    });
    expect(result.state.execution_context?.execution_id).toMatch(
      /^exec_[0-9a-f]{24}$/u
    );
  });

  it("resumes from canonical workspace authority returned by the runtime-session claim", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_workspace_authority_01",
      task: "Resume bubble keeps persisted canonical workspace authority"
    });
    const canonicalWorkspacePath = `${bubble.paths.worktreePath}/../canonicalized-worktree`;
    let claimCalls = 0;

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:11:00.000Z")
      },
      {
        readRuntimeSessionsRegistry: async () => ({
          [bubble.bubbleId]: {
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            workspacePath: `${bubble.paths.worktreePath}/../clone-authority`,
            workspaceKind: "clone",
            tmuxSessionName: "pf-b_start_resume_clone_workspace_authority_01",
            updatedAt: "2026-02-23T09:11:00.000Z"
          }
        }),
        claimRuntimeSession: (input) => {
          claimCalls += 1;
          return Promise.resolve({
            claimed: claimCalls > 1,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              workspacePath: canonicalWorkspacePath,
              workspaceKind: "worktree",
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-23T09:10:00.000Z"
            }
          });
        },
        isTmuxSessionAlive: () => Promise.resolve(false),
        buildResumeTranscriptSummary: () => Promise.resolve("resume-summary: workspace-authority"),
        launchBubbleTmuxSession: (input) => {
          const implementerScript = extractBashLcScript(input.implementerCommand);
          const reviewerScript = extractBashLcScript(input.reviewerCommand);
          expect(input.workspacePath).toBe(canonicalWorkspacePath);
          expect(implementerScript).toContain(
            `if ! cd ${shellQuote(canonicalWorkspacePath)}; then`
          );
          expect(reviewerScript).toContain(
            `if ! cd ${shellQuote(canonicalWorkspacePath)}; then`
          );
          expect(input.implementerCommand).toContain(
            `Execute pairflow commands from this launch workspace path only (Phase 1C1 no-split worktree root): ${canonicalWorkspacePath}.`
          );
          expect(input.reviewerCommand).toContain(
            `Execute pairflow commands from this launch workspace path only (Phase 1C1 no-split worktree root): ${canonicalWorkspacePath}.`
          );
          expect(input.reviewerCommand).toContain(
            `Repository: ${repoPath}. Launch workspace (Phase 1C1 no-split worktree root): ${canonicalWorkspacePath}.`
          );
          return Promise.resolve({
            sessionName: "pf-b_start_resume_workspace_authority_01"
          });
        }
      }
    );
  });

  it("resumes from persisted clone workspace authority when runtime session is explicit", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_clone_workspace_authority_01",
      task: "Resume clone workspace authority uses the persisted canonical launch workspace"
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        work_mode: "clone"
      }),
      "utf8"
    );

    let launchCalled = false;
    let claimCalls = 0;

    const result = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:12:00.000Z")
      },
      {
        readRuntimeSessionsRegistry: async () => ({
          [bubble.bubbleId]: {
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            workspacePath: `${bubble.paths.worktreePath}/../clone-authority`,
            workspaceKind: "clone",
            tmuxSessionName: "pf-b_start_resume_clone_workspace_authority_01",
            updatedAt: "2026-02-23T09:11:00.000Z"
          }
        }),
        claimRuntimeSession: (input) => {
          claimCalls += 1;
          return Promise.resolve({
            claimed: claimCalls > 1,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              workspacePath: `${input.worktreePath}/../clone-authority`,
              workspaceKind: "clone",
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-23T09:11:00.000Z"
            }
          });
        },
        isTmuxSessionAlive: () => Promise.resolve(false),
        launchBubbleTmuxSession: async (input) => {
          launchCalled = true;
          expect(input.workspacePath).toBe(`${bubble.paths.worktreePath}/../clone-authority`);
          return { sessionName: "pf-b_start_resume_clone_workspace_authority_01" };
        }
      }
    );

    expect(result.state.state).toBe("RUNNING");
    expect(launchCalled).toBe(true);
  });

  it("fails closed when clone resume only retains worktree fallback without workspacePath", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_clone_workspace_missing_path_01",
      task: "Resume clone workspace authority requires explicit workspacePath"
    });

    let summaryCalled = false;
    let launchCalled = false;
    let removeCalled = false;
    let claimCalled = false;

    const thrown = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:13:00.000Z")
      },
      {
        readRuntimeSessionsRegistry: async () => ({
          [bubble.bubbleId]: {
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath,
            workspaceKind: "clone",
            tmuxSessionName: "pf-b_start_resume_clone_workspace_missing_path_01",
            updatedAt: "2026-02-23T09:12:00.000Z"
          }
        }),
        claimRuntimeSession: (input) => {
          claimCalled = true;
          return Promise.resolve({
            claimed: false,
            record: {
              bubbleId: input.bubbleId,
              repoPath: input.repoPath,
              worktreePath: input.worktreePath,
              workspaceKind: "clone",
              tmuxSessionName: input.tmuxSessionName,
              updatedAt: "2026-02-23T09:12:00.000Z"
            }
          });
        },
        isTmuxSessionAlive: () => Promise.resolve(false),
        removeRuntimeSession: async () => {
          removeCalled = true;
          return true;
        },
        buildResumeTranscriptSummary: async () => {
          summaryCalled = true;
          return "resume-summary: should-not-run";
        },
        launchBubbleTmuxSession: async () => {
          launchCalled = true;
          return { sessionName: "pf-b_start_resume_clone_workspace_missing_path_01" };
        }
      }
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).reasonCode).toBe(
      "START_LAUNCH_WORKSPACE_UNAVAILABLE"
    );
    expect((thrown as Error).message).toContain(
      "runtime session canonical workspace authority is missing"
    );
    expect(claimCalled).toBe(true);
    expect(removeCalled).toBe(true);
    expect(summaryCalled).toBe(false);
    expect(launchCalled).toBe(false);
  });

  it("fails closed when clone resume has no persisted runtime session authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_clone_runtime_session_missing_01",
      task: "Clone resume requires an existing persisted runtime session authority"
    });

    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        work_mode: "clone"
      }),
      "utf8"
    );

    let removeCalled = false;
    let summaryCalled = false;
    let launchCalled = false;
    let claimCalled = false;

    const thrown = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:13:30.000Z")
      },
      {
        readRuntimeSessionsRegistry: async () => ({}),
        claimRuntimeSession: async () => {
          claimCalled = true;
          return {
            claimed: true,
            record: {
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath,
              workspacePath: bubble.paths.worktreePath,
              workspaceKind: "clone",
              tmuxSessionName: "pf-b_start_resume_clone_runtime_session_missing_01",
              updatedAt: "2026-02-23T09:13:30.000Z"
            }
          };
        },
        removeRuntimeSession: async () => {
          removeCalled = true;
          return true;
        },
        buildResumeTranscriptSummary: async () => {
          summaryCalled = true;
          return "resume-summary: should-not-run-without-runtime-session";
        },
        launchBubbleTmuxSession: async () => {
          launchCalled = true;
          return {
            sessionName: "pf-b_start_resume_clone_runtime_session_missing_01"
          };
        }
      }
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).reasonCode).toBe(
      "START_LAUNCH_WORKSPACE_UNAVAILABLE"
    );
    expect((thrown as Error).message).toContain(
      "clone resume requires persisted runtime session canonical workspace authority"
    );
    expect(claimCalled).toBe(false);
    expect(removeCalled).toBe(false);
    expect(summaryCalled).toBe(false);
    expect(launchCalled).toBe(false);
  });

  it("preserves persisted canonical workspace authority when reclaiming a stale resume session", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_workspace_reclaim_01",
      task: "Resume reclaim keeps persisted canonical workspace authority"
    });
    const canonicalWorkspacePath = `${bubble.paths.worktreePath}/../canonicalized-worktree`;
    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      workspacePath: canonicalWorkspacePath,
      workspaceKind: "worktree",
      tmuxSessionName: "pf-b_start_resume_workspace_reclaim_01-stale",
      now: new Date("2026-02-23T09:20:00.000Z")
    });

    const result = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:21:00.000Z")
      },
      {
        isTmuxSessionAlive: () => Promise.resolve(false),
        buildResumeTranscriptSummary: () => Promise.resolve("resume-summary: workspace-reclaim"),
        launchBubbleTmuxSession: (input) => {
          const implementerScript = extractBashLcScript(input.implementerCommand);
          expect(input.workspacePath).toBe(canonicalWorkspacePath);
          expect(implementerScript).toContain(
            `if ! cd ${shellQuote(canonicalWorkspacePath)}; then`
          );
          return Promise.resolve({
            sessionName: "pf-b_start_resume_workspace_reclaim_01"
          });
        }
      }
    );

    const sessionsRaw = await readFile(bubble.paths.sessionsPath, "utf8");
    const sessions = JSON.parse(sessionsRaw) as Record<string, {
      workspacePath?: string;
      tmuxSessionName: string;
    }>;
    expect(sessions[bubble.bubbleId]?.workspacePath).toBe(canonicalWorkspacePath);
    expect(sessions[bubble.bubbleId]?.tmuxSessionName).not.toBe(
      "pf-b_start_resume_workspace_reclaim_01-stale"
    );
    expect(result.tmuxSessionName).toBe("pf-b_start_resume_workspace_reclaim_01");
  });

  it("fails stale resume reclaim when explicit workspacePath matches worktreePath but workspaceKind is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_workspace_reclaim_worktree_missing_kind_01",
      task: "Resume reclaim rejects same-path authority without explicit workspaceKind"
    });

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      workspacePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_start_resume_workspace_reclaim_worktree_missing_kind_01-stale",
      now: new Date("2026-02-23T09:21:30.000Z")
    });

    let removeCalled = false;
    let summaryCalled = false;
    let launchCalled = false;

    const thrown = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:22:30.000Z")
      },
      {
        isTmuxSessionAlive: () => Promise.resolve(false),
        removeRuntimeSession: async () => {
          removeCalled = true;
          return true;
        },
        buildResumeTranscriptSummary: async () => {
          summaryCalled = true;
          return "resume-summary: same-path-worktree-authority";
        },
        launchBubbleTmuxSession: async () => {
          launchCalled = true;
          return {
            sessionName: "pf-b_start_resume_workspace_reclaim_worktree_missing_kind_01"
          };
        }
      }
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).reasonCode).toBe(
      "START_LAUNCH_WORKSPACE_UNAVAILABLE"
    );
    expect((thrown as Error).message).toContain(
      "runtime session canonical workspace authority is missing"
    );
    expect(removeCalled).toBe(true);
    expect(summaryCalled).toBe(false);
    expect(launchCalled).toBe(false);
  });

  it("fails stale resume reclaim when persisted workspacePath matches worktreePath but workspaceKind is missing", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_workspace_reclaim_missing_kind_01",
      task: "Resume reclaim rejects missing workspaceKind on explicit same-path authority"
    });

    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        work_mode: "clone"
      }),
      "utf8"
    );

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      workspacePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-b_start_resume_workspace_reclaim_missing_kind_01-stale",
      now: new Date("2026-02-23T09:22:00.000Z")
    });

    let removeCalled = false;
    let launchCalled = false;

    const thrown = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:23:00.000Z")
      },
      {
        isTmuxSessionAlive: () => Promise.resolve(false),
        removeRuntimeSession: async () => {
          removeCalled = true;
          return true;
        },
        buildResumeTranscriptSummary: async () =>
          "resume-summary: malformed-stale-workspace-authority",
        launchBubbleTmuxSession: async () => {
          launchCalled = true;
          return {
            sessionName: "pf-b_start_resume_workspace_reclaim_missing_kind_01"
          };
        }
      }
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).reasonCode).toBe(
      "START_LAUNCH_WORKSPACE_UNAVAILABLE"
    );
    expect((thrown as Error).message).toContain(
      "runtime session canonical workspace authority is missing"
    );
    expect(removeCalled).toBe(true);
    expect(launchCalled).toBe(false);
  });

  it("fails stale resume reclaim when clone runtime session only retains worktree fallback without workspacePath", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_workspace_reclaim_clone_missing_path_01",
      task: "Resume reclaim rejects clone stale session records without explicit workspacePath"
    });

    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        work_mode: "clone"
      }),
      "utf8"
    );

    await upsertRuntimeSession({
      sessionsPath: bubble.paths.sessionsPath,
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      workspaceKind: "clone",
      tmuxSessionName:
        "pf-b_start_resume_workspace_reclaim_clone_missing_path_01-stale",
      now: new Date("2026-02-23T09:24:00.000Z")
    });

    let removeCalled = false;
    let launchCalled = false;

    const thrown = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:25:00.000Z")
      },
      {
        isTmuxSessionAlive: () => Promise.resolve(false),
        removeRuntimeSession: async () => {
          removeCalled = true;
          return true;
        },
        buildResumeTranscriptSummary: async () =>
          "resume-summary: malformed-stale-clone-authority",
        launchBubbleTmuxSession: async () => {
          launchCalled = true;
          return {
            sessionName:
              "pf-b_start_resume_workspace_reclaim_clone_missing_path_01"
          };
        }
      }
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(StartBubbleError);
    expect((thrown as StartBubbleError).reasonCode).toBe(
      "START_LAUNCH_WORKSPACE_UNAVAILABLE"
    );
    expect((thrown as Error).message).toContain(
      "runtime session canonical workspace authority is missing"
    );
    expect(removeCalled).toBe(true);
    expect(launchCalled).toBe(false);
  });

  it("skips reviewer focus injection in resume mode when reviewer-focus artifact is schema-invalid", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_focus_invalid_artifact_01",
      task: [
        "# Task",
        "## Reviewer Focus",
        "- Valid focus exists in task, but artifact is tampered before resume"
      ].join("\n")
    });
    await writeFile(
      bubble.paths.reviewerFocusArtifactPath,
      JSON.stringify({
        status: "present",
        source: "none",
        focus_text: "schema-invalid artifact payload"
      }),
      "utf8"
    );

    let reviewerCommand: string | undefined;
    const result = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:02:00.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: invalid-reviewer-focus-artifact"),
        launchBubbleTmuxSession: (input) => {
          reviewerCommand = input.reviewerCommand;
          return Promise.resolve({
            sessionName: "pf-b_start_resume_focus_invalid_artifact_01"
          });
        }
      }
    );

    expect(result.state.state).toBe("RUNNING");
    expect(reviewerCommand).toContain("Pairflow reviewer resume");
    expect(reviewerCommand).toContain(
      "resume-summary: invalid-reviewer-focus-artifact"
    );
    expect(reviewerCommand).not.toContain(
      "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):"
    );
  });

  it("uses docs-only runtime evidence guidance in resume implementer prompts", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_docs_01",
      task: "Docs-only resume bubble",
      reviewArtifactType: "document"
    });

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:03:00.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: docs-only"),
        launchBubbleTmuxSession: (input) => {
          expect(input.implementerCommand).toContain(
            "runtime checks are not required in this round"
          );
          expect(input.implementerCommand).toContain(
            "Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output."
          );
          expect(input.implementerCommand).toContain(
            "Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path."
          );
          expect(input.implementerCommand).toContain(
            "Docs-only scope: choose one mode and keep it consistent in the same PASS."
          );
          expect(input.implementerCommand).toContain(
            "Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs."
          );
          expect(input.implementerCommand).toContain(
            "Mode B (checks executed): if you run validation"
          );
          expect(input.implementerKickoffMessage).toContain(
            "runtime checks are not required in this round"
          );
          expect(input.implementerCommand).not.toContain(
            "Missing expected evidence logs should be treated as incomplete validation packaging."
          );
          expect(input.reviewerCommand).toContain(
            "Runtime checks are not required for document-only scope."
          );
          expect(input.reviewerCommand).toContain(
            "Primary artifact review rule (docs-only): treat a PASS as out-of-scope if it only adds a new standalone review/synthesis document while the referenced source task/document file is unchanged."
          );
          expect(input.reviewerCommand).toContain(
            "In that case, request rework so the primary referenced artifact is refined directly."
          );
          expectReviewerValidationClaimGuardrails(input.reviewerCommand);
          expect(input.reviewerCommand).toContain("Stand by unless you are active or receive a handoff.");
          return Promise.resolve({ sessionName: "pf-b_start_resume_docs_01" });
        }
      }
    );
  });

  it("routes resume kickoff to reviewer when reviewer is active in RUNNING", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_03",
      task: "Resume reviewer active"
    });

    await updateBubbleState(bubble.paths.statePath, (current) => ({
      ...current,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer"
    }));

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:05:00.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: reviewer-active"),
        launchBubbleTmuxSession: (input) => {
          expect(input.implementerKickoffMessage).toBeUndefined();
          expect(input.reviewerKickoffMessage).toContain("resume kickoff (reviewer)");
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_A);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_D);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_F);
          expect(input.reviewerKickoffMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
          expect(input.reviewerKickoffMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_C);
          expect(input.reviewerKickoffMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
          expectNoForbiddenReviewerCommandGateTokens(input.reviewerKickoffMessage);
          return Promise.resolve({ sessionName: "pf-b_start_resume_03" });
        }
      }
    );
  });

  it("injects clean-path round>=2 command gate into reviewer resume kickoff", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_r2_clean_01",
      task: "Resume reviewer active round 2 clean"
    });

    await updateBubbleState(bubble.paths.statePath, (current) => ({
      ...current,
      round: 2,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer"
    }));

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:05:30.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: reviewer-active findings=0"),
        launchBubbleTmuxSession: (input) => {
          expect(input.reviewerKickoffMessage).toContain("resume kickoff (reviewer)");
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_B);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_C);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_D);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_F);
          expect(input.reviewerKickoffMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_A);
          expect(input.reviewerKickoffMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
          expectNoForbiddenReviewerCommandGateTokens(input.reviewerKickoffMessage);
          return Promise.resolve({ sessionName: "pf-b_start_resume_r2_clean_01" });
        }
      }
    );
  });

  it("injects findings-path round>=2 command gate into reviewer resume kickoff", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_r2_findings_01",
      task: "Resume reviewer active round 2 findings"
    });

    await updateBubbleState(bubble.paths.statePath, (current) => ({
      ...current,
      round: 2,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer"
    }));

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:05:40.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: reviewer-active findings=2"),
        launchBubbleTmuxSession: (input) => {
          expect(input.reviewerKickoffMessage).toContain("resume kickoff (reviewer)");
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_E);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_C);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_D);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_F);
          expect(input.reviewerKickoffMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_A);
          expect(input.reviewerKickoffMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
          expectNoForbiddenReviewerCommandGateTokens(input.reviewerKickoffMessage);
          return Promise.resolve({ sessionName: "pf-b_start_resume_r2_findings_01" });
        }
      }
    );
  });

  it("defaults to findings-path projection when resume summary cannot be parsed", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_r2_parse_fallback_01",
      task: "Resume reviewer projection parse fallback"
    });

    await updateBubbleState(bubble.paths.statePath, (current) => ({
      ...current,
      round: 2,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer"
    }));

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:05:45.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: reviewer-active findings=unknown"),
        launchBubbleTmuxSession: (input) => {
          expect(input.reviewerKickoffMessage).toContain("resume kickoff (reviewer)");
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_E);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_C);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_D);
          expect(input.reviewerKickoffMessage).toContain(REVIEWER_COMMAND_GATE_REQ_F);
          expect(input.reviewerKickoffMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
          expectNoForbiddenReviewerCommandGateTokens(input.reviewerKickoffMessage);
          return Promise.resolve({ sessionName: "pf-b_start_resume_r2_parse_fallback_01" });
        }
      }
    );
  });

  it("keeps shared command-gate invariants across round>=2 clean and findings resume-kickoff projections", async () => {
    const repoPath = await createTempRepo();
    const cleanBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_r2_proj_clean_01",
      task: "Resume reviewer projection clean"
    });
    const findingsBubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_r2_proj_findings_01",
      task: "Resume reviewer projection findings"
    });

    await updateBubbleState(cleanBubble.paths.statePath, (current) => ({
      ...current,
      round: 2,
      active_agent: cleanBubble.config.agents.reviewer,
      active_role: "reviewer"
    }));
    await updateBubbleState(findingsBubble.paths.statePath, (current) => ({
      ...current,
      round: 2,
      active_agent: findingsBubble.config.agents.reviewer,
      active_role: "reviewer"
    }));

    let cleanKickoff = "";
    let findingsKickoff = "";

    await startBubble(
      {
        bubbleId: cleanBubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:05:50.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: projection-clean findings=0"),
        launchBubbleTmuxSession: (input) => {
          cleanKickoff = input.reviewerKickoffMessage ?? "";
          return Promise.resolve({ sessionName: "pf-b_start_resume_r2_proj_clean_01" });
        }
      }
    );

    await startBubble(
      {
        bubbleId: findingsBubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:05:51.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: projection-findings findings=3"),
        launchBubbleTmuxSession: (input) => {
          findingsKickoff = input.reviewerKickoffMessage ?? "";
          return Promise.resolve({
            sessionName: "pf-b_start_resume_r2_proj_findings_01"
          });
        }
      }
    );

    expect(cleanKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(cleanKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(cleanKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(cleanKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(cleanKickoff).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(findingsKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(findingsKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(findingsKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(findingsKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(findingsKickoff).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
  });

  it("includes reviewer test directive line in reviewer resume startup prompt when evidence is verified", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_06",
      task: "Resume reviewer directive"
    });

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    const evidence = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      envelope: {
        id: "msg_resume_dir_01",
        ts: "2026-02-27T21:20:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [evidenceLogPath]
      },
      worktreePath: bubble.paths.worktreePath,
      repoPath
    });
    await writeReviewerTestEvidenceArtifact(
      resolveReviewerTestEvidenceArtifactPath(bubble.paths.artifactsDir),
      evidence
    );
    await updateBubbleState(bubble.paths.statePath, (current) => ({
      ...current,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer"
    }));

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-27T21:21:00.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: reviewer-directive"),
        launchBubbleTmuxSession: (input) => {
          expect(input.reviewerCommand).toContain("Current directive:");
          expect(input.reviewerCommand).toContain(
            "Implementer test evidence has been orchestrator-verified."
          );
          return Promise.resolve({ sessionName: "pf-b_start_resume_06" });
        }
      }
    );
  });

  it("includes docs-only reviewer directive line on resume when reviewer is active", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_doc_review_01",
      task: "Resume reviewer directive docs-only",
      reviewArtifactType: "document"
    });

    const evidence = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      envelope: {
        id: "msg_resume_dir_doc_01",
        ts: "2026-02-27T22:00:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Docs-only validation not required"
        },
        refs: []
      },
      worktreePath: bubble.paths.worktreePath,
      repoPath
    });
    await writeReviewerTestEvidenceArtifact(
      resolveReviewerTestEvidenceArtifactPath(bubble.paths.artifactsDir),
      evidence
    );
    await writeFile(join(bubble.paths.worktreePath, "post-evidence-doc-change.md"), "x\n", "utf8");
    await updateBubbleState(bubble.paths.statePath, (current) => ({
      ...current,
      active_agent: bubble.config.agents.reviewer,
      active_role: "reviewer"
    }));

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-27T22:01:00.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: reviewer-doc-directive"),
        launchBubbleTmuxSession: (input) => {
          expect(input.reviewerCommand).toContain("Current directive:");
          expect(input.reviewerCommand).toContain(
            "docs-only scope, runtime checks not required"
          );
          expectReviewerValidationClaimGuardrails(input.reviewerCommand);
          expect(input.reviewerKickoffMessage).toContain("resume kickoff (reviewer)");
          return Promise.resolve({ sessionName: "pf-b_start_resume_doc_review_01" });
        }
      }
    );
  });

  it("does not inject reviewer directive line when implementer is active on resume", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_07",
      task: "Resume implementer active"
    });

    const evidenceLogPath = await writeEvidenceLog(
      bubble.paths.worktreePath,
      "evidence.log",
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
    );

    const evidence = await verifyImplementerTestEvidence({
      bubbleId: bubble.bubbleId,
      bubbleConfig: bubble.config,
      envelope: {
        id: "msg_resume_dir_02",
        ts: "2026-02-27T21:30:00.000Z",
        bubble_id: bubble.bubbleId,
        sender: bubble.config.agents.implementer,
        recipient: bubble.config.agents.reviewer,
        type: "PASS",
        round: 1,
        payload: {
          summary: "Validation complete"
        },
        refs: [evidenceLogPath]
      },
      worktreePath: bubble.paths.worktreePath,
      repoPath
    });
    await writeReviewerTestEvidenceArtifact(
      resolveReviewerTestEvidenceArtifactPath(bubble.paths.artifactsDir),
      evidence
    );

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-27T21:31:00.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: implementer-active"),
        launchBubbleTmuxSession: (input) => {
          expect(input.reviewerCommand).not.toContain("Current directive:");
          expect(input.reviewerKickoffMessage).toBeUndefined();
          return Promise.resolve({ sessionName: "pf-b_start_resume_07" });
        }
      }
    );
  });

  it("skips resume kickoff when RUNNING active role/agent context is inconsistent", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_04",
      task: "Resume invalid active context"
    });

    await updateBubbleState(bubble.paths.statePath, (current) => ({
      ...current,
      active_agent: bubble.config.agents.implementer,
      active_role: "reviewer"
    }));

    await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:06:00.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: inconsistent-active"),
        launchBubbleTmuxSession: (input) => {
          expect(input.implementerKickoffMessage).toBeUndefined();
          expect(input.reviewerKickoffMessage).toBeUndefined();
          expect(input.implementerCommand).toContain("resume-summary: inconsistent-active");
          expect(input.reviewerCommand).toContain("resume-summary: inconsistent-active");
          expect(input.implementerCommand).toContain(
            "Kickoff diagnostic: RUNNING state active context is inconsistent;"
          );
          expect(input.reviewerCommand).toContain("No kickoff was sent");
          return Promise.resolve({ sessionName: "pf-b_start_resume_04" });
        }
      }
    );
  });

  it("does not send kickoff for resumable non-RUNNING states", async () => {
    const repoPath = await createTempRepo();
    const resumableStates = [
      "WAITING_HUMAN",
      "READY_FOR_HUMAN_APPROVAL",
      "APPROVED_FOR_COMMIT",
      "COMMITTED"
    ] as const;

    for (const stateValue of resumableStates) {
      const bubble = await setupRunningBubbleFixture({
        repoPath,
        bubbleId: `b_start_resume_state_${stateValue.toLowerCase()}`,
        task: `Resume ${stateValue}`
      });

      await updateBubbleState(bubble.paths.statePath, (current) => ({
        ...current,
        state: stateValue
      }));

      await startBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-23T09:07:00.000Z")
        },
        {
          buildResumeTranscriptSummary: () =>
            Promise.resolve(`resume-summary: state=${stateValue}`),
          launchBubbleTmuxSession: (input) => {
            expect(input.implementerKickoffMessage).toBeUndefined();
            expect(input.reviewerKickoffMessage).toBeUndefined();
            expect(input.implementerCommand).toContain(`state=${stateValue}`);
            expect(input.reviewerCommand).toContain(`state=${stateValue}`);
            return Promise.resolve({
              sessionName: `pf-b_start_resume_state_${stateValue.toLowerCase()}`
            });
          }
        }
      );
    }
  });

  it("sends explicit meta-reviewer kickoff when resuming RUNNING meta-review authority", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_meta_01",
      task: "Resume meta-review running"
    });

    await updateBubbleState(bubble.paths.statePath, (current) => ({
      ...current,
      state: "RUNNING",
      active_agent: "codex",
      active_role: "meta_reviewer",
      meta_review: {
        ...current.meta_review!,
        execution_context: buildMetaReviewExecutionContext({
          bubbleId: current.bubble_id,
          round: current.round,
          startedAt: current.active_since ?? "2026-02-23T09:00:00.000Z",
          watchdogTimeoutMinutes: 60,
          attempt: 1
        })
      }
    }));

    const result = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:07:30.000Z")
      },
      {
        buildResumeTranscriptSummary: () =>
          Promise.resolve("resume-summary: state=RUNNING(meta_review_authority)"),
        launchBubbleTmuxSession: (input) => {
          expect(input.implementerKickoffMessage).toBeUndefined();
          expect(input.reviewerKickoffMessage).toBeUndefined();
          expect(input.metaReviewerKickoffMessage).toContain(
            "resume kickoff (meta-reviewer)"
          );
          expect(input.metaReviewerKickoffMessage).toContain(
            "RUNNING"
          );
          return Promise.resolve({
            sessionName: "pf-b_start_resume_meta_01"
          });
        }
      }
    );

    expect(result.state.active_since).toBe("2026-02-23T09:07:30.000Z");
    expect(result.state.last_command_at).toBe("2026-02-23T09:07:30.000Z");
    expect(result.state.execution_context).toMatchObject({
      active_role: "meta_reviewer",
      awaited_output_type: "meta_review_result",
      handoff_id: `meta_review:${bubble.bubbleId}:round:1:attempt:1`,
      round: 1,
      started_at: "2026-02-21T12:00:00.000Z",
      deadline_at: "2026-02-21T13:00:00.000Z",
      attempt: 1
    });
    expect(result.state.execution_context?.execution_id).toMatch(
      /^exec_[0-9a-f]{24}$/u
    );
    expect(result.state.meta_review?.execution_context).toMatchObject({
      handoff_id: `meta_review:${bubble.bubbleId}:round:1:attempt:1`,
      round: 1,
      awaited_output_type: "meta_review_result",
      started_at: "2026-02-21T12:00:00.000Z",
      deadline_at: "2026-02-21T13:00:00.000Z",
      attempt: 1
    });
    expect(result.state.meta_review?.execution_context?.execution_id).toBe(
      result.state.execution_context?.execution_id
    );
  });

  it("keeps resume start robust when injected summary builder throws", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_05",
      task: "Resume summary fallback"
    });

    const result = await startBubble(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-23T09:08:00.000Z")
      },
      {
        buildResumeTranscriptSummary: () => {
          throw new Error("summary dependency failed");
        },
        launchBubbleTmuxSession: (input) => {
          expect(input.implementerCommand).toContain(
            "Resume transcript summary unavailable."
          );
          expect(input.reviewerCommand).toContain("reason=summary dependency failed");
          return Promise.resolve({ sessionName: "pf-b_start_resume_05" });
        }
      }
    );

    expect(result.state.state).toBe("RUNNING");
  });

  it("keeps runtime state unchanged when resume tmux launch fails", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_02",
      task: "Resume bubble failure"
    });

    await expect(
      startBubble(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-23T09:10:00.000Z")
        },
        {
          launchBubbleTmuxSession: () =>
            Promise.reject(new Error("tmux unavailable for resume"))
        }
      )
    ).rejects.toBeInstanceOf(StartBubbleError);

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");
  });

  it("fails closed when RUNNING resume is missing persisted execution_context authority", () => {
    expect(() =>
      buildResumedState({
        state: {
          state: "RUNNING",
          bubble_id: "b_start_resume_missing_ctx_01",
          round: 1,
          active_role: "implementer",
          execution_context: null
        } as never,
        nowIso: "2026-02-23T16:00:00.000Z",
        watchdogTimeoutMinutes: 60
      })
    ).toThrow(/RUNNING resume requires persisted execution_context authority/u);
  });

  it("rejects start when runtime session is already registered for bubble", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_04",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Start bubble task",
      cwd: repoPath
    });

    await upsertRuntimeSession({
      sessionsPath: created.paths.sessionsPath,
      bubbleId: created.bubbleId,
      repoPath,
      worktreePath: created.paths.worktreePath,
      tmuxSessionName: "pf-b_start_04",
      now: new Date("2026-02-22T20:00:00.000Z")
    });

    let bootstrapCalled = false;
    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T20:01:00.000Z")
        },
        {
          isTmuxSessionAlive: () => Promise.resolve(true),
          bootstrapWorktreeWorkspace: () => {
            bootstrapCalled = true;
            return Promise.resolve(
              buildWorktreeBootstrapResult({
                repoPath,
                bubbleBranch: created.config.bubble_branch,
                worktreePath: created.paths.worktreePath
              })
            );
          }
        }
      )
    ).rejects.toThrow(/Runtime session already registered/u);

    expect(bootstrapCalled).toBe(false);
    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("CREATED");
  });

  it("removes stale runtime session registration when tmux session is missing", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_05",
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: "Start bubble task",
      cwd: repoPath
    });

    await upsertRuntimeSession({
      sessionsPath: created.paths.sessionsPath,
      bubbleId: created.bubbleId,
      repoPath,
      worktreePath: created.paths.worktreePath,
      workspacePath: created.paths.worktreePath,
      workspaceKind: "worktree",
      tmuxSessionName: "pf-b_start_05-stale",
      now: new Date("2026-02-22T20:10:00.000Z")
    });

    const result = await startBubble(
      {
        bubbleId: created.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T20:11:00.000Z")
      },
      {
        isTmuxSessionAlive: () => Promise.resolve(false),
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve(
            buildWorktreeBootstrapResult({
              repoPath,
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            })
          ),
        launchBubbleTmuxSession: () =>
          Promise.resolve({ sessionName: "pf-b_start_05" })
      }
    );

    expect(result.tmuxSessionName).toBe("pf-b_start_05");
    expect(result.state.state).toBe("RUNNING");

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");
  });
});
