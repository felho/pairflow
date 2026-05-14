import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resolveRemoteCloneExecutionContextFromEnv,
  type RemoteExecutionContextEnvFailure
} from "../../../../src/v11/application/remote/remoteExecutionContextEnv.js";

const modeEnvVar = "PAIRFLOW_TEST_REMOTE_MODE";
const workspaceRootEnvVar = "PAIRFLOW_TEST_REMOTE_WORKSPACE_ROOT";
const expectedMode = "inner_remote_execution";

class TestRemoteContextError extends Error {
  public readonly failure: RemoteExecutionContextEnvFailure;

  public constructor(failure: RemoteExecutionContextEnvFailure) {
    super(failure.kind);
    this.name = "TestRemoteContextError";
    this.failure = failure;
  }
}

function resolveTestContext(input: {
  workspaceWithoutExpectedMode: "missing_only" | "missing_or_mismatch";
  canonicalizeWorkspaceRoot?: (pathValue: string) => string;
}) {
  return resolveRemoteCloneExecutionContextFromEnv({
    modeEnvVar,
    workspaceRootEnvVar,
    expectedMode,
    workspaceWithoutExpectedMode: input.workspaceWithoutExpectedMode,
    ...(input.canonicalizeWorkspaceRoot !== undefined
      ? { canonicalizeWorkspaceRoot: input.canonicalizeWorkspaceRoot }
      : {}),
    toError: (failure) => new TestRemoteContextError(failure)
  });
}

function expectFailure(input: {
  workspaceWithoutExpectedMode: "missing_only" | "missing_or_mismatch";
  expectedFailure: RemoteExecutionContextEnvFailure;
}): void {
  try {
    resolveTestContext({
      workspaceWithoutExpectedMode: input.workspaceWithoutExpectedMode
    });
  } catch (error) {
    expect(error).toBeInstanceOf(TestRemoteContextError);
    expect((error as TestRemoteContextError).failure).toEqual(input.expectedFailure);
    return;
  }
  throw new Error("Expected remote context resolution to throw.");
}

describe("resolveRemoteCloneExecutionContextFromEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when neither mode nor workspace env is present", () => {
    expect(
      resolveTestContext({ workspaceWithoutExpectedMode: "missing_or_mismatch" })
    ).toBeUndefined();
  });

  it("reports workspace_without_mode with guaranteed workspaceRoot", () => {
    vi.stubEnv(workspaceRootEnvVar, "relative/repo");

    expectFailure({
      workspaceWithoutExpectedMode: "missing_or_mismatch",
      expectedFailure: {
        kind: "workspace_without_mode",
        workspaceRoot: "relative/repo"
      }
    });
  });

  it("reports unsupported_mode with guaranteed modeValue and optional workspaceRoot", () => {
    vi.stubEnv(modeEnvVar, "unsupported");
    vi.stubEnv(workspaceRootEnvVar, "/repo");

    expectFailure({
      workspaceWithoutExpectedMode: "missing_only",
      expectedFailure: {
        kind: "unsupported_mode",
        modeValue: "unsupported",
        workspaceRoot: "/repo"
      }
    });
  });

  it("lets missing_or_mismatch classify mismatched mode with workspace as workspace_without_mode", () => {
    vi.stubEnv(modeEnvVar, "unsupported");
    vi.stubEnv(workspaceRootEnvVar, "/repo");

    expectFailure({
      workspaceWithoutExpectedMode: "missing_or_mismatch",
      expectedFailure: {
        kind: "workspace_without_mode",
        modeValue: "unsupported",
        workspaceRoot: "/repo"
      }
    });
  });

  it("reports workspace_required with guaranteed matching modeValue", () => {
    vi.stubEnv(modeEnvVar, expectedMode);

    expectFailure({
      workspaceWithoutExpectedMode: "missing_or_mismatch",
      expectedFailure: {
        kind: "workspace_required",
        modeValue: expectedMode
      }
    });
  });

  it("uses the default remote canonicalizer when no override is provided", () => {
    vi.stubEnv(modeEnvVar, expectedMode);
    vi.stubEnv(workspaceRootEnvVar, "relative/repo");

    const context = resolveTestContext({
      workspaceWithoutExpectedMode: "missing_or_mismatch"
    });

    expect(context?.kind).toBe("remote_clone");
    expect(context?.workspaceRoot.endsWith("relative/repo")).toBe(true);
  });

  it("uses caller-provided workspace canonicalization", () => {
    vi.stubEnv(modeEnvVar, expectedMode);
    vi.stubEnv(workspaceRootEnvVar, "relative/repo");

    expect(
      resolveTestContext({
        workspaceWithoutExpectedMode: "missing_or_mismatch",
        canonicalizeWorkspaceRoot: (pathValue) => pathValue
      })
    ).toEqual({
      kind: "remote_clone",
      workspaceRoot: "relative/repo"
    });
  });
});
