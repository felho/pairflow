import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitConvergedFromWorkspace,
  type EmitConvergedInput,
  type EmitConvergedResult
} from "../../../src/core/agent/converged.js";
import { emitConvergedFromWorkspaceV11 } from "../../../src/v11/application/converged/emitConvergedV11.js";
import { seedConvergedCandidate } from "../../v11/application/converged/convergedSeedFixture.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface ConvergedContractOutput {
  status: "ok";
  reasonCode: "CONVERGED_EMITTED";
  convergenceSequence: number;
  convergenceEnvelopeType: string;
  convergenceEnvelopeRecipient: string;
  approvalRequestSequence: number;
  approvalRequestEnvelopeType: string;
  approvalRequestRecipient: string;
  approvalRequestSender: string;
  gateRoute: string;
  stateSubset: {
    state: string;
  };
}

export interface ConvergedContractRunResult {
  mode: ContractCase["mode"];
  legacy?: ConvergedContractOutput;
  v11?: ConvergedContractOutput;
}

interface ParsedConvergedCaseInput {
  convergedInput: Omit<EmitConvergedInput, "cwd">;
  reviewArtifactType?: "code" | "document";
}

function parseConvergedCaseInput(input: ContractCase["input"]): ParsedConvergedCaseInput {
  const summaryRaw = input.summary;
  if (typeof summaryRaw !== "string" || summaryRaw.trim().length === 0) {
    throw new Error("converged contract input.summary must be a non-empty string.");
  }

  const refsRaw = input.refs;
  let refs: string[] | undefined;
  if (refsRaw !== undefined) {
    if (
      !Array.isArray(refsRaw) ||
      !refsRaw.every((value) => typeof value === "string")
    ) {
      throw new Error("converged contract input.refs must be a string array.");
    }
    refs = refsRaw;
  }

  const reviewArtifactTypeRaw = input.reviewArtifactType;
  let reviewArtifactType: "code" | "document" | undefined;
  if (reviewArtifactTypeRaw !== undefined) {
    if (reviewArtifactTypeRaw !== "code" && reviewArtifactTypeRaw !== "document") {
      throw new Error(
        "converged contract input.reviewArtifactType must be one of: code, document."
      );
    }
    reviewArtifactType = reviewArtifactTypeRaw;
  }

  return {
    convergedInput: {
      summary: summaryRaw.trim(),
      ...(refs !== undefined ? { refs } : {})
    },
    ...(reviewArtifactType !== undefined ? { reviewArtifactType } : {})
  };
}

function normalizeConvergedResult(
  result: EmitConvergedResult
): ConvergedContractOutput {
  return {
    status: "ok",
    reasonCode: "CONVERGED_EMITTED",
    convergenceSequence: result.convergenceSequence,
    convergenceEnvelopeType: result.convergenceEnvelope.type,
    convergenceEnvelopeRecipient: result.convergenceEnvelope.recipient,
    approvalRequestSequence: result.approvalRequestSequence,
    approvalRequestEnvelopeType: result.approvalRequestEnvelope.type,
    approvalRequestRecipient: result.approvalRequestEnvelope.recipient,
    approvalRequestSender: result.approvalRequestEnvelope.sender,
    gateRoute: result.gateRoute,
    stateSubset: {
      state: result.state.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: ConvergedContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
    );
  }
  if (input.output.convergenceSequence >= input.output.approvalRequestSequence) {
    throw new Error(
      `${input.label}: sequence invariant failed (convergenceSequence=${input.output.convergenceSequence}, approvalRequestSequence=${input.output.approvalRequestSequence})`
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
    input.expected.gateRoute !== undefined &&
    input.output.gateRoute !== input.expected.gateRoute
  ) {
    throw new Error(
      `${input.label}: gateRoute mismatch (expected=${input.expected.gateRoute}, actual=${input.output.gateRoute})`
    );
  }
  if (
    input.expected.envelopeType !== undefined &&
    input.output.convergenceEnvelopeType !== input.expected.envelopeType
  ) {
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${input.output.convergenceEnvelopeType})`
    );
  }
  if (
    input.expected.convergenceRecipient !== undefined &&
    input.output.convergenceEnvelopeRecipient !== input.expected.convergenceRecipient
  ) {
    throw new Error(
      `${input.label}: convergenceRecipient mismatch (expected=${input.expected.convergenceRecipient}, actual=${input.output.convergenceEnvelopeRecipient})`
    );
  }
  if (
    input.expected.approvalRequestEnvelopeType !== undefined &&
    input.output.approvalRequestEnvelopeType !== input.expected.approvalRequestEnvelopeType
  ) {
    throw new Error(
      `${input.label}: approvalRequestEnvelopeType mismatch (expected=${input.expected.approvalRequestEnvelopeType}, actual=${input.output.approvalRequestEnvelopeType})`
    );
  }
  if (
    input.expected.approvalRequestRecipient !== undefined &&
    input.output.approvalRequestRecipient !== input.expected.approvalRequestRecipient
  ) {
    throw new Error(
      `${input.label}: approvalRequestRecipient mismatch (expected=${input.expected.approvalRequestRecipient}, actual=${input.output.approvalRequestRecipient})`
    );
  }
  if (
    input.expected.approvalRequestSender !== undefined &&
    input.output.approvalRequestSender !== input.expected.approvalRequestSender
  ) {
    throw new Error(
      `${input.label}: approvalRequestSender mismatch (expected=${input.expected.approvalRequestSender}, actual=${input.output.approvalRequestSender})`
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
  legacy: ConvergedContractOutput;
  v11: ConvergedContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `converged parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executeConvergedCase(input: {
  caseDef: ContractCase;
  executor: (convergedInput: EmitConvergedInput) => Promise<EmitConvergedResult>;
}): Promise<ConvergedContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-converged-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseConvergedCaseInput(input.caseDef.input);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description,
      ...(parsedInput.reviewArtifactType !== undefined
        ? { reviewArtifactType: parsedInput.reviewArtifactType }
        : {})
    });
    await seedConvergedCandidate(bubble.paths.worktreePath);

    const result = await input.executor({
      ...parsedInput.convergedInput,
      cwd: bubble.paths.worktreePath,
      now: new Date("2026-02-22T09:05:00.000Z")
    });
    return normalizeConvergedResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runConvergedContractCase(
  caseDef: ContractCase
): Promise<ConvergedContractRunResult> {
  if (caseDef.command !== "converged") {
    throw new Error(
      `Unsupported command for converged contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeConvergedCase({
      caseDef,
      executor: emitConvergedFromWorkspace
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
    const v11 = await executeConvergedCase({
      caseDef,
      executor: emitConvergedFromWorkspaceV11
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

  const legacy = await executeConvergedCase({
    caseDef,
    executor: emitConvergedFromWorkspace
  });
  const v11 = await executeConvergedCase({
    caseDef,
    executor: emitConvergedFromWorkspaceV11
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
