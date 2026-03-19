import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../../../src/core/bubble/metaReviewGate.js";
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
type MetaReviewGateRecoverScenario = "error" | "approve";
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
    recoverScenarioRaw !== "approve"
  ) {
    throw new Error(
      "metaReviewGate contract input.recoverScenario must be one of: error, approve."
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

function buildSyntheticMetaReviewRunApprove(input: {
  bubbleId: string;
}): MetaReviewRunResult {
  return {
    bubbleId: input.bubbleId,
    depth: "standard",
    status: "success",
    recommendation: "approve",
    summary: "Seed meta-review recover contract approve snapshot.",
    report_ref: "artifacts/meta-review-last.md",
    rework_target_message: null,
    updated_at: "2026-03-19T10:03:00.000Z",
    lifecycle_state: "META_REVIEW_RUNNING",
    warnings: []
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
            caseInput.applyScenario === "meta_review_running"
              ? {
                  updated: true,
                  record: activeMetaReviewerRecord
                }
              : noRuntimeSessionBindingResult
          ),
          notifyMetaReviewerSubmissionRequest: () => Promise.resolve()
        }
      );
    } else {
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

      result = await input.recoverExecutor({
        bubbleId: bubble.bubbleId,
        repoPath,
        refs: caseInput.refs,
        now: new Date("2026-03-19T10:04:00.000Z"),
        runResult:
          caseInput.recoverScenario === "approve"
            ? buildSyntheticMetaReviewRunApprove({
                bubbleId: bubble.bubbleId
              })
            : buildSyntheticMetaReviewRunError({
                bubbleId: bubble.bubbleId
              })
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
