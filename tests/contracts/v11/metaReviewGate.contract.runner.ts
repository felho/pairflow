import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyMetaReviewGateOnConvergence,
  type MetaReviewGateResult
} from "../../../src/v11/defaults/metaReviewGate/metaReviewGateApi.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { normalizeMetaReviewSnapshot } from "../../../src/v11/domain/metaReviewGate/snapshotState.js";
import type { MetaReviewGateTmuxRunner } from "../../../src/v11/shared/metaReviewGate/index.js";
import type {
  RuntimeSessionRecord
} from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type { SetMetaReviewerPaneBindingResult } from "../../../src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";

export interface MetaReviewGateContractOutput {
  status: "ok" | "error";
  reasonCode: string | null;
  gateRoute: string | null;
  envelopeType: string | null;
  envelopePayload: Record<string, unknown> | null;
  stateSubset: Record<string, unknown> | null;
}

export interface MetaReviewGateContractRunResult {
  mode: ContractCase["mode"];
  v11?: MetaReviewGateContractOutput;
}

type MetaReviewGateApplyScenario =
  | "run_failed"
  | "meta_review_running"
  | "sticky_bypass";

type MetaReviewGateContractNotifyDelivery =
  | "confirmed"
  | "uncertain"
  | "failed";

function parseMetaReviewGateCaseInput(input: ContractCase["input"]): {
  route: "apply";
  applyScenario: MetaReviewGateApplyScenario;
  notifyDelivery: MetaReviewGateContractNotifyDelivery;
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

  const notifyDeliveryRaw = input.notifyDelivery;
  if (
    notifyDeliveryRaw !== undefined &&
    notifyDeliveryRaw !== "confirmed" &&
    notifyDeliveryRaw !== "uncertain" &&
    notifyDeliveryRaw !== "failed"
  ) {
    throw new Error(
      "metaReviewGate contract input.notifyDelivery must be one of: confirmed, uncertain, failed."
    );
  }

  return {
    route: "apply",
    applyScenario: applyScenarioRaw ?? "run_failed",
    notifyDelivery: notifyDeliveryRaw ?? "confirmed",
    ...(typeof summaryRaw === "string" ? { summary: summaryRaw } : {}),
    refs: refsRaw ?? []
  };
}

function normalizeMetaReviewGateResult(
  result: MetaReviewGateResult
): MetaReviewGateContractOutput {
  const envelopePayload =
    typeof result.gateEnvelope.payload === "object" &&
    result.gateEnvelope.payload !== null
      ? result.gateEnvelope.payload as unknown as Record<string, unknown>
      : {};
  return {
    status: "ok",
    reasonCode: null,
    gateRoute: result.route,
    envelopeType: result.gateEnvelope.type,
    envelopePayload,
    stateSubset: {
      state: result.state.state,
      meta_review: {
        runtime_delivery: {
          status: result.state.meta_review?.runtime_delivery?.status ?? null
        }
      }
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
  if (
    input.expected.stateSubset !== undefined
  ) {
    if (input.output.stateSubset === null) {
      throw new Error(`${input.label}: missing stateSubset for subset assertion`);
    }
    assertRecordSubset({
      actual: input.output.stateSubset,
      expected: input.expected.stateSubset,
      label: input.label,
      path: "stateSubset"
    });
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
  applyExecutor: typeof applyMetaReviewGateOnConvergence;
}): Promise<MetaReviewGateContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-meta-review-gate-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml({
        ...bubble.config,
        role_mcp: {
          implementer: bubble.config.role_mcp?.implementer ?? "disabled",
          reviewer: bubble.config.role_mcp?.reviewer ?? "disabled",
          meta_reviewer: "enabled"
        }
      }),
      "utf8"
    );

    const caseInput = parseMetaReviewGateCaseInput(input.caseDef.input);
    const stateForApply = await readStateSnapshot(bubble.paths.statePath);
    if (caseInput.applyScenario === "sticky_bypass") {
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...stateForApply.state,
          meta_review: {
            ...normalizeMetaReviewSnapshot(stateForApply.state.meta_review),
            sticky_human_gate: true,
            consecutive_clean_runs: 0,
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
      workspacePath: bubble.paths.worktreePath,
      workspaceKind: "worktree",
      tmuxSessionName: "pf-meta-review-contract",
      updatedAt: nowIso,
      metaReviewerPane: {
        role: "meta-reviewer",
        paneIndex: 3,
        active: true,
        updatedAt: nowIso
      }
    };
    let submittedMetaReviewRequest: string | undefined;
    const notifyRunTmux = () => Promise.resolve(
      caseInput.notifyDelivery === "failed"
        ? {
          stdout: "codex exited (code 1). Dropping to interactive shell.",
          stderr: "",
          exitCode: 0
        }
        : caseInput.notifyDelivery === "uncertain"
          ? {
            stdout: "still waiting for structured submit to appear",
            stderr: "",
            exitCode: 0
          }
        : {
            stdout: submittedMetaReviewRequest ?? "",
            stderr: "",
            exitCode: 0
          }
    );
    const paneBindingRunTmux = () => Promise.resolve({
      stdout: "",
      stderr: "",
      exitCode: 0
    });
    const maybeAcceptTrustPrompt = () => Promise.resolve(undefined);
    const sendSubmissionRequestMessage = (
      _runner: MetaReviewGateTmuxRunner,
      _targetPane: string,
      message: string
    ) => {
      submittedMetaReviewRequest = message;
      return Promise.resolve(undefined);
    };
    const submitPaneInput = () => Promise.resolve(undefined);
    const respawnPaneCommand = () => Promise.resolve(undefined);
    const runtime = {
      notify: {
        tmux: {
          runner: notifyRunTmux,
          maybeAcceptTrustPrompt,
          sendSubmissionRequestMessage,
          submitPaneInput
        }
      },
      paneBinding: {
        buildAgentCommand: () => "codex meta-review",
        tmux: {
          runner: paneBindingRunTmux,
          respawnPaneCommand
        }
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
        runtime
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
    applyExecutor: applyMetaReviewGateOnConvergence
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
