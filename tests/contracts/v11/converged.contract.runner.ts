import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitConvergedFromWorkspace,
  type EmitConvergedInput,
  type EmitConvergedResult
} from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { emitConvergedFromWorkspaceV11 } from "../../../src/v11/application/converged/emitConvergedV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface ConvergedContractOutput {
  status: "ok";
  reasonCode: "CONVERGED_EMITTED";
  convergenceEnvelopeType: string;
  approvalRequestEnvelopeType: string;
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
    convergenceEnvelopeType: result.convergenceEnvelope.type,
    approvalRequestEnvelopeType: result.approvalRequestEnvelope.type,
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
    input.output.convergenceEnvelopeType !== input.expected.envelopeType
  ) {
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${input.output.convergenceEnvelopeType})`
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

async function seedConvergedCandidate(cwd: string): Promise<void> {
  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd,
    now: new Date("2026-02-22T09:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd,
    now: new Date("2026-02-22T09:02:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd,
    now: new Date("2026-02-22T09:03:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 2 findings",
    findings: [
      {
        severity: "P2",
        title: "Round-2 non-blocking follow-up"
      }
    ],
    cwd,
    now: new Date("2026-02-22T09:03:10.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 3",
    cwd,
    now: new Date("2026-02-22T09:03:20.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 3 clean",
    noFindings: true,
    cwd,
    now: new Date("2026-02-22T09:03:30.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 4",
    cwd,
    now: new Date("2026-02-22T09:03:40.000Z")
  });
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
