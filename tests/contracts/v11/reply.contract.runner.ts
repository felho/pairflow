import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitHumanReply,
  type EmitHumanReplyInput,
  type EmitHumanReplyResult
} from "../../../src/core/human/reply.js";
import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import { emitHumanReplyV11 } from "../../../src/v11/application/reply/emitReplyV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface ReplyContractOutput {
  status: "ok";
  reasonCode: "HUMAN_REPLY_EMITTED";
  envelopeType: string;
  stateSubset: {
    state: string;
  };
}

export interface ReplyContractRunResult {
  mode: ContractCase["mode"];
  legacy?: ReplyContractOutput;
  v11?: ReplyContractOutput;
}

function parseReplyCaseInput(
  input: ContractCase["input"]
): Omit<EmitHumanReplyInput, "bubbleId" | "cwd"> {
  const messageRaw = input.message;
  if (typeof messageRaw !== "string" || messageRaw.trim().length === 0) {
    throw new Error("reply contract input.message must be a non-empty string.");
  }

  const refsRaw = input.refs;
  if (
    refsRaw !== undefined &&
    (
      !Array.isArray(refsRaw) ||
      !refsRaw.every((value) => typeof value === "string")
    )
  ) {
    throw new Error("reply contract input.refs must be a string array.");
  }

  return {
    message: messageRaw.trim(),
    refs: refsRaw ?? []
  };
}

function normalizeReplyResult(
  result: EmitHumanReplyResult
): ReplyContractOutput {
  return {
    status: "ok",
    reasonCode: "HUMAN_REPLY_EMITTED",
    envelopeType: result.envelope.type,
    stateSubset: {
      state: result.state.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: ReplyContractOutput;
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
  if (
    input.expected.envelopeType !== undefined &&
    input.output.envelopeType !== input.expected.envelopeType
  ) {
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${input.output.envelopeType})`
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

function assertParityEquivalent(input: {
  legacy: ReplyContractOutput;
  v11: ReplyContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `reply parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executeReplyCase(input: {
  caseDef: ContractCase;
  executor: (replyInput: EmitHumanReplyInput) => Promise<EmitHumanReplyResult>;
}): Promise<ReplyContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-reply-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });

    await emitAskHumanFromWorkspace({
      question: "Seed WAITING_HUMAN state for reply contract run.",
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-03-19T10:01:00.000Z")
    });

    const replyInput = parseReplyCaseInput(input.caseDef.input);
    const result = await input.executor({
      ...replyInput,
      bubbleId: bubble.bubbleId,
      repoPath,
      now: new Date("2026-03-19T10:02:00.000Z")
    });
    return normalizeReplyResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runReplyContractCase(
  caseDef: ContractCase
): Promise<ReplyContractRunResult> {
  if (caseDef.command !== "reply") {
    throw new Error(`Unsupported command for reply contract runner: ${caseDef.command}`);
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeReplyCase({
      caseDef,
      executor: emitHumanReply
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
    const v11 = await executeReplyCase({
      caseDef,
      executor: emitHumanReplyV11
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

  const legacy = await executeReplyCase({
    caseDef,
    executor: emitHumanReply
  });
  const v11 = await executeReplyCase({
    caseDef,
    executor: emitHumanReplyV11
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
