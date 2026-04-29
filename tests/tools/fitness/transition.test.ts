import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildTransitionCheckReport } from "../../../tools/fitness/checks/transition.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-transition-"));
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

describe("transition fitness check", () => {
  it("fails when lifecycle transition persist uses marker-like variable naming only", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/rename-only.ts",
      [
        "export async function run(state: { state: string }): Promise<void> {",
        "  const validatedNextState = { ...state, state: 'RUNNING' };",
        "  await writeStateSnapshot('state.json', validatedNextState);",
        "}"
      ].join("\n")
    );

    const report = await buildTransitionCheckReport({
      check: {
        id: "transition",
        metric: "state transition validation before persist",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
  });

  it("fails when persist happens without transition marker", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/persist.ts",
      [
        "export async function run(): Promise<void> {",
        "  const nextState = { state: 'RUNNING' };",
        "  await writeStateSnapshot('state.json', nextState);",
        "}"
      ].join("\n")
    );

    const report = await buildTransitionCheckReport({
      check: {
        id: "transition",
        metric: "state transition validation before persist",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("fail");
    expect(
      report.details?.some((detail) =>
        detail.includes("persist without transition validation")
      )
    ).toBe(true);
  });

  it("passes metadata-only persist without transition marker", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/metadata-only.ts",
      [
        "export async function run(state: { state: string }, nowIso: string): Promise<void> {",
        "  const persisted = {",
        "    ...state,",
        "    last_command_at: nowIso",
        "  };",
        "  await writeStateSnapshot('state.json', persisted);",
        "}"
      ].join("\n")
    );

    const report = await buildTransitionCheckReport({
      check: {
        id: "transition",
        metric: "state transition validation before persist",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("passes transition persist when applyStateTransition marker is present", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/validated-transition.ts",
      [
        "export async function run(state: { state: string }): Promise<void> {",
        "  const nextState = applyStateTransition(state, {",
        "    from: 'RUNNING',",
        "    to: 'WAITING_HUMAN'",
        "  });",
        "  await writeStateSnapshot('state.json', nextState);",
        "}"
      ].join("\n")
    );

    const report = await buildTransitionCheckReport({
      check: {
        id: "transition",
        metric: "state transition validation before persist",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("pass");
  });

  it("warns on manual next-state candidates without hard fail", async () => {
    const repoRoot = await createTempRoot();
    await writeRepoFile(
      repoRoot,
      "src/v11/application/manual-next-state.ts",
      [
        "export function run(state: { round: number }): Record<string, unknown> {",
        "  const nextState = {",
        "    ...state,",
        "    round: state.round + 1,",
        "    active_role: 'reviewer'",
        "  };",
        "  return nextState;",
        "}"
      ].join("\n")
    );

    const report = await buildTransitionCheckReport({
      check: {
        id: "transition",
        metric: "state transition validation before persist",
        mode: "report-only",
        owner: "architecture/runtime",
        scope: ["src/v11/application/**"],
        exceptions: []
      },
      repoRoot,
      fallbackMode: "report-only"
    });

    expect(report.status).toBe("warn");
    expect(
      report.details?.some((detail) => detail.includes("manual next-state candidate"))
    ).toBe(true);
  });
});
