import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/v11/shared/config/bubbleConfigTypes.js";
import { PassValidationRunnerExecutionError } from "../../../../src/v11/infrastructure/executor/validation/passValidationCommandRunner.js";
import { resolvePassValidationForPass } from "../../../../src/v11/application/pass/internal/verification/passValidationGate.js";
import { passValidationDefaults } from "../../../../src/v11/defaults/pass/passValidationCommandDefaults.js";

const passValidationGateTestDefaults = {
  resolvePassValidationPolicy: passValidationDefaults.resolvePassValidationPolicy,
  createPassValidationReviewerDirective:
    passValidationDefaults.createPassValidationReviewerDirective,
  resolvePassValidationArtifactPath:
    passValidationDefaults.resolvePassValidationArtifactPath,
  resolvePassValidationReviewerCompatibilityArtifactPath:
    passValidationDefaults.resolvePassValidationReviewerCompatibilityArtifactPath,
  isPassValidationRunnerExecutionError: (
    error: unknown
  ): error is PassValidationRunnerExecutionError =>
    error instanceof PassValidationRunnerExecutionError,
  runPassValidationCommand: async () => ({
    command: "pnpm test",
    exitCode: 0,
    logPath: ".pairflow/evidence/pass-validation-test.log",
    durationMs: 0,
    executionCwd: "/tmp/worktree"
  }),
  buildPassValidationEvidenceArtifact: async () => ({}),
  writePassValidationEvidenceArtifact: async () => undefined,
  writePassValidationReviewerCompatibilityArtifact: async () => undefined
};

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

function createBubbleConfig(
  reviewArtifactType: BubbleConfig["review_artifact_type"] = "code"
): BubbleConfig {
  return {
    id: "b_pass_validation_gate_01",
    repo_path: "/tmp/repo",
    base_branch: "main",
    bubble_branch: "bubble/b_pass_validation_gate_01",
    work_mode: "worktree",
    quality_mode: "strict",
    review_artifact_type: reviewArtifactType,
    pairflow_command_profile: "external",
    reviewer_context_mode: "fresh",
    watchdog_timeout_minutes: 30,
    max_rounds: 8,
    severity_gate_round: 4,
    commit_requires_approval: true,
    accuracy_critical: false,
    agents: {
      implementer: "codex",
      reviewer: "claude",
      meta_reviewer: "codex"
    },
    commands: {
      lint: "pnpm lint",
      typecheck: "pnpm typecheck",
      test: "pnpm test"
    },
    notifications: {
      enabled: true
    },
    doc_contract_gates: {
      round_gate_applies_after: 2
    }
  };
}

describe("resolvePassValidationForPass", () => {
  it("returns trusted skip directive and validation refs for configured successful policy", async () => {
    const writtenArtifacts: string[] = [];
    const result = await resolvePassValidationForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_pass_validation_gate_01",
        bubbleConfig: {
          ...createBubbleConfig(),
          commands: {
            ...createBubbleConfig().commands,
            validation_required: ["typecheck", "test"]
          }
        },
        worktreePath: "/tmp/worktree",
        artifactsDir: "/tmp/artifacts",
        round: 2,
        now: new Date("2026-03-28T10:00:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        ...passValidationGateTestDefaults,
        runPassValidationCommand: async ({ kind, command }) => ({
          command,
          exitCode: 0,
          logPath: `.pairflow/evidence/pass-validation-${kind}.log`,
          durationMs: 5,
          executionCwd: "/tmp/worktree"
        }),
        buildPassValidationEvidenceArtifact: async () => ({}) as never,
        writePassValidationEvidenceArtifact: async (path) => {
          writtenArtifacts.push(path);
        },
        writePassValidationReviewerCompatibilityArtifact: async (path) => {
          writtenArtifacts.push(path);
        }
      }
    );

    expect(result.validationRefs).toEqual([
      ".pairflow/evidence/pass-validation-typecheck.log",
      ".pairflow/evidence/pass-validation-test.log"
    ]);
    expect(result.reviewerTestDirective).toEqual({
      skip_full_rerun: true,
      reason_code: "no_trigger",
      reason_detail:
        "PASS validation completed successfully for required commands: typecheck, test.",
      verification_status: "trusted"
    });
    expect(writtenArtifacts).toHaveLength(2);
    expect(writtenArtifacts).toContain("/tmp/artifacts/pass-validation-evidence.json");
    expect(writtenArtifacts).toContain(
      "/tmp/artifacts/pass-validation-reviewer-compatibility.json"
    );
  });

  it("runs custom required validation commands from bubble config authority", async () => {
    const runnerCalls: string[] = [];
    const result = await resolvePassValidationForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_pass_validation_gate_01",
        bubbleConfig: {
          ...createBubbleConfig(),
          commands: {
            ...createBubbleConfig().commands,
            fitness: "pnpm fitness",
            validation_required: ["fitness"]
          }
        },
        worktreePath: "/tmp/worktree",
        artifactsDir: "/tmp/artifacts",
        round: 2,
        now: new Date("2026-03-28T10:00:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        ...passValidationGateTestDefaults,
        runPassValidationCommand: async ({ kind, command }) => {
          runnerCalls.push(`${kind}:${command}`);
          return {
            command,
            exitCode: 0,
            logPath: `.pairflow/evidence/pass-validation-${kind}.log`,
            durationMs: 5,
            executionCwd: "/tmp/worktree"
          };
        },
        buildPassValidationEvidenceArtifact: async () => ({}) as never,
        writePassValidationEvidenceArtifact: async () => undefined,
        writePassValidationReviewerCompatibilityArtifact: async () => undefined
      }
    );

    expect(runnerCalls).toEqual(["fitness:pnpm fitness"]);
    expect(result.validationRefs).toEqual([
      ".pairflow/evidence/pass-validation-fitness.log"
    ]);
    expect(result.reviewerTestDirective?.reason_detail).toContain("fitness");
  });

  it("does not run meta-review approve-only commands during PASS validation", async () => {
    const runnerCalls: string[] = [];
    const result = await resolvePassValidationForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_pass_validation_gate_01",
        bubbleConfig: {
          ...createBubbleConfig(),
          commands: {
            ...createBubbleConfig().commands,
            fitness: "pnpm fitness:check:ci",
            validation_required: ["lint", "typecheck", "fitness"],
            meta_review_approve_required: ["test"]
          }
        },
        worktreePath: "/tmp/worktree",
        artifactsDir: "/tmp/artifacts",
        round: 2,
        now: new Date("2026-05-02T10:00:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        ...passValidationGateTestDefaults,
        runPassValidationCommand: async ({ kind, command }) => {
          runnerCalls.push(`${kind}:${command}`);
          return {
            command,
            exitCode: 0,
            logPath: `.pairflow/evidence/pass-validation-${kind}.log`,
            durationMs: 5,
            executionCwd: "/tmp/worktree"
          };
        },
        buildPassValidationEvidenceArtifact: async () => ({}) as never,
        writePassValidationEvidenceArtifact: async () => undefined,
        writePassValidationReviewerCompatibilityArtifact: async () => undefined
      }
    );

    expect(runnerCalls).toEqual([
      "lint:pnpm lint",
      "typecheck:pnpm typecheck",
      "fitness:pnpm fitness:check:ci"
    ]);
    expect(runnerCalls).not.toContain("test:pnpm test");
    expect(result.validationRefs).toEqual([
      ".pairflow/evidence/pass-validation-lint.log",
      ".pairflow/evidence/pass-validation-typecheck.log",
      ".pairflow/evidence/pass-validation-fitness.log"
    ]);
  });

  it("preserves selected target paths through execution result and evidence build input", async () => {
    const runnerInputs: Array<{ cwd?: string }> = [];
    let evidenceCommands:
      | Array<{
          targetId?: string;
          cwd?: string;
          targetPaths?: string[];
        }>
      | undefined;

    await resolvePassValidationForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_pass_validation_gate_01",
        bubbleConfig: {
          ...createBubbleConfig(),
          validation_target: {
            id: "web",
            cwd: "apps/web",
            paths: ["apps/web/**", "packages/ui/**"]
          },
          commands: {
            ...createBubbleConfig().commands,
            validation_required: ["typecheck"]
          }
        },
        worktreePath: "/tmp/worktree",
        artifactsDir: "/tmp/artifacts",
        round: 2,
        now: new Date("2026-03-28T10:00:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        ...passValidationGateTestDefaults,
        runPassValidationCommand: async ({ command, cwd }) => {
          runnerInputs.push(cwd !== undefined ? { cwd } : {});
          return {
            command,
            exitCode: 0,
            logPath: ".pairflow/evidence/pass-validation-typecheck.log",
            durationMs: 5,
            executionCwd: "/tmp/worktree/apps/web"
          };
        },
        buildPassValidationEvidenceArtifact: async (input) => {
          evidenceCommands = input.commands;
          return {} as never;
        },
        writePassValidationEvidenceArtifact: async () => undefined,
        writePassValidationReviewerCompatibilityArtifact: async () => undefined
      }
    );

    expect(runnerInputs).toEqual([{ cwd: "apps/web" }]);
    expect(evidenceCommands).toEqual([
      {
        kind: "typecheck",
        command: "pnpm typecheck",
        exitCode: 0,
        logPath: ".pairflow/evidence/pass-validation-typecheck.log",
        durationMs: 5,
        targetId: "web",
        cwd: "/tmp/worktree/apps/web",
        targetPaths: ["apps/web/**", "packages/ui/**"]
      }
    ]);
  });

  it("fails closed when configured policy references a missing command", async () => {
    await expect(
      resolvePassValidationForPass(
        {
          senderRole: "implementer",
          bubbleId: "b_pass_validation_gate_01",
          bubbleConfig: {
            ...createBubbleConfig(),
            commands: {
              test: "pnpm test",
              typecheck: "pnpm typecheck",
              validation_required: ["lint"]
            }
          },
          worktreePath: "/tmp/worktree",
          artifactsDir: "/tmp/artifacts",
          round: 2,
          now: new Date("2026-03-28T10:00:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
        passValidationGateTestDefaults
      )
    ).rejects.toThrow(/pass_validation_command_missing/u);
  });

  it("returns trusted explicit-null directive without running commands", async () => {
    let runnerCalls = 0;
    let canonicalArtifactWrites = 0;
    let compatibilityArtifactWrites = 0;
    const result = await resolvePassValidationForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_pass_validation_gate_01",
        bubbleConfig: {
          ...createBubbleConfig(),
          commands: {
            ...createBubbleConfig().commands,
            validation_required: [],
            validation_required_explicit: true
          }
        },
        worktreePath: "/tmp/worktree",
        artifactsDir: "/tmp/artifacts",
        round: 2,
        now: new Date("2026-03-28T10:00:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        ...passValidationGateTestDefaults,
        runPassValidationCommand: async () => {
          runnerCalls += 1;
          return {
            command: "noop",
            exitCode: 0,
            logPath: ".pairflow/evidence/noop.log",
            durationMs: 0,
            executionCwd: "/tmp/worktree"
          };
        },
        buildPassValidationEvidenceArtifact: async () => ({}) as never,
        writePassValidationEvidenceArtifact: async () => {
          canonicalArtifactWrites += 1;
        },
        writePassValidationReviewerCompatibilityArtifact: async () => {
          compatibilityArtifactWrites += 1;
        }
      }
    );

    expect(runnerCalls).toBe(0);
    expect(result.validationRefs).toEqual([]);
    expect(result.reviewerTestDirective).toEqual({
      skip_full_rerun: true,
      reason_code: "no_trigger",
      reason_detail:
        "PASS validation policy explicitly disables required commands for this bubble.",
      verification_status: "trusted"
    });
    expect(canonicalArtifactWrites).toBe(1);
    expect(compatibilityArtifactWrites).toBe(1);
  });

  it("returns untrusted run_checks directive when validation policy is missing", async () => {
    const result = await resolvePassValidationForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_pass_validation_gate_01",
        bubbleConfig: createBubbleConfig(),
        worktreePath: "/tmp/worktree",
        artifactsDir: "/tmp/artifacts",
        round: 2,
        now: new Date("2026-03-28T10:00:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        ...passValidationGateTestDefaults,
        buildPassValidationEvidenceArtifact: async () => ({}) as never,
        writePassValidationEvidenceArtifact: async () => undefined,
        writePassValidationReviewerCompatibilityArtifact: async () => undefined
      }
    );

    expect(result.validationRefs).toEqual([]);
    expect(result.reviewerTestDirective).toEqual({
      skip_full_rerun: false,
      reason_code: "pass_validation_policy_missing",
      reason_detail:
        "PASS validation policy is not configured in bubble [commands]; reviewer must run checks.",
      verification_status: "untrusted"
    });
  });

  it("fails closed when canonical artifact persist fails", async () => {
    await expect(
      resolvePassValidationForPass(
        {
          senderRole: "implementer",
          bubbleId: "b_pass_validation_gate_01",
          bubbleConfig: createBubbleConfig(),
          worktreePath: "/tmp/worktree",
          artifactsDir: "/tmp/artifacts",
          round: 2,
          now: new Date("2026-03-28T10:00:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
      {
        ...passValidationGateTestDefaults,
        buildPassValidationEvidenceArtifact: async () => ({}) as never,
          writePassValidationEvidenceArtifact: async () => {
            throw new Error("persist failed");
          }
        }
      )
    ).rejects.toThrow(/pass_validation_artifact_persist_failed/u);
  });

  it("fails closed when validation runner raises execution error", async () => {
    await expect(
      resolvePassValidationForPass(
        {
          senderRole: "implementer",
          bubbleId: "b_pass_validation_gate_01",
          bubbleConfig: {
            ...createBubbleConfig(),
            commands: {
              ...createBubbleConfig().commands,
              validation_required: ["typecheck"]
            }
          },
          worktreePath: "/tmp/worktree",
          artifactsDir: "/tmp/artifacts",
          round: 2,
          now: new Date("2026-03-28T10:00:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
      {
        ...passValidationGateTestDefaults,
        runPassValidationCommand: async () => {
            throw new PassValidationRunnerExecutionError({
              kind: "typecheck",
              stage: "spawn",
              logPath: ".pairflow/evidence/pass-validation-typecheck.log",
              cause: new Error("spawn failed")
            });
          }
        }
      )
    ).rejects.toThrow(
      /pass_validation_execution_error: PASS validation execution failed for typecheck\. See \.pairflow\/evidence\/pass-validation-typecheck\.log\./u
    );
  });

  it("fails closed when pass validation artifact build fails", async () => {
    await expect(
      resolvePassValidationForPass(
        {
          senderRole: "implementer",
          bubbleId: "b_pass_validation_gate_01",
          bubbleConfig: createBubbleConfig(),
          worktreePath: "/tmp/worktree",
          artifactsDir: "/tmp/artifacts",
          round: 2,
          now: new Date("2026-03-28T10:00:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
      {
        ...passValidationGateTestDefaults,
        buildPassValidationEvidenceArtifact: async () => {
            throw new Error("build failed");
          }
        }
      )
    ).rejects.toThrow(
      /pass_validation_artifact_persist_failed: Failed to build PASS validation artifact: build failed/u
    );
  });

  it("continues with warning when reviewer compatibility artifact persist fails", async () => {
    const result = await resolvePassValidationForPass(
      {
        senderRole: "implementer",
        bubbleId: "b_pass_validation_gate_01",
        bubbleConfig: createBubbleConfig(),
        worktreePath: "/tmp/worktree",
        artifactsDir: "/tmp/artifacts",
        round: 2,
        now: new Date("2026-03-28T10:00:00.000Z"),
        createError: (input) => new Error(toErrorMessage(input))
      },
      {
        ...passValidationGateTestDefaults,
        buildPassValidationEvidenceArtifact: async () => ({}) as never,
        writePassValidationEvidenceArtifact: async () => undefined,
        writePassValidationReviewerCompatibilityArtifact: async () => {
          throw new Error("compat failed");
        }
      }
    );

    expect(result.reviewerTestDirective?.reason_code).toBe("pass_validation_policy_missing");
    expect(result.compatibilityArtifactWriteFailureReason).toContain(
      "pass_validation_reviewer_compat_artifact_persist_failed"
    );
  });

  it("fails closed when validation_required contains duplicate ids", async () => {
    let runnerCalls = 0;

    await expect(
      resolvePassValidationForPass(
        {
          senderRole: "implementer",
          bubbleId: "b_pass_validation_gate_01",
          bubbleConfig: {
            ...createBubbleConfig(),
            commands: {
              ...createBubbleConfig().commands,
              validation_required: ["typecheck", "typecheck"]
            }
          },
          worktreePath: "/tmp/worktree",
          artifactsDir: "/tmp/artifacts",
          round: 2,
          now: new Date("2026-03-28T10:00:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
      {
        ...passValidationGateTestDefaults,
        runPassValidationCommand: async () => {
            runnerCalls += 1;
            return {
              command: "noop",
              exitCode: 0,
              logPath: ".pairflow/evidence/noop.log",
              durationMs: 0,
              executionCwd: "/tmp/worktree"
            };
          }
        }
      )
    ).rejects.toThrow(/duplicate id 'typecheck'/u);
    expect(runnerCalls).toBe(0);
  });

  it("fails closed without running commands when validation_required references a reserved id", async () => {
    let runnerCalls = 0;

    await expect(
      resolvePassValidationForPass(
        {
          senderRole: "implementer",
          bubbleId: "b_pass_validation_gate_01",
          bubbleConfig: {
            ...createBubbleConfig(),
            commands: {
              ...createBubbleConfig().commands,
              validation_required: ["validation_required"]
            }
          },
          worktreePath: "/tmp/worktree",
          artifactsDir: "/tmp/artifacts",
          round: 2,
          now: new Date("2026-03-28T10:00:00.000Z"),
          createError: (input) => new Error(toErrorMessage(input))
        },
      {
        ...passValidationGateTestDefaults,
        runPassValidationCommand: async () => {
            runnerCalls += 1;
            return {
              command: "noop",
              exitCode: 0,
              logPath: ".pairflow/evidence/noop.log",
              durationMs: 0,
              executionCwd: "/tmp/worktree"
            };
          }
        }
      )
    ).rejects.toThrow(/unsupported id 'validation_required'/u);
    expect(runnerCalls).toBe(0);
  });
});
