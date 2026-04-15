import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createBubble } from "../../../src/v11/application/create/createBubble.js";
import { upsertRuntimeSession } from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/v11/infrastructure/workspace/worktreeManager.js";
import {
  mergeBubbleV11,
  type MergeBubbleV11Input as MergeBubbleInput,
  type MergeBubbleV11Dependencies as MergeBubbleDependencies,
  type MergeBubbleV11Result as MergeBubbleResult
} from "../../../src/v11/application/merge/emitMergeV11.js";
import { initGitRepository, runGit } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface MergeContractSuccessOutput {
  status: "ok";
  reasonCode: "MERGED";
  stateSubset: {
    state: string;
  };
  baseBranch: string;
  bubbleBranchPrefix: boolean;
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
  hasMergeCommitSha: boolean;
}

export interface MergeContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type MergeContractOutput =
  | MergeContractSuccessOutput
  | MergeContractErrorOutput;

export interface MergeContractRunResult {
  mode: ContractCase["mode"];
  v11?: MergeContractOutput;
}

type MergeContractScenario = "basic" | "state_not_done";
type MergeContractExtendedScenario =
  | MergeContractScenario
  | "repo_dirty"
  | "bubble_branch_missing"
  | "merge_conflict"
  | "cleanup_invariant";

interface ParsedMergeCaseInput {
  tmuxSessionExisted: boolean;
  scenario: MergeContractExtendedScenario;
}

function buildMergeContractBubbleId(caseId: string): string {
  const suffix = createHash("sha1").update(caseId).digest("hex").slice(0, 12);
  return `b_contract_${suffix}`;
}

function parseMergeCaseInput(input: ContractCase["input"]): ParsedMergeCaseInput {
  const tmuxSessionExistedRaw = input.tmuxSessionExisted;
  if (
    tmuxSessionExistedRaw !== undefined &&
    typeof tmuxSessionExistedRaw !== "boolean"
  ) {
    throw new Error("merge contract input.tmuxSessionExisted must be a boolean.");
  }

  const fixtureRaw = input.fixture;
  let scenario: MergeContractExtendedScenario = "basic";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("merge contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "basic" &&
      scenarioRaw !== "state_not_done" &&
      scenarioRaw !== "repo_dirty" &&
      scenarioRaw !== "bubble_branch_missing" &&
      scenarioRaw !== "merge_conflict" &&
      scenarioRaw !== "cleanup_invariant"
    ) {
      throw new Error(
        "merge contract input.fixture.scenario must be one of: basic, state_not_done, repo_dirty, bubble_branch_missing, merge_conflict, cleanup_invariant."
      );
    }
    scenario = scenarioRaw ?? "basic";
  }

  return {
    tmuxSessionExisted: tmuxSessionExistedRaw ?? false,
    scenario
  };
}

function normalizeMergeResult(
  result: MergeBubbleResult,
  state: string
): MergeContractSuccessOutput {
  return {
    status: "ok",
    reasonCode: "MERGED",
    stateSubset: {
      state
    },
    baseBranch: result.baseBranch,
    bubbleBranchPrefix: result.bubbleBranch.startsWith("bubble/"),
    pushedBaseBranch: result.pushedBaseBranch,
    deletedRemoteBranch: result.deletedRemoteBranch,
    tmuxSessionExisted: result.tmuxSessionExisted,
    runtimeSessionRemoved: result.runtimeSessionRemoved,
    removedWorktree: result.removedWorktree,
    removedBubbleBranch: result.removedBubbleBranch,
    hasMergeCommitSha: result.mergeCommitSha.length > 6
  };
}

function normalizeMergeErrorResult(input: {
  error: unknown;
  state: string;
}): MergeContractErrorOutput {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const reasonMatch = /^([A-Z0-9_]+):/u.exec(message.trim());
  return {
    status: "error",
    reasonCode: reasonMatch?.[1] ?? null,
    stateSubset: {
      state: input.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: MergeContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
    );
  }
  if (
    input.expected.reasonCode !== undefined &&
    input.output.reasonCode !== input.expected.reasonCode
  ) {
    throw new Error(
      `${input.label}: reasonCode mismatch (expected=${input.expected.reasonCode}, actual=${input.output.reasonCode})`
    );
  }
  const expectedState = input.expected.stateSubset?.state;
  if (
    typeof expectedState === "string" &&
    input.output.stateSubset.state !== expectedState
  ) {
    throw new Error(
      `${input.label}: stateSubset.state mismatch (expected=${expectedState}, actual=${input.output.stateSubset.state})`
    );
  }
}

function assertMergeScenarioInvariant(input: {
  output: MergeContractOutput;
  scenario: MergeContractExtendedScenario;
  caseId: string;
}): void {
  if (input.scenario !== "cleanup_invariant") {
    return;
  }

  if (input.output.status !== "ok") {
    throw new Error(
      `merge contract case=${input.caseId}: cleanup_invariant requires success output (reason=${input.output.reasonCode ?? "unknown"}).`
    );
  }
  if (!input.output.tmuxSessionExisted) {
    throw new Error(
      `merge contract case=${input.caseId}: expected tmuxSessionExisted=true for cleanup_invariant.`
    );
  }
  if (!input.output.runtimeSessionRemoved) {
    throw new Error(
      `merge contract case=${input.caseId}: expected runtimeSessionRemoved=true for cleanup_invariant.`
    );
  }
  if (!input.output.removedWorktree || !input.output.removedBubbleBranch) {
    throw new Error(
      `merge contract case=${input.caseId}: expected worktree+bubble branch cleanup for cleanup_invariant.`
    );
  }
}

async function setupDoneBubble(repoPath: string, bubbleId: string) {
  const bubble = await createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    task: "Merge contract parity fixture",
    cwd: repoPath
  });

  await bootstrapWorktreeWorkspace({
    repoPath,
    baseBranch: "main",
    bubbleBranch: bubble.config.bubble_branch,
    worktreePath: bubble.paths.worktreePath,
    workspaceKind: "worktree"
  });

  await writeFile(
    join(bubble.paths.worktreePath, "feature.txt"),
    `${bubbleId}\n`,
    "utf8"
  );
  await runGit(bubble.paths.worktreePath, ["add", "feature.txt"]);
  await runGit(bubble.paths.worktreePath, ["commit", "-m", `feat(${bubbleId}): change`]);

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "DONE",
      active_agent: null,
      active_role: null,
      active_since: null,
      last_command_at: "2026-03-20T11:15:00.000Z"
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

async function setupCreatedBubble(repoPath: string, bubbleId: string) {
  return createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    task: "Merge contract state-not-done fixture",
    cwd: repoPath
  });
}

async function setupDoneBubbleWithoutBranch(repoPath: string, bubbleId: string) {
  const bubble = await createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    task: "Merge contract missing-branch fixture",
    cwd: repoPath
  });

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "DONE",
      active_agent: null,
      active_role: null,
      active_since: null,
      last_command_at: "2026-03-20T11:15:00.000Z"
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

async function setupDoneBubbleWithConflict(repoPath: string, bubbleId: string) {
  const bubble = await createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    task: "Merge contract conflict fixture",
    cwd: repoPath
  });

  await bootstrapWorktreeWorkspace({
    repoPath,
    baseBranch: "main",
    bubbleBranch: bubble.config.bubble_branch,
    worktreePath: bubble.paths.worktreePath,
    workspaceKind: "worktree"
  });

  await writeFile(join(bubble.paths.worktreePath, "conflict.txt"), "base-line\n", "utf8");
  await runGit(bubble.paths.worktreePath, ["add", "conflict.txt"]);
  await runGit(bubble.paths.worktreePath, ["commit", "-m", `chore(${bubbleId}): base`]);

  await runGit(repoPath, ["checkout", "main"]);
  await writeFile(join(repoPath, "conflict.txt"), "main-line\n", "utf8");
  await runGit(repoPath, ["add", "conflict.txt"]);
  await runGit(repoPath, ["commit", "-m", `chore(${bubbleId}): main conflict`]);

  await writeFile(join(bubble.paths.worktreePath, "conflict.txt"), "bubble-line\n", "utf8");
  await runGit(bubble.paths.worktreePath, ["add", "conflict.txt"]);
  await runGit(bubble.paths.worktreePath, ["commit", "-m", `chore(${bubbleId}): bubble conflict`]);

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "DONE",
      active_agent: null,
      active_role: null,
      active_since: null,
      last_command_at: "2026-03-20T11:15:00.000Z"
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

async function executeMergeCase(input: {
  caseDef: ContractCase;
  executor: (
    mergeInput: MergeBubbleInput,
    dependencies?: MergeBubbleDependencies
  ) => Promise<MergeBubbleResult>;
}): Promise<MergeContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-merge-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseMergeCaseInput(input.caseDef.input);
    const bubbleId = buildMergeContractBubbleId(input.caseDef.id);
    const bubble = parsedInput.scenario === "state_not_done"
      ? await setupCreatedBubble(repoPath, bubbleId)
      : parsedInput.scenario === "bubble_branch_missing"
        ? await setupDoneBubbleWithoutBranch(repoPath, bubbleId)
        : parsedInput.scenario === "merge_conflict"
          ? await setupDoneBubbleWithConflict(repoPath, bubbleId)
          : await setupDoneBubble(repoPath, bubbleId);

    if (parsedInput.scenario === "repo_dirty") {
      await writeFile(join(repoPath, "dirty.txt"), "dirty\n", "utf8");
    }

    if (parsedInput.scenario === "cleanup_invariant") {
      await upsertRuntimeSession({
        sessionsPath: bubble.paths.sessionsPath,
        bubbleId: bubble.bubbleId,
        repoPath,
        worktreePath: bubble.paths.worktreePath,
        tmuxSessionName: `pf-${bubble.bubbleId}`,
        now: new Date("2026-03-20T11:19:00.000Z")
      });
    }

    let output: MergeContractOutput;
    try {
      const result = await input.executor(
        {
          bubbleId: bubble.bubbleId,
          cwd: repoPath,
          now: new Date("2026-03-20T11:20:00.000Z")
        },
        {
          terminateBubbleTmuxSession: (terminateInput) =>
            Promise.resolve({
              sessionName: `pf-${terminateInput.bubbleId ?? "unknown"}`,
              existed: parsedInput.tmuxSessionExisted
            })
        }
      );

      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      output = normalizeMergeResult(result, stateSnapshot.state.state);
    } catch (error) {
      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      output = normalizeMergeErrorResult({
        error,
        state: stateSnapshot.state.state
      });
    }

    assertMergeScenarioInvariant({
      output,
      scenario: parsedInput.scenario,
      caseId: input.caseDef.id
    });
    return output;
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runMergeContractCase(
  caseDef: ContractCase
): Promise<MergeContractRunResult> {
  if (caseDef.command !== "merge") {
    throw new Error(`Unsupported command for merge contract runner: ${caseDef.command}`);
  }

  const v11 = await executeMergeCase({
    caseDef,
    executor: mergeBubbleV11
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "v11"
  });
  return {
    mode: caseDef.mode,
    v11
  };
}
