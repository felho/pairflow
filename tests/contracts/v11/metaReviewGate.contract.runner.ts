import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { recoverMetaReviewGateFromSnapshot } from "../../../src/core/bubble/metaReviewGate.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { recoverMetaReviewGateFromSnapshotV11 } from "../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { MetaReviewRunResult } from "../../../src/core/bubble/metaReview.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface MetaReviewGateContractOutput {
  status: "ok";
  gateRoute: string;
  envelopeType: string;
  stateSubset: {
    state: string;
  };
}

export interface MetaReviewGateContractRunResult {
  mode: ContractCase["mode"];
  legacy?: MetaReviewGateContractOutput;
  v11?: MetaReviewGateContractOutput;
}

function parseMetaReviewGateCaseInput(input: ContractCase["input"]): {
  refs: string[];
} {
  const routeRaw = input.route;
  if (routeRaw !== "recover") {
    throw new Error(
      "metaReviewGate contract input.route must be \"recover\"."
    );
  }

  const refsRaw = input.refs;
  if (
    refsRaw !== undefined &&
    (!Array.isArray(refsRaw) || !refsRaw.every((value) => typeof value === "string"))
  ) {
    throw new Error("metaReviewGate contract input.refs must be a string array.");
  }

  return {
    refs: refsRaw ?? []
  };
}

function buildSyntheticMetaReviewRunError(input: {
  bubbleId: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "error",
    recommendation: "inconclusive",
    summary: "Seed meta-review recover contract failure snapshot.",
    report_ref: "artifacts/meta-review-last.md",
    rework_target_message: null,
    updated_at: "2026-03-19T10:03:00.000Z",
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: [
      {
        reason_code: "META_REVIEW_RUNNER_ERROR",
        message: "Seeded failure for recover contract parity check."
      }
    ],
    report_json: {
      findings_count: 0
    }
  };
}

function normalizeMetaReviewGateResult(
  result: Awaited<ReturnType<typeof recoverMetaReviewGateFromSnapshot>>
): MetaReviewGateContractOutput {
  return {
    status: "ok",
    gateRoute: result.route,
    envelopeType: result.gateEnvelope.type,
    stateSubset: {
      state: result.state.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: MetaReviewGateContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
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
  legacy: MetaReviewGateContractOutput;
  v11: MetaReviewGateContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `metaReviewGate parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executeMetaReviewGateCase(input: {
  caseDef: ContractCase;
  executor: typeof recoverMetaReviewGateFromSnapshot;
}): Promise<MetaReviewGateContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-meta-review-gate-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "META_REVIEW_RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-19T10:03:30.000Z",
        last_command_at: "2026-03-19T10:03:30.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    const caseInput = parseMetaReviewGateCaseInput(input.caseDef.input);
    const result = await input.executor({
      bubbleId: bubble.bubbleId,
      repoPath,
      refs: caseInput.refs,
      now: new Date("2026-03-19T10:04:00.000Z"),
      runResult: buildSyntheticMetaReviewRunError({
        bubbleId: bubble.bubbleId
      })
    });

    return normalizeMetaReviewGateResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runMetaReviewGateContractCase(
  caseDef: ContractCase
): Promise<MetaReviewGateContractRunResult> {
  if (caseDef.command !== "metaReviewGate" && caseDef.command !== "gate") {
    throw new Error(
      `Unsupported command for metaReviewGate contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeMetaReviewGateCase({
      caseDef,
      executor: recoverMetaReviewGateFromSnapshot
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
    const v11 = await executeMetaReviewGateCase({
      caseDef,
      executor: recoverMetaReviewGateFromSnapshotV11
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

  const legacy = await executeMetaReviewGateCase({
    caseDef,
    executor: recoverMetaReviewGateFromSnapshot
  });
  const v11 = await executeMetaReviewGateCase({
    caseDef,
    executor: recoverMetaReviewGateFromSnapshotV11
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
