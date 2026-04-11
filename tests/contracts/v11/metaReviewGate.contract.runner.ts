import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyMetaReviewGateOnConvergenceV11,
  type MetaReviewGateResultV11
} from "../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../../src/types/bubble.js";
import type {
  RuntimeSessionRecord
} from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type { SetMetaReviewerPaneBindingResult } from "../../../src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

export interface MetaReviewGateContractOutput {
  status: "ok" | "error";
  reasonCode: string | null;
  gateRoute: string | null;
  envelopeType: string | null;
  envelopePayload: Record<string, unknown> | null;
  stateSubset: {
    state: string;
  } | null;
}

export interface MetaReviewGateContractRunResult {
  mode: ContractCase["mode"];
  v11?: MetaReviewGateContractOutput;
}

type MetaReviewGateApplyScenario =
  | "run_failed"
  | "meta_review_running"
  | "sticky_bypass";

interface NormalizedMetaReviewSnapshot {
  last_autonomous_run_id: string | null;
  last_autonomous_status: "success" | "error" | null;
  last_autonomous_recommendation: "approve" | "rework" | "inconclusive" | null;
  last_autonomous_summary: string | null;
  last_autonomous_report_ref: string | null;
  last_autonomous_rework_target_message: string | null;
  last_autonomous_updated_at: string | null;
  auto_rework_count: number;
  auto_rework_limit: number;
  sticky_human_gate: boolean;
}

function parseMetaReviewGateCaseInput(input: ContractCase["input"]): {
  route: "apply";
  applyScenario: MetaReviewGateApplyScenario;
  summary?: string;
  refs: string[];
} {
  const routeRaw = input.route;
  if (routeRaw !== "apply") {
    throw new Error(
      "metaReviewGate contract input.route must be `apply`; recover parity cases were removed with the public recover surface."
    );
  }

  const summaryRaw = input.summary;
  if (summaryRaw !== undefined && typeof summaryRaw !== "string") {
    throw new Error(
      "metaReviewGate contract input.summary must be a string when provided."
    );
  }

  const refsRaw = input.refs;
  if (
    refsRaw !== undefined &&
    (!Array.isArray(refsRaw) || !refsRaw.every((value) => typeof value === "string"))
  ) {
    throw new Error("metaReviewGate contract input.refs must be a string array.");
  }

  const applyScenarioRaw = input.applyScenario;
  if (
    applyScenarioRaw !== undefined &&
    applyScenarioRaw !== "run_failed" &&
    applyScenarioRaw !== "meta_review_running" &&
    applyScenarioRaw !== "sticky_bypass"
  ) {
    throw new Error(
      "metaReviewGate contract input.applyScenario must be one of: run_failed, meta_review_running, sticky_bypass."
    );
  }

  return {
    route: "apply",
    applyScenario: applyScenarioRaw ?? "run_failed",
    ...(typeof summaryRaw === "string" ? { summary: summaryRaw } : {}),
    refs: refsRaw ?? []
  };
}

function normalizeMetaReviewSnapshotForContract(
  snapshot: unknown
): NormalizedMetaReviewSnapshot {
  const metaReview = snapshot as Record<string, unknown> | undefined;
  return {
    last_autonomous_run_id:
      typeof metaReview?.last_autonomous_run_id === "string"
        ? metaReview.last_autonomous_run_id
        : null,
    last_autonomous_status:
      metaReview?.last_autonomous_status === "success" ||
      metaReview?.last_autonomous_status === "error"
        ? metaReview.last_autonomous_status
        : null,
    last_autonomous_recommendation:
      metaReview?.last_autonomous_recommendation === "approve" ||
      metaReview?.last_autonomous_recommendation === "rework" ||
      metaReview?.last_autonomous_recommendation === "inconclusive"
        ? metaReview.last_autonomous_recommendation
        : null,
    last_autonomous_summary:
      typeof metaReview?.last_autonomous_summary === "string"
        ? metaReview.last_autonomous_summary
        : null,
    last_autonomous_report_ref:
      typeof metaReview?.last_autonomous_report_ref === "string"
        ? metaReview.last_autonomous_report_ref
        : null,
    last_autonomous_rework_target_message:
      typeof metaReview?.last_autonomous_rework_target_message === "string"
        ? metaReview.last_autonomous_rework_target_message
        : null,
    last_autonomous_updated_at:
      typeof metaReview?.last_autonomous_updated_at === "string"
        ? metaReview.last_autonomous_updated_at
        : null,
    auto_rework_count:
      typeof metaReview?.auto_rework_count === "number" &&
      Number.isInteger(metaReview.auto_rework_count) &&
      metaReview.auto_rework_count >= 0
        ? metaReview.auto_rework_count
        : 0,
    auto_rework_limit:
      typeof metaReview?.auto_rework_limit === "number" &&
      Number.isInteger(metaReview.auto_rework_limit) &&
      metaReview.auto_rework_limit >= 0
        ? metaReview.auto_rework_limit
        : DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
    sticky_human_gate: metaReview?.sticky_human_gate === true
  };
}

function normalizeMetaReviewGateResult(
  result: MetaReviewGateResultV11
): MetaReviewGateContractOutput {
  const envelopePayload =
    typeof result.gateEnvelope.payload === "object" &&
    result.gateEnvelope.payload !== null
      ? result.gateEnvelope.payload as Record<string, unknown>
      : {};
  return {
    status: "ok",
    reasonCode: null,
    gateRoute: result.route,
    envelopeType: result.gateEnvelope.type,
    envelopePayload,
    stateSubset: {
      state: result.state.state
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertSubsetValue(input: {
  actual: unknown;
  expected: unknown;
  label: string;
  path: string;
}): void {
  if (Array.isArray(input.expected)) {
    if (!Array.isArray(input.actual)) {
      throw new Error(`${input.label}: expected array at ${input.path}`);
    }
    if (input.actual.length !== input.expected.length) {
      throw new Error(
        `${input.label}: array length mismatch at ${input.path} (expected=${input.expected.length}, actual=${input.actual.length})`
      );
    }
    for (let index = 0; index < input.expected.length; index += 1) {
      assertSubsetValue({
        actual: input.actual[index],
        expected: input.expected[index],
        label: input.label,
        path: `${input.path}[${index}]`
      });
    }
    return;
  }
  if (isRecord(input.expected)) {
    if (!isRecord(input.actual)) {
      throw new Error(`${input.label}: expected object at ${input.path}`);
    }
    assertRecordSubset({
      actual: input.actual,
      expected: input.expected,
      label: input.label,
      path: input.path
    });
    return;
  }
  if (input.actual !== input.expected) {
    throw new Error(
      `${input.label}: value mismatch at ${input.path} (expected=${JSON.stringify(input.expected)}, actual=${JSON.stringify(input.actual)})`
    );
  }
}

function assertRecordSubset(input: {
  actual: Record<string, unknown>;
  expected: Record<string, unknown>;
  label: string;
  path: string;
}): void {
  for (const [key, expectedValue] of Object.entries(input.expected)) {
    if (!(key in input.actual)) {
      throw new Error(`${input.label}: missing key at ${input.path}.${key}`);
    }
    assertSubsetValue({
      actual: input.actual[key],
      expected: expectedValue,
      label: input.label,
      path: `${input.path}.${key}`
    });
  }
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
  const expectedState = input.expected.stateSubset?.state;
  if (
    typeof expectedState === "string" &&
    input.output.stateSubset?.state !== expectedState
  ) {
    throw new Error(
      `${input.label}: stateSubset.state mismatch (expected=${expectedState}, actual=${input.output.stateSubset?.state ?? "undefined"})`
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
  if (input.expected.envelopePayloadSubset !== undefined) {
    if (input.output.envelopePayload === null) {
      throw new Error(`${input.label}: missing envelopePayload for subset assertion`);
    }
    assertRecordSubset({
      actual: input.output.envelopePayload,
      expected: input.expected.envelopePayloadSubset,
      label: input.label,
      path: "envelopePayload"
    });
  }
}

async function executeMetaReviewGateCase(input: {
  caseDef: ContractCase;
  applyExecutor: typeof applyMetaReviewGateOnConvergenceV11;
}): Promise<MetaReviewGateContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-meta-review-gate-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });

    const caseInput = parseMetaReviewGateCaseInput(input.caseDef.input);
    const stateForApply = await readStateSnapshot(bubble.paths.statePath);
    if (caseInput.applyScenario === "sticky_bypass") {
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...stateForApply.state,
          meta_review: {
            ...normalizeMetaReviewSnapshotForContract(stateForApply.state.meta_review),
            sticky_human_gate: true
          }
        },
        {
          expectedFingerprint: stateForApply.fingerprint,
          expectedState: "RUNNING"
        }
      );
    }

    const noRuntimeSessionBindingResult: SetMetaReviewerPaneBindingResult = {
      updated: false,
      reason: "no_runtime_session"
    };
    const nowIso = "2026-03-19T10:04:00.000Z";
    const activeMetaReviewerRecord: RuntimeSessionRecord = {
      bubbleId: bubble.bubbleId,
      repoPath,
      worktreePath: bubble.paths.worktreePath,
      tmuxSessionName: "pf-meta-review-contract",
      updatedAt: nowIso,
      metaReviewerPane: {
        role: "meta-reviewer",
        paneIndex: 3,
        active: true,
        updatedAt: nowIso
      }
    };

    const result = await input.applyExecutor(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        summary:
          caseInput.summary ??
          "Seed meta-review gate apply contract baseline summary.",
        refs: caseInput.refs,
        now: new Date(nowIso)
      },
      {
        setMetaReviewerPaneBinding: () => Promise.resolve(
          caseInput.applyScenario === "meta_review_running" ||
            caseInput.applyScenario === "sticky_bypass"
            ? {
                updated: true,
                record: activeMetaReviewerRecord
              }
            : noRuntimeSessionBindingResult
        ),
        notifyMetaReviewerSubmissionRequest: () => Promise.resolve({
          status: "confirmed" as const,
          reasonCode: null,
          message: "ok"
        })
      }
    );

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

  const v11 = await executeMetaReviewGateCase({
    caseDef,
    applyExecutor: applyMetaReviewGateOnConvergenceV11
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
