import type { open } from "node:fs/promises";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPassValidationCommand } from "../../../../../src/v11/infrastructure/executor/validation/passValidationCommandRunner.js";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("runPassValidationCommand", () => {
  it("runs the command and writes a canonical evidence log", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);

    const result = await runPassValidationCommand({
      kind: "typecheck",
      command: "printf 'typecheck ok\\n'",
      worktreePath
    });

    expect(result.exitCode).toBe(0);
    expect(result.logPath).toBe(".pairflow/evidence/pass-validation-typecheck.log");

    const log = await readFile(join(worktreePath, result.logPath), "utf8");
    expect(log).toContain("# pairflow pass validation");
    expect(log).toContain("kind=typecheck");
    expect(log).toContain("typecheck ok");
    expect(log).toContain("exit_code=0");
  });

  it("writes custom command id logs under the PASS evidence root", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);

    const result = await runPassValidationCommand({
      kind: "fitness",
      command: "printf 'fitness ok\\n'",
      worktreePath
    });

    expect(result.logPath).toBe(".pairflow/evidence/pass-validation-fitness.log");
    const log = await readFile(join(worktreePath, result.logPath), "utf8");
    expect(log).toContain("kind=fitness");
    expect(log).toContain("fitness ok");
  });

  it("runs from selected target cwd while keeping logs under worktree evidence", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);
    await mkdir(join(worktreePath, "apps", "web"), { recursive: true });
    const realTargetPath = await realpath(join(worktreePath, "apps", "web"));

    const result = await runPassValidationCommand({
      kind: "typecheck",
      command: "pwd",
      worktreePath,
      cwd: "apps/web"
    });

    expect(result.logPath).toBe(".pairflow/evidence/pass-validation-typecheck.log");
    const log = await readFile(join(worktreePath, result.logPath), "utf8");
    expect(log).toContain(`cwd=${realTargetPath}`);
    expect(log).toContain(`worktree=${worktreePath}`);
    expect(log).toContain(realTargetPath);
  });

  it("uses canonical real cwd when the selected target cwd is an internal symlink", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);
    const realTargetPath = join(worktreePath, "packages", "web-real");
    await mkdir(realTargetPath, { recursive: true });
    await mkdir(join(worktreePath, "apps"), { recursive: true });
    await symlink(realTargetPath, join(worktreePath, "apps", "web"));
    const canonicalTargetPath = await realpath(realTargetPath);

    const result = await runPassValidationCommand({
      kind: "typecheck",
      command: "pwd",
      worktreePath,
      cwd: "apps/web"
    });

    const log = await readFile(join(worktreePath, result.logPath), "utf8");
    expect(log).toContain(`cwd=${canonicalTargetPath}`);
    expect(log).toContain(canonicalTargetPath);
  });

  it("rejects target cwd traversal before command execution", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);

    await expect(
      runPassValidationCommand({
        kind: "typecheck",
        command: "printf 'should not run\\n'",
        worktreePath,
        cwd: "../outside"
      })
    ).rejects.toMatchObject({
      name: "PassValidationRunnerExecutionError",
      stage: "pre_header",
      context: {
        reason: "prepare_log_file_failed",
        cwd: "../outside"
      }
    });
    await expect(
      runPassValidationCommand({
        kind: "typecheck",
        command: "printf 'should not run\\n'",
        worktreePath,
        cwd: "../outside"
      })
    ).rejects.toThrow(/VALIDATION_TARGET_CWD_INVALID/u);
  });

  it("rejects target cwd symlink escape before command execution", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    const outsidePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-outside-"));
    cleanupPaths.push(worktreePath, outsidePath);
    await mkdir(join(worktreePath, "apps"), { recursive: true });
    await symlink(outsidePath, join(worktreePath, "apps", "web"));

    await expect(
      runPassValidationCommand({
        kind: "typecheck",
        command: "printf 'should not run\\n'",
        worktreePath,
        cwd: "apps/web"
      })
    ).rejects.toThrow(/VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE/u);
  });

  it("classifies missing worktree cwd failures with a precise pre-header reason", async () => {
    const parentPath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(parentPath);
    const missingWorktreePath = join(parentPath, "missing-worktree");

    await expect(
      runPassValidationCommand({
        kind: "typecheck",
        command: "printf 'should not run\\n'",
        worktreePath: missingWorktreePath,
        cwd: "apps/web"
      })
    ).rejects.toMatchObject({
      name: "PassValidationRunnerExecutionError",
      stage: "pre_header",
      context: {
        reason: "validation_target_worktree_missing",
        worktreePath: missingWorktreePath,
        cwd: "apps/web"
      }
    });
  });

  it("closes the log file handle when header writing fails after open", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);
    const close = vi.fn(async () => undefined);
    const fileHandle = {
      writeFile: vi.fn(async () => {
        throw new Error("header write failed");
      }),
      close
    };

    await expect(
      runPassValidationCommand(
        {
          kind: "typecheck",
          command: "printf 'should not run\\n'",
          worktreePath
        },
        {
          open: vi.fn(async () => fileHandle) as unknown as typeof open
        }
      )
    ).rejects.toMatchObject({
      stage: "pre_header",
      context: {
        reason: "prepare_log_file_failed"
      }
    });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
