import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../../src/core/bubble/metaReviewGate.js";
import { buildMetaReviewExecutionContext } from "../../../src/core/bubble/metaReviewExecutionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import {
  applyMetaReviewGateOnConvergenceV11,
  recoverMetaReviewGateFromSnapshotV11
} from "../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { MetaReviewRunResult } from "../../../src/core/bubble/metaReview.js";
import type {
  RuntimeSessionRecord,
  SetMetaReviewerPaneBindingResult
} from "../../../src/core/runtime/sessionsRegistry.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";
import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../../src/types/bubble.js";

export interface MetaReviewGateContractOutput {
  status: "ok";
  gateRoute: string;
  envelopeType: string;
  envelopePayload: Record<string, unknown>;
  stateSubset: {
    state: string;
  };
}

export interface MetaReviewGateContractRunResult {
  mode: ContractCase["mode"];
  legacy?: MetaReviewGateContractOutput;
  v11?: MetaReviewGateContractOutput;
}

type MetaReviewGateContractRoute = "recover" | "apply";
type MetaReviewGateApplyScenario =
  | "run_failed"
  | "meta_review_running"
  | "sticky_bypass";
type MetaReviewGateRecoverScenario =
  | "error"
  | "approve"
  | "approve_advisory"
  | "approve_advisory_with_artifact"
  | "inconclusive"
  | "rework_budget_exhausted"
  | "rework_dispatch_failed"
  | "auto_rework";
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
  route: MetaReviewGateContractRoute;
  applyScenario: MetaReviewGateApplyScenario;
  recoverScenario: MetaReviewGateRecoverScenario;
  summary?: string;
  refs: string[];
} {
  const routeRaw = input.route;
  if (routeRaw !== "recover" && routeRaw !== "apply") {
    throw new Error(
      "metaReviewGate contract input.route must be one of: recover, apply."
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

  const recoverScenarioRaw = input.recoverScenario;
  if (
    recoverScenarioRaw !== undefined &&
    recoverScenarioRaw !== "error" &&
    recoverScenarioRaw !== "approve" &&
    recoverScenarioRaw !== "approve_advisory" &&
    recoverScenarioRaw !== "approve_advisory_with_artifact" &&
    recoverScenarioRaw !== "inconclusive" &&
    recoverScenarioRaw !== "rework_budget_exhausted" &&
    recoverScenarioRaw !== "rework_dispatch_failed" &&
    recoverScenarioRaw !== "auto_rework"
  ) {
    throw new Error(
      "metaReviewGate contract input.recoverScenario must be one of: error, approve, approve_advisory, approve_advisory_with_artifact, inconclusive, rework_budget_exhausted, rework_dispatch_failed, auto_rework."
    );
  }

  return {
    route: routeRaw,
    applyScenario: applyScenarioRaw ?? "run_failed",
    recoverScenario: recoverScenarioRaw ?? "error",
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
    sticky_human_gate:
      metaReview?.sticky_human_gate === true
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
    report_ref: "artifacts/meta-review-last.json",
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

function buildSyntheticMetaReviewRunApprove(input: {
  bubbleId: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "success",
    recommendation: "approve",
    summary: "Seed meta-review recover contract approve snapshot.",
    report_ref: "artifacts/meta-review-last.json",
    rework_target_message: null,
    updated_at: "2026-03-19T10:03:00.000Z",
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: [],
    report_json: {
      findings_claim_state: "clean",
      findings_claim_source: "meta_review_artifact",
      findings_count: 0,
      findings_claimed_open_total: 0,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 0
    }
  };
}

function buildSyntheticMetaReviewRunApproveAdvisory(input: {
  bubbleId: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "success",
    recommendation: "approve",
    summary: "No open P0/P1 findings remain.",
    report_ref: "artifacts/meta-review-last.json",
    rework_target_message: null,
    updated_at: "2026-03-19T10:03:00.000Z",
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: [],
    report_json: {
      findings_claim_state: "open_findings",
      findings_claim_source: "meta_review_artifact",
      findings_count: 2,
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings: [
        {
          severity: "P2",
          title: "Seed advisory finding P2",
          refs: ["artifact://seed/advisory-p2"]
        },
        {
          priority: "P3",
          title: "Seed advisory finding P3"
        }
      ]
    }
  };
}

function buildSyntheticMetaReviewRunApproveAdvisoryWithArtifact(input: {
  bubbleId: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "success",
    recommendation: "approve",
    summary: "Seed meta-review recover contract approve/advisory+artifact snapshot.",
    report_ref: "artifacts/meta-review-last.json",
    rework_target_message: null,
    updated_at: "2026-03-19T10:03:00.000Z",
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: [],
    report_json: {
      findings_claim_state: "open_findings",
      findings_claim_source: "meta_review_artifact",
      findings_count: 2,
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_open_total: 2
    }
  };
}

function buildSyntheticMetaReviewRunInconclusive(input: {
  bubbleId: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "success",
    recommendation: "inconclusive",
    summary: "Seed meta-review recover contract inconclusive snapshot.",
    report_ref: "artifacts/meta-review-last.json",
    rework_target_message: null,
    updated_at: "2026-03-19T10:03:00.000Z",
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: []
  };
}

function buildSyntheticMetaReviewRunReworkOpenFindings(input: {
  bubbleId: string;
  runId: string;
  findingsCount: number;
  findingsArtifactRef: string;
  findingsDigestSha256: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    run_id: input.runId,
    status: "success",
    recommendation: "rework",
    summary: "Seed meta-review recover contract rework/budget-exhausted snapshot.",
    report_ref: "artifacts/meta-review-last.json",
    rework_target_message: "Fix the remaining blocker findings.",
    updated_at: "2026-03-19T10:03:00.000Z",
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: [],
    report_json: {
      findings_claim_state: "open_findings",
      findings_claim_source: "meta_review_artifact",
      findings_count: input.findingsCount,
      findings_artifact_ref: input.findingsArtifactRef,
      meta_review_run_id: input.runId,
      findings_digest_sha256: input.findingsDigestSha256,
      findings_artifact_status: "available"
    }
  };
}

function buildSyntheticMetaReviewRunReworkDispatchFailed(input: {
  bubbleId: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "success",
    recommendation: "rework",
    summary: "Seed meta-review recover contract rework dispatch failed snapshot.",
    report_ref: "artifacts/meta-review-last.json",
    rework_target_message: "Fix the blocker findings before retry.",
    updated_at: "2026-03-19T10:03:00.000Z",
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: []
  };
}

function normalizeMetaReviewGateResult(
  result: Awaited<ReturnType<typeof recoverMetaReviewGateFromSnapshot>>
): MetaReviewGateContractOutput {
  const envelopePayload =
    typeof result.gateEnvelope.payload === "object" &&
    result.gateEnvelope.payload !== null
      ? result.gateEnvelope.payload as Record<string, unknown>
      : {};
  return {
    status: "ok",
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
      throw new Error(
        `${input.label}: missing key at ${input.path}.${key}`
      );
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
  if (
    input.expected.envelopeType !== undefined &&
    input.output.envelopeType !== input.expected.envelopeType
  ) {
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${input.output.envelopeType})`
    );
  }
  if (input.expected.envelopePayloadSubset !== undefined) {
    assertRecordSubset({
      actual: input.output.envelopePayload,
      expected: input.expected.envelopePayloadSubset,
      label: input.label,
      path: "envelopePayload"
    });
  }
}

function assertParityEquivalent(input: {
  legacy: MetaReviewGateContractOutput;
  v11: MetaReviewGateContractOutput;
  caseId: string;
}): void {
  const normalizedLegacy = normalizeParityComparableValue(input.legacy);
  const normalizedV11 = normalizeParityComparableValue(input.v11);
  if (JSON.stringify(normalizedLegacy) !== JSON.stringify(normalizedV11)) {
    throw new Error(
      `metaReviewGate parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

function normalizeParityComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeParityComparableValue(item));
  }
  if (!isRecord(value)) {
    return value;
  }
  const normalized: Record<string, unknown> = {};
  const sortedKeys = Object.keys(value).sort((left, right) =>
    left.localeCompare(right)
  );
  for (const key of sortedKeys) {
    normalized[key] = normalizeParityComparableValue(value[key]);
  }
  return normalized;
}

async function executeMetaReviewGateCase(input: {
  caseDef: ContractCase;
  applyExecutor: typeof applyMetaReviewGateOnConvergence;
  recoverExecutor: typeof recoverMetaReviewGateFromSnapshot;
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
    let result: Awaited<ReturnType<typeof recoverMetaReviewGateFromSnapshot>>;

    if (caseInput.route === "apply") {
      const stateForApply = await readStateSnapshot(bubble.paths.statePath);
      if (caseInput.applyScenario === "sticky_bypass") {
        await writeStateSnapshot(
          bubble.paths.statePath,
          {
            ...stateForApply.state,
            meta_review: {
              ...normalizeMetaReviewSnapshotForContract(
                stateForApply.state.meta_review
              ),
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
      result = await input.applyExecutor(
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
    } else {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      const metaReviewSnapshot = normalizeMetaReviewSnapshotForContract(
        loaded.state.meta_review
      );
      const isBudgetExhaustedScenario =
        caseInput.recoverScenario === "rework_budget_exhausted";
      const isAutoReworkScenario = caseInput.recoverScenario === "auto_rework";
      const autoReworkLimit = Math.max(metaReviewSnapshot.auto_rework_limit, 1);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          state: "META_REVIEW_RUNNING",
          active_agent: "codex",
          active_role: "meta_reviewer",
          active_since: "2026-03-19T10:03:30.000Z",
          last_command_at: "2026-03-19T10:03:30.000Z",
          meta_review: {
            ...metaReviewSnapshot,
            execution_context: buildMetaReviewExecutionContext({
              bubbleId: bubble.bubbleId,
              round: loaded.state.round,
              startedAt: "2026-03-19T10:03:30.000Z",
              watchdogTimeoutMinutes: 60,
              attempt: 1
            }),
            ...(isBudgetExhaustedScenario
              ? {
                  auto_rework_limit: autoReworkLimit,
                  auto_rework_count: autoReworkLimit
                }
              : isAutoReworkScenario
                ? {
                    auto_rework_limit: autoReworkLimit,
                    auto_rework_count: Math.max(0, autoReworkLimit - 1)
                  }
                : {})
          }
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "RUNNING"
        }
      );

      let runResult: MetaReviewRunResult;
      if (caseInput.recoverScenario === "approve") {
        runResult = buildSyntheticMetaReviewRunApprove({
          bubbleId: bubble.bubbleId
        });
      } else if (caseInput.recoverScenario === "approve_advisory") {
        runResult = buildSyntheticMetaReviewRunApproveAdvisory({
          bubbleId: bubble.bubbleId
        });
      } else if (caseInput.recoverScenario === "approve_advisory_with_artifact") {
        runResult = buildSyntheticMetaReviewRunApproveAdvisoryWithArtifact({
          bubbleId: bubble.bubbleId
        });
      } else if (caseInput.recoverScenario === "inconclusive") {
        runResult = buildSyntheticMetaReviewRunInconclusive({
          bubbleId: bubble.bubbleId
        });
      } else if (caseInput.recoverScenario === "rework_budget_exhausted") {
        const findingsCount = 2;
        const findingsArtifactRef = "artifacts/meta-review-findings-contract.json";
        const findingsArtifactPath = join(
          bubble.paths.artifactsDir,
          "meta-review-findings-contract.json"
        );
        const findingsArtifactRaw = `${JSON.stringify(
          {
            open_total: findingsCount,
            summary: {
              open_total: findingsCount
            }
          },
          null,
          2
        )}\n`;
        await writeFile(findingsArtifactPath, findingsArtifactRaw, "utf8");
        const findingsDigestSha256 = createHash("sha256")
          .update(findingsArtifactRaw, "utf8")
          .digest("hex");
        runResult = buildSyntheticMetaReviewRunReworkOpenFindings({
          bubbleId: bubble.bubbleId,
          runId: "meta-review-run-contract-1",
          findingsCount,
          findingsArtifactRef,
          findingsDigestSha256
        });
      } else if (caseInput.recoverScenario === "auto_rework") {
        const findingsCount = 2;
        const findingsArtifactRef = "artifacts/meta-review-findings-contract-auto-rework.json";
        const findingsArtifactPath = join(
          bubble.paths.artifactsDir,
          "meta-review-findings-contract-auto-rework.json"
        );
        const findingsArtifactRaw = `${JSON.stringify(
          {
            open_total: findingsCount,
            summary: {
              open_total: findingsCount
            }
          },
          null,
          2
        )}\n`;
        await writeFile(findingsArtifactPath, findingsArtifactRaw, "utf8");
        const findingsDigestSha256 = createHash("sha256")
          .update(findingsArtifactRaw, "utf8")
          .digest("hex");
        runResult = buildSyntheticMetaReviewRunReworkOpenFindings({
          bubbleId: bubble.bubbleId,
          runId: "meta-review-run-contract-auto-rework",
          findingsCount,
          findingsArtifactRef,
          findingsDigestSha256
        });
      } else if (caseInput.recoverScenario === "rework_dispatch_failed") {
        runResult = buildSyntheticMetaReviewRunReworkDispatchFailed({
          bubbleId: bubble.bubbleId
        });
      } else {
        runResult = buildSyntheticMetaReviewRunError({
          bubbleId: bubble.bubbleId
        });
      }

      result = await input.recoverExecutor({
        bubbleId: bubble.bubbleId,
        repoPath,
        refs: caseInput.refs,
        now: new Date("2026-03-19T10:04:00.000Z"),
        runResult
      });
    }

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
      applyExecutor: applyMetaReviewGateOnConvergence,
      recoverExecutor: recoverMetaReviewGateFromSnapshot
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
      applyExecutor: applyMetaReviewGateOnConvergenceV11,
      recoverExecutor: recoverMetaReviewGateFromSnapshotV11
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
    applyExecutor: applyMetaReviewGateOnConvergence,
    recoverExecutor: recoverMetaReviewGateFromSnapshot
  });
  const v11 = await executeMetaReviewGateCase({
    caseDef,
    applyExecutor: applyMetaReviewGateOnConvergenceV11,
    recoverExecutor: recoverMetaReviewGateFromSnapshotV11
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
