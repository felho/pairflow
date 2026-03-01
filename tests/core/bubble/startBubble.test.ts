import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { startBubble, StartBubbleError } from "../../../src/core/bubble/startBubble.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import {
  resolveReviewerTestEvidenceArtifactPath,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "../../../src/core/reviewer/testEvidence.js";
import type { BubbleStateSnapshot } from "../../../src/types/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempRepo(prefix: string = "pairflow-start-bubble-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function assertBashParses(command: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn("bash", ["-n", "-c", command], {
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
    expect(implementerCommand).toContain("Dropping to interactive shell");
    expect(reviewerCommand).toContain("Dropping to interactive shell");
    expect(implementerCommand).toContain("set +e");
    expect(reviewerCommand).toContain("set +e");
    expect(implementerCommand).toContain("exec bash -i");
    expect(reviewerCommand).toContain("exec bash -i");
    expect(implementerCommand).toContain("codex");
    expect(implementerCommand).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(implementerCommand).toContain("Pairflow implementer start");
    expect(implementerCommand).toContain(created.paths.taskArtifactPath);
    expect(implementerCommand).toContain(
      join(created.paths.artifactsDir, "done-package.md")
    );
    expect(reviewerCommand).toContain("claude");
    expect(reviewerCommand).toContain("--dangerously-skip-permissions");
    expect(reviewerCommand).toContain("--permission-mode");
    expect(reviewerCommand).toContain("bypassPermissions");
    expect(reviewerCommand).toContain("Pairflow reviewer start");
    expect(reviewerCommand).toContain("Stand by first. Do not start reviewing");
    expect(reviewerCommand).toContain("Severity Ontology v1 reminder");
    expect(reviewerCommand).toContain("Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)");
    expect(reviewerCommand).toContain("Blocker severities (`P0/P1`) require concrete evidence");
    expect(reviewerCommand).toContain("Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default");
    expect(reviewerCommand).toContain("Cosmetic/comment-only findings are `P3`");
    expect(reviewerCommand).toContain("Out-of-scope observations should be notes (`P3`)");
    expect(reviewerCommand).toMatch(
      /--finding [^`]*'P1:\.\.\.\|artifact:\/\/\.\.\.'/
    );
    expect(reviewerCommand).toContain(
      "If clean, run `pairflow converged --summary` directly"
    );
    expect(reviewerCommand).toContain(
      "do not run `pairflow pass --no-findings` first"
    );
    expect(implementerCommand).not.toContain("then;");
    expect(reviewerCommand).not.toContain("then;");
    await assertBashParses(implementerCommand);
    await assertBashParses(reviewerCommand);
  });

  it("injects document-focused reviewer guidance for doc-centric bubbles", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_doc_01",
      repoPath,
      baseBranch: "main",
      task: "Document-only task file iteration for docs/ markdown and PRD clarity.",
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
    expect(reviewerCommand).toContain("document/task artifacts");
    expect(reviewerCommand).toContain("Do not force `feature-dev:code-reviewer`");
  });

  it("fails before bootstrap when runtime session ownership claim fails", async () => {
    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_start_021",
      repoPath,
      baseBranch: "main",
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
    expect(statusCommand).toContain("pairflow bubble watchdog --id");
    expect(statusCommand).toContain("pairflow bubble status --id");
    expect(statusCommand).not.toContain("--json");
    await assertBashParses(statusCommand);
  });

  it("resumes RUNNING bubble with resume prompts and active implementer kickoff", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_01",
      task: "Resume bubble"
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
          expect(input.implementerBootstrapMessage).toBeUndefined();
          expect(input.reviewerBootstrapMessage).toBeUndefined();
          expect(input.implementerKickoffMessage).toContain("resume kickoff (implementer)");
          expect(input.reviewerKickoffMessage).toBeUndefined();
          expect(input.implementerCommand).toContain(
            "--dangerously-bypass-approvals-and-sandbox"
          );
          expect(input.implementerCommand).toContain("Pairflow implementer resume");
          expect(input.implementerCommand).toContain("resume-summary: messages=3");
          expect(input.reviewerCommand).toContain("--dangerously-skip-permissions");
          expect(input.reviewerCommand).toContain("Pairflow reviewer resume");
          expect(input.reviewerCommand).toContain("resume-summary: messages=3");
          expect(input.reviewerCommand).toContain("Severity Ontology v1 reminder");
          expect(input.reviewerCommand).toContain("Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)");
          expect(input.reviewerCommand).toContain("Blocker severities (`P0/P1`) require concrete evidence");
          expect(input.reviewerCommand).toContain("Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default");
          return Promise.resolve({ sessionName: "pf-b_start_resume_01" });
        }
      }
    );

    expect(bootstrapCalled).toBe(false);
    expect(summaryPath).toBe(bubble.paths.transcriptPath);
    expect(result.state.state).toBe("RUNNING");
    expect(result.state.last_command_at).toBe("2026-02-23T09:00:00.000Z");
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
          return Promise.resolve({ sessionName: "pf-b_start_resume_03" });
        }
      }
    );
  });

  it("includes reviewer test directive line in reviewer resume startup prompt when evidence is verified", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_06",
      task: "Resume reviewer directive"
    });

    const evidenceLogPath = join(
      bubble.paths.worktreePath,
      "evidence.log"
    );
    await writeFile(
      evidenceLogPath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
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

  it("does not inject reviewer directive line when implementer is active on resume", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_start_resume_07",
      task: "Resume implementer active"
    });

    const evidenceLogPath = join(
      bubble.paths.worktreePath,
      "evidence.log"
    );
    await writeFile(
      evidenceLogPath,
      "pnpm typecheck exit=0 found 0 errors\npnpm test exit=0 406 tests passed\n",
      "utf8"
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
