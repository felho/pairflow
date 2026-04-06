import { describe, expect, it } from "vitest";

import {
  PassValidationRunnerExecutionError,
  runPassValidationCommand
} from "../../../src/core/runtime/passValidationRunner.js";
import * as canonicalRunner from "../../../src/v11/infrastructure/executor/validation/passValidationCommandRunner.js";

describe("core passValidationRunner bridge", () => {
  it("re-exports the v11 executor validation runner", () => {
    expect(runPassValidationCommand).toBe(canonicalRunner.runPassValidationCommand);
    expect(PassValidationRunnerExecutionError).toBe(
      canonicalRunner.PassValidationRunnerExecutionError
    );
  });
});
