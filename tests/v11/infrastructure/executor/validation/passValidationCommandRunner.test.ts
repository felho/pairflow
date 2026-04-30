import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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
});
