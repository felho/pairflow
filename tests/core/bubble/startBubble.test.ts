import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { startBubble, StartBubbleError } from "../../../src/core/bubble/startBubble.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import {
  REVIEWER_COMMAND_GATE_FORBIDDEN,
  REVIEWER_COMMAND_GATE_REQ_A,
  REVIEWER_COMMAND_GATE_REQ_B,
  REVIEWER_COMMAND_GATE_REQ_C,
  REVIEWER_COMMAND_GATE_REQ_D,
  REVIEWER_COMMAND_GATE_REQ_E
} from "../../../src/core/runtime/reviewerCommandGateGuidance.js";
import {
  resolveReviewerTestEvidenceArtifactPath,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "../../../src/core/reviewer/testEvidence.js";
import { shellQuote } from "../../../src/core/util/shellQuote.js";
import type { BubbleStateSnapshot } from "../../../src/types/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { writeEvidenceLog } from "../../helpers/evidence.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix: string = "pairflow-start-bubble-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
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
  await writeStateSnapshot(
    statePath,
    updater(loaded.state),
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
    const claims: Array<{
      bubbleId: string;
      session: string;
      worktreePath: string;
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
          return Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          });
        },
        launchBubbleTmuxSession: (input) => {
          calls.push("launch");
          implementerCommand = input.implementerCommand;
          reviewerCommand = input.reviewerCommand;
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
            worktreePath: input.worktreePath
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

    const loaded = await readStateSnapshot(created.paths.statePath);
    expect(loaded.state.state).toBe("RUNNING");

    if (implementerCommand === undefined || reviewerCommand === undefined) {
      throw new Error("Expected agent commands to be captured.");
    }
    const implementerScript = extractBashLcScript(implementerCommand);
    const reviewerScript = extractBashLcScript(reviewerCommand);
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
      `Execute pairflow commands from this worktree path only: ${created.paths.worktreePath}.`
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
    expect(reviewerCommand).toContain("Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)");
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
    expect(reviewerCommand).toMatch(
      /--finding [^`]*'P1:\.\.\.\|artifact:\/\/\.\.\.'/
    );
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_A);
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(reviewerCommand).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(reviewerCommand).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expectNoForbiddenReviewerCommandGateTokens(reviewerCommand);
    expect(implementerCommand).not.toContain("then;");
    expect(reviewerCommand).not.toContain("then;");
    await assertBashParses(implementerCommand);
    await assertBashParses(reviewerCommand);
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
          return Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          });
        },
        runWorktreeBootstrapCommand: async (input) => {
          callOrder.push("commands.bootstrap");
          expect(input.bubbleId).toBe(created.bubbleId);
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

    await expect(
      startBubble(
        {
          bubbleId: created.bubbleId,
          cwd: repoPath,
          now: new Date("2026-02-22T13:00:00.000Z")
        },
        {
          bootstrapWorktreeWorkspace: () =>
            Promise.resolve({
              repoPath,
              baseRef: "refs/heads/main",
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            }),
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
      )
    ).rejects.toThrow(
      /Failed to start bubble b_start_bootstrap_cmd_fail_01: bootstrap command failed/u
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
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
      "Document scope: `pairflow pass` for blockers is valid only when structured findings include strict qualifiers (`timing=required-now` + `layer=L1`)."
    );
    expect(reviewerCommand).toContain(
      "CLI `--finding` cannot encode these qualifiers"
    );
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
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
              return Promise.resolve({
                repoPath,
                baseRef: "refs/heads/main",
                bubbleBranch: created.config.bubble_branch,
                worktreePath: created.paths.worktreePath
              });
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
            Promise.resolve({
              repoPath,
              baseRef: "refs/heads/main",
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            }),
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
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
    expect(statusScript).toContain("next_signature=$(");
    expect(statusScript).toContain("if [ \"$next_signature\" != \"$prev_signature\" ]; then");
    expect(statusScript).toContain(
      `node ${shellQuote(`${created.paths.worktreePath}/dist/cli/index.js`)} bubble status --id`
    );
    expect(statusScript).not.toContain("clear;");
    await assertBashParses(statusCommand);
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
          return Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: bubble.config.bubble_branch,
            worktreePath: bubble.paths.worktreePath
          });
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
            `Execute pairflow commands from this worktree path only: ${bubble.paths.worktreePath}.`
          );
          expect(input.implementerCommand).toContain(
            `Use the worktree-local Pairflow CLI pinned in this pane (${bubble.paths.worktreePath}/dist/cli/index.js).`
          );
          expect(input.implementerCommand).toContain("resume-summary: messages=3");
          expect(input.reviewerCommand).toContain("--dangerously-skip-permissions");
          expect(input.reviewerCommand).toContain("Pairflow reviewer resume");
          expect(input.reviewerCommand).toContain(
            `Use the worktree-local Pairflow CLI pinned in this pane (${bubble.paths.worktreePath}/dist/cli/index.js).`
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
          expect(input.reviewerCommand).toContain("Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)");
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
          expect(input.reviewerCommand).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
          expectNoForbiddenReviewerCommandGateTokens(input.reviewerCommand);
          return Promise.resolve({ sessionName: "pf-b_start_resume_01" });
        }
      }
    );

    expect(bootstrapCalled).toBe(false);
    expect(summaryPath).toBe(bubble.paths.transcriptPath);
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.last_command_at).toBe("2026-02-23T09:00:00.000Z");
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
    expect(cleanKickoff).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(findingsKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(findingsKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(findingsKickoff).toContain(REVIEWER_COMMAND_GATE_REQ_E);
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
      "READY_FOR_APPROVAL",
      "META_REVIEW_RUNNING",
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
            return Promise.resolve({
              repoPath,
              baseRef: "refs/heads/main",
              bubbleBranch: created.config.bubble_branch,
              worktreePath: created.paths.worktreePath
            });
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
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: created.config.bubble_branch,
            worktreePath: created.paths.worktreePath
          }),
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
