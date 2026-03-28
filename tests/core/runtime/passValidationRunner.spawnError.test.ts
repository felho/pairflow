import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { runPassValidationCommand } from "../../../src/core/runtime/passValidationRunner.js";

describe("runPassValidationCommand spawn error", () => {
  it("raises pass_validation_execution_error-compatible runner failure on spawn error", async () => {
    await expect(
      runPassValidationCommand(
        {
          kind: "test",
          command: "pnpm test",
          worktreePath: "/tmp/worktree"
        },
        {
          open: async () =>
            ({
              writeFile: async () => undefined,
              close: async () => undefined
            }) as never,
          spawn: () => {
            const child = new EventEmitter() as EventEmitter & {
              stdout: Readable;
              stderr: Readable;
              kill: () => boolean;
            };
            child.stdout = Readable.from([]);
            child.stderr = Readable.from([]);
            child.kill = () => true;
            queueMicrotask(() => {
              child.emit("error", new Error("spawn failed"));
            });
            return child as never;
          }
        }
      )
    ).rejects.toMatchObject({
      name: "PassValidationRunnerExecutionError",
      stage: "spawn",
      kind: "test",
      logPath: ".pairflow/evidence/pass-validation-test.log"
    });
  });

  it("does not hang when child error arrives before streams close", async () => {
    class BlockingReadable extends Readable {
      public override _read(): void {}
    }

    await expect(
      runPassValidationCommand(
        {
          kind: "test",
          command: "pnpm test",
          worktreePath: "/tmp/worktree"
        },
        {
          open: async () =>
            ({
              writeFile: async () => undefined,
              close: async () => undefined
            }) as never,
          spawn: () => {
            const child = new EventEmitter() as EventEmitter & {
              stdout: BlockingReadable;
              stderr: BlockingReadable;
              kill: () => boolean;
            };
            child.stdout = new BlockingReadable();
            child.stderr = new BlockingReadable();
            child.kill = () => true;
            queueMicrotask(() => {
              child.emit("error", new Error("spawn failed before close"));
            });
            return child as never;
          }
        }
      )
    ).rejects.toMatchObject({
      name: "PassValidationRunnerExecutionError",
      stage: "spawn",
      kind: "test",
      logPath: ".pairflow/evidence/pass-validation-test.log"
    });
  });
});
