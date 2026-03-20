import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { mergeBubble } from "../../../src/core/bubble/mergeBubble.js";
import { mergeBubbleV11 } from "../../../src/v11/application/merge/emitMergeV11.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../../src/core/workspace/worktreeManager.js";
import { initGitRepository, runGit } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface MergeContractOutput {
  status: "ok";
  reasonCode: "MERGED";
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

export interface MergeContractRunResult {
  mode: ContractCase["mode"];
  legacy?: MergeContractOutput;
  v11?: MergeContractOutput;
}

interface ParsedMergeCaseInput {
  tmuxSessionExisted: boolean;
}

function parseMergeCaseInput(input: ContractCase["input"]): ParsedMergeCaseInput {
  const tmuxSessionExistedRaw = input.tmuxSessionExisted;
  if (
    tmuxSessionExistedRaw !== undefined &&
    typeof tmuxSessionExistedRaw !== "boolean"
  ) {
    throw new Error("merge contract input.tmuxSessionExisted must be a boolean.");
  }
  return {
    tmuxSessionExisted: tmuxSessionExistedRaw ?? false
  };
}

function normalizeMergeResult(
  result: Awaited<ReturnType<typeof mergeBubble>>
): MergeContractOutput {
  return {
    status: "ok",
    reasonCode: "MERGED",
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
}

function assertParityEquivalent(input: {
  legacy: MergeContractOutput;
  v11: MergeContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `merge parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
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
    worktreePath: bubble.paths.worktreePath
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

async function executeMergeCase(input: {
  caseDef: ContractCase;
  executor: typeof mergeBubble;
}): Promise<MergeContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-merge-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupDoneBubble(repoPath, `b_contract_${input.caseDef.id}`);
    const parsedInput = parseMergeCaseInput(input.caseDef.input);

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

    return normalizeMergeResult(result);
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

  if (caseDef.mode === "legacy") {
    const legacy = await executeMergeCase({
      caseDef,
      executor: mergeBubble
    });
    assertContractExpectedSubset({
      output: legacy,
      expected: caseDef.expected,
      label: "legacy"
    });
    return {
      mode: caseDef.mode,
      legacy
    };
  }

  if (caseDef.mode === "v11") {
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

  const legacy = await executeMergeCase({
    caseDef,
    executor: mergeBubble
  });
  const v11 = await executeMergeCase({
    caseDef,
    executor: mergeBubbleV11
  });
  assertContractExpectedSubset({
    output: legacy,
    expected: caseDef.expected,
    label: "parity/legacy"
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "parity/v11"
  });
  assertParityEquivalent({
    legacy,
    v11,
    caseId: caseDef.id
  });
  return {
    mode: caseDef.mode,
    legacy,
    v11
  };
}
