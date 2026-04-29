import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildErrorCheckReport } from "../../../tools/fitness/checks/error.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-error-"));
  tempDirs.push(root);
  return root;
}

async function writeRepoFile(
  repoRoot: string,
  relativePath: string,
  content: string
): Promise<void> {
  const absolutePath = join(repoRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("error fitness check", () => {
  it("fails when throw boundary has no stable code marker", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-without-code.ts",
      [
        "export function run(): never {",
        "  const context = { bubble_id: 'b_1', command_name: 'pass', round: 1 };",
        "  throw new Error('something failed');",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("missing stable error code"))
    ).toBe(true);
  });

  it("fails when throw boundary has code marker but no context marker", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-without-context.ts",
      [
        "export function run(): never {",
        "  const reason_code = 'ERR_SAMPLE';",
        "  throw new Error(reason_code);",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) => detail.includes("missing required error context"))
    ).toBe(true);
  });

  it("passes when throw boundary has both code and context markers", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-with-code-and-context.ts",
      [
        "export function run(): never {",
        "  const reason_code = 'ERR_SAMPLE';",
        "  const context = { bubble_id: 'b_1', command_name: 'pass', operation_id: 'op_1', round: 1 };",
        "  throw new Error(`${reason_code}: ${JSON.stringify(context)}`);",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("passes when throw uses identifier with code/context declared outside line window", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-identifier-resolution.ts",
      [
        "const reasonCode = 'ERR_SAMPLE';",
        "const context = { bubble_id: 'b_1', command_name: 'pass', round: 1 };",
        "const failureMessage = `${reasonCode}: ${JSON.stringify(context)}`;",
        "",
        "function filler01() { return 1; }",
        "function filler02() { return 2; }",
        "function filler03() { return 3; }",
        "function filler04() { return 4; }",
        "function filler05() { return 5; }",
        "function filler06() { return 6; }",
        "function filler07() { return 7; }",
        "",
        "export function run(): never {",
        "  throw new Error(failureMessage);",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("warns for structured error wrapper throws without nearby explicit markers", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-structured-wrapper.ts",
      [
        "export function run(error: unknown): never {",
        "  throw normalizeBubbleMergeError({",
        "    error",
        "  });",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some(
        (detail) =>
          detail.includes("[warn]") &&
          detail.includes("missing required error context")
      )
    ).toBe(true);
  });

  it("passes when structured error throw provides diagnostics context object", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-structured-diagnostics.ts",
      [
        "class SampleError extends Error {",
        "  public constructor(reasonCode: string, message: string, diagnostics?: Record<string, unknown>) {",
        "    super(message);",
        "    this.name = 'SampleError';",
        "    void reasonCode;",
        "    void diagnostics;",
        "  }",
        "}",
        "export function run(): never {",
        "  throw new SampleError(",
        "    'ERR_SAMPLE',",
        "    'failed',",
        "    { rollbackReasonCode: 'ROLLBACK_APPLIED' }",
        "  );",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("passes when normalization wrapper delegates through error+is/create contract", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-normalization-delegation.ts",
      [
        "class SampleError extends Error {}",
        "function normalizeSampleError(input: {",
        "  error: unknown;",
        "  isSampleError: (candidate: unknown) => boolean;",
        "  createSampleError: (message: string) => Error;",
        "}): unknown {",
        "  if (input.isSampleError(input.error)) return input.error;",
        "  if (input.error instanceof Error) return input.createSampleError(input.error.message);",
        "  return input.error;",
        "}",
        "export function run(error: unknown): never {",
        "  throw normalizeSampleError({",
        "    error,",
        "    isSampleError: (candidate) => candidate instanceof SampleError,",
        "    createSampleError: (message) => new SampleError(message)",
        "  });",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("passes when throw delegates through to*Error conversion helper", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/error-to-helper.ts",
      [
        "class SampleError extends Error {",
        "  public constructor(reasonCode: string, message: string) {",
        "    super(message);",
        "    this.name = 'SampleError';",
        "    void reasonCode;",
        "  }",
        "}",
        "function toSampleError(error: unknown): SampleError {",
        "  const reason = error instanceof Error ? error.message : String(error);",
        "  return new SampleError('ERR_SAMPLE', reason);",
        "}",
        "export function run(error: unknown): never {",
        "  throw toSampleError(error);",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("warns when throw delegates through errorFactory callback", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/error-factory-wrapper.ts",
      [
        "export function requireValue(",
        "  value: string,",
        "  errorFactory: (message: string) => Error",
        "): string {",
        "  if (value.trim().length === 0) {",
        "    throw errorFactory('value cannot be empty');",
        "  }",
        "  return value.trim();",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/shared/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some(
        (detail) =>
          detail.includes("[warn]") &&
          (
            detail.includes("missing stable error code") ||
            detail.includes("missing required error context")
          )
      )
    ).toBe(true);
  });

  it("passes when throw delegates through PairflowCreateCommandError callback", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/types/commandErrorTypes.d.ts",
      [
        "type PairflowCommandErrorContext = Record<string, unknown>;",
        "interface PairflowCommandErrorDetails {",
        "  message: string;",
        "  reasonCode?: string;",
        "  context?: PairflowCommandErrorContext;",
        "  cause?: unknown;",
        "}",
        "type PairflowCommandErrorInput = string | PairflowCommandErrorDetails;",
        "type PairflowCreateCommandError = (input: PairflowCommandErrorInput) => Error;"
      ].join("\n")
    );
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/error-factory-structured.ts",
      [
        "export function requireValue(",
        "  value: string,",
        "  errorFactory: PairflowCreateCommandError",
        "): string {",
        "  if (value.trim().length === 0) {",
        "    throw errorFactory('value cannot be empty');",
        "  }",
        "  return value.trim();",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/shared/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("warns when throw delegates through *To*Error conversion helper", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/shared/error-middle-to-helper.ts",
      [
        "class SampleError extends Error {",
        "  public constructor(reasonCode: string, message: string) {",
        "    super(message);",
        "    this.name = 'SampleError';",
        "    void reasonCode;",
        "  }",
        "}",
        "function stateWriteConflictToSampleError(error: unknown): SampleError {",
        "  const reason = error instanceof Error ? error.message : String(error);",
        "  return new SampleError('ERR_SAMPLE', reason);",
        "}",
        "export function run(error: unknown): never {",
        "  throw stateWriteConflictToSampleError(error);",
        "}"
      ].join("\n")
    );

    const report = await buildErrorCheckReport({
      check: {
        id: "error",
        metric: "error code and context completeness",
        mode: "report-only",
        owner: "architecture/observability",
        scope: ["src/v11/shared/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some(
        (detail) =>
          detail.includes("[warn]") &&
          detail.includes("missing required error context")
      )
    ).toBe(true);
  });
});
