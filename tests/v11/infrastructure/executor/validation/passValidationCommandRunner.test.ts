import type { spawn } from "node:child_process";
import type { open } from "node:fs/promises";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

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

  it("records validation target identity and paths in the evidence log", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);
    await mkdir(join(worktreePath, "apps", "web"), { recursive: true });

    const result = await runPassValidationCommand({
      kind: "test",
      command: "printf 'target test ok\\n'",
      worktreePath,
      cwd: "apps/web",
      targetId: "web",
      targetPaths: ["apps/web/**", "packages/ui/**"]
    });

    const log = await readFile(join(worktreePath, result.logPath), "utf8");
    expect(log).toContain("target_id=web");
    expect(log).toContain("target_paths=apps/web/**,packages/ui/**");
    expect(log).toContain("target test ok");
  });

  it("keeps same-millisecond custom evidence logs distinct", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);
    const evidence = {
      header: "pairflow meta-review approve validation",
      logPathPrefix: "meta-review-approve-validation",
      timestamp: 123
    };

    const first = await runPassValidationCommand({
      kind: "test",
      command: "printf 'first run\\n'",
      worktreePath,
      evidence
    });
    const second = await runPassValidationCommand({
      kind: "test",
      command: "printf 'second run\\n'",
      worktreePath,
      evidence
    });

    expect(first.logPath).toBe(
      ".pairflow/evidence/meta-review-approve-validation-test-123.log"
    );
    expect(second.logPath).toBe(
      ".pairflow/evidence/meta-review-approve-validation-test-123-1.log"
    );
    await expect(readFile(join(worktreePath, first.logPath), "utf8"))
      .resolves.toContain("first run");
    await expect(readFile(join(worktreePath, second.logPath), "utf8"))
      .resolves.toContain("second run");
  });

  it("preserves stream capture failure context when settlement also fails", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-pass-validation-runner-"));
    cleanupPaths.push(worktreePath);
    const child = new EventEmitter() as EventEmitter & {
      stdout: Readable;
      stderr: Readable;
      kill: ReturnType<typeof vi.fn>;
    };
    child.stdout = Readable.from(["stdout chunk"]);
    child.stderr = Readable.from(["stderr chunk"]);
    child.kill = vi.fn();
    const originalOn = child.on.bind(child);
    child.on = ((eventName, listener) => {
      const result = originalOn(eventName, listener);
      if (eventName === "error") {
        queueMicrotask(() => {
          child.emit("error", new Error("spawn settlement failed"));
        });
      }
      return result;
    }) as typeof child.on;
    const spawnMock = vi.fn(() => child);
    let writeCount = 0;
    const fileHandle = {
      writeFile: vi.fn(async () => {
        writeCount += 1;
        if (writeCount > 1) {
          throw new Error("capture write failed");
        }
      }),
      close: vi.fn(async () => undefined)
    };
    await expect(
      runPassValidationCommand(
        {
          kind: "test",
          command: "printf 'will fail\\n'",
          worktreePath
        },
        {
          open: vi.fn(async () => fileHandle) as unknown as typeof open,
          spawn: spawnMock as unknown as typeof spawn
        }
      )
    ).rejects.toMatchObject({
      stage: "spawn",
      context: {
        reason:
          "settlement_failed;stdout_capture_failed;stderr_capture_failed"
      }
    });
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
