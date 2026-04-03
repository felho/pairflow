import { mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runBubbleWatchdog } from "../../../src/core/bubble/watchdogBubble.js";
import { runBubbleWatchdogV11 } from "../../../src/v11/application/watchdog/emitWatchdogV11.js";
import { buildMetaReviewExecutionContext } from "../../../src/core/bubble/metaReviewExecutionContext.js";
import {
  buildRunningExecutionContext,
  metaReviewExecutionContextToRunningContext
} from "../../../src/core/state/executionContext.js";
import {
  writeWatchdogPaneActivity
} from "../../../src/v11/shared/watchdog/watchdogPaneActivityStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface WatchdogContractOutput {
  status: "ok";
  reasonCode: "WATCHDOG_EVALUATED";
  escalated: boolean;
  reason: string;
  stateSubset: {
    state: string;
  };
  hasEnvelope: boolean;
}

export interface WatchdogContractRunResult {
  mode: ContractCase["mode"];
  baseline?: WatchdogContractOutput;
  v11?: WatchdogContractOutput;
}

type WatchdogContractScenario = "waiting_human" | "final_state";
type WatchdogContractExtendedScenario =
  | WatchdogContractScenario
  | "expired_recent_change_noop"
  | "expired_quiet_window_escalates"
  | "expired_missing_session_escalates"
  | "expired_unreadable_pane_escalates"
  | "meta_review_authority_expired"
  | "meta_review_authority_before_deadline_delivery_failed"
  | "meta_review_authority_expired_after_rebind";

interface ParsedWatchdogCaseInput {
  scenario: WatchdogContractExtendedScenario;
}

function buildWatchdogContractBubbleId(caseId: string): string {
  const suffix = createHash("sha1").update(caseId).digest("hex").slice(0, 12);
  return `b_contract_${suffix}`;
}

function parseWatchdogCaseInput(input: ContractCase["input"]): ParsedWatchdogCaseInput {
  const fixtureRaw = input.fixture;
  let scenario: WatchdogContractExtendedScenario = "waiting_human";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("watchdog contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "waiting_human" &&
      scenarioRaw !== "final_state" &&
      scenarioRaw !== "expired_recent_change_noop" &&
      scenarioRaw !== "expired_quiet_window_escalates" &&
      scenarioRaw !== "expired_missing_session_escalates" &&
      scenarioRaw !== "expired_unreadable_pane_escalates" &&
      scenarioRaw !== "meta_review_authority_expired" &&
      scenarioRaw !== "meta_review_authority_before_deadline_delivery_failed" &&
      scenarioRaw !== "meta_review_authority_expired_after_rebind"
    ) {
      throw new Error(
        "watchdog contract input.fixture.scenario must be one of: waiting_human, final_state, expired_recent_change_noop, expired_quiet_window_escalates, expired_missing_session_escalates, expired_unreadable_pane_escalates, meta_review_authority_expired, meta_review_authority_before_deadline_delivery_failed, meta_review_authority_expired_after_rebind."
      );
    }
    scenario = scenarioRaw ?? "waiting_human";
  }
  return { scenario };
}

function normalizeWatchdogResult(
  result: Awaited<ReturnType<typeof runBubbleWatchdog>>
): WatchdogContractOutput {
  return {
    status: "ok",
    reasonCode: "WATCHDOG_EVALUATED",
    escalated: result.escalated,
    reason: result.reason,
    stateSubset: {
      state: result.state.state
    },
    hasEnvelope: result.envelope !== undefined
  };
}

function assertContractExpectedSubset(input: {
  output: WatchdogContractOutput;
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
    input.expected.commandReason !== undefined &&
    input.output.reason !== input.expected.commandReason
  ) {
    throw new Error(
      `${input.label}: commandReason mismatch (expected=${input.expected.commandReason}, actual=${input.output.reason})`
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
  baseline: WatchdogContractOutput;
  v11: WatchdogContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.baseline) !== JSON.stringify(input.v11)) {
    throw new Error(
      `watchdog parity mismatch for case=${input.caseId}: baseline=${JSON.stringify(input.baseline)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function seedWaitingHumanState(input: {
  repoPath: string;
  bubbleId: string;
  scenario: WatchdogContractExtendedScenario;
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Watchdog contract parity fixture"
  });
  if (input.scenario === "final_state") {
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "DONE",
        execution_context: null,
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-03-20T12:40:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    return bubble;
  }
  if (
    input.scenario === "expired_recent_change_noop"
    || input.scenario === "expired_quiet_window_escalates"
    || input.scenario === "expired_missing_session_escalates"
    || input.scenario === "expired_unreadable_pane_escalates"
  ) {
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const startedAt = "2026-03-20T10:00:00.000Z";
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        active_agent: loaded.state.active_agent ?? "codex",
        active_role: loaded.state.active_role ?? "implementer",
        active_since: startedAt,
        execution_context: buildRunningExecutionContext({
          bubbleId: bubble.bubbleId,
          round: loaded.state.round,
          activeRole: loaded.state.active_role ?? "implementer",
          startedAt,
          watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes,
          attempt: loaded.state.execution_context?.attempt ?? 1
        }),
        last_command_at: startedAt
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    return bubble;
  }
  if (input.scenario === "meta_review_authority_expired") {
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-20T10:00:00.000Z",
        last_command_at: "2026-03-20T10:00:00.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          buildMetaReviewExecutionContext({
            bubbleId: bubble.bubbleId,
            round: loaded.state.round,
            startedAt: "2026-03-20T10:00:00.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          })
        ),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: bubble.bubbleId,
            round: loaded.state.round,
            startedAt: "2026-03-20T10:00:00.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          })
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    return bubble;
  }
  if (input.scenario === "meta_review_authority_before_deadline_delivery_failed") {
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-03-20T12:00:00.000Z",
      watchdogTimeoutMinutes: 60,
      attempt: 1
    });
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-03-20T12:44:30.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          executionContext
        ),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: executionContext,
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEWER_PANE_EXITED",
            message: "meta-reviewer pane exited after durable kickoff",
            observed_at: "2026-03-20T12:44:30.000Z",
            observed_for_handoff_id: executionContext.handoff_id,
            observed_for_round: executionContext.round
          },
          last_autonomous_run_id: "run_watchdog_before_deadline_contract_01",
          last_autonomous_status: "error",
          last_autonomous_recommendation: "inconclusive",
          last_autonomous_summary: "Runtime delivery failed after durable kickoff.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-20T12:44:30.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    return bubble;
  }
  if (input.scenario === "meta_review_authority_expired_after_rebind") {
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    const executionContext = buildMetaReviewExecutionContext({
      bubbleId: bubble.bubbleId,
      round: loaded.state.round,
      startedAt: "2026-03-20T12:00:00.000Z",
      watchdogTimeoutMinutes: 30,
      attempt: 1
    });
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-20T12:44:00.000Z",
        last_command_at: "2026-03-20T12:44:30.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          executionContext
        ),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: executionContext,
          runtime_delivery: {
            status: "uncertain",
            reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
            message:
              "meta-reviewer pane did not confirm structured submit request delivery",
            observed_at: "2026-03-20T12:44:30.000Z",
            observed_for_handoff_id: executionContext.handoff_id,
            observed_for_round: executionContext.round
          },
          last_autonomous_run_id: "run_watchdog_rebind_contract_01",
          last_autonomous_status: "error",
          last_autonomous_recommendation: "inconclusive",
          last_autonomous_summary: "Runtime delivery remained uncertain after restart/rebind.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-20T12:44:30.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    return bubble;
  }
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: "2026-03-20T12:40:00.000Z"
  });
  await writeStateSnapshot(bubble.paths.statePath, transitioned, {
    expectedFingerprint: loaded.fingerprint,
    expectedState: "RUNNING"
  });
  return bubble;
}

async function seedWatchdogPaneActivityFixture(input: {
  bubble: Awaited<ReturnType<typeof setupRunningBubbleFixture>>;
  scenario: WatchdogContractExtendedScenario;
}): Promise<void> {
  if (
    input.scenario !== "expired_recent_change_noop"
    && input.scenario !== "expired_quiet_window_escalates"
  ) {
    return;
  }

  await writeWatchdogPaneActivity({
    runtimeDir: input.bubble.paths.runtimeDir,
    bubbleId: input.bubble.bubbleId,
    record: {
      bubble_id: input.bubble.bubbleId,
      sampled_at: "2026-03-20T12:44:00.000Z",
      pane_hash: "pane-stable",
      last_changed_at:
        input.scenario === "expired_recent_change_noop"
          ? "2026-03-20T12:40:30.000Z"
          : "2026-03-20T12:34:00.000Z",
      session_name: "pf-watchdog-contract",
      target_pane: "pf-watchdog-contract:0.1",
      last_sample_status: "sampled"
    }
  });
}

function buildWatchdogScenarioDependencies(
  scenario: WatchdogContractExtendedScenario
) {
  if (scenario === "expired_recent_change_noop") {
    return {
      sampleWatchdogPaneActivity: () => Promise.resolve({
        status: "sampled" as const,
        sampled_at: "2026-03-20T12:45:00.000Z",
        pane_hash: "pane-stable",
        changed: false,
        session_name: "pf-watchdog-contract",
        target_pane: "pf-watchdog-contract:0.1"
      })
    };
  }

  if (scenario === "expired_quiet_window_escalates") {
    return {
      sampleWatchdogPaneActivity: () => Promise.resolve({
        status: "sampled" as const,
        sampled_at: "2026-03-20T12:45:00.000Z",
        pane_hash: "pane-stable",
        changed: false,
        session_name: "pf-watchdog-contract",
        target_pane: "pf-watchdog-contract:0.1"
      })
    };
  }

  if (scenario === "expired_missing_session_escalates") {
    return {
      sampleWatchdogPaneActivity: () => Promise.resolve({
        status: "no_session" as const,
        sampled_at: "2026-03-20T12:45:00.000Z",
        error: "runtime session missing"
      })
    };
  }

  if (scenario === "expired_unreadable_pane_escalates") {
    return {
      sampleWatchdogPaneActivity: () => Promise.resolve({
        status: "pane_unreadable" as const,
        sampled_at: "2026-03-20T12:45:00.000Z",
        error: "capture-pane failed",
        session_name: "pf-watchdog-contract",
        target_pane: "pf-watchdog-contract:0.1"
      })
    };
  }

  return undefined;
}

async function executeWatchdogCase(input: {
  caseDef: ContractCase;
  executor: typeof runBubbleWatchdog;
}): Promise<WatchdogContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-watchdog-contract-"));
  try {
    const parsedInput = parseWatchdogCaseInput(input.caseDef.input);
    await initGitRepository(repoPath);
    const bubble = await seedWaitingHumanState({
      repoPath,
      bubbleId: buildWatchdogContractBubbleId(input.caseDef.id),
      scenario: parsedInput.scenario
    });
    await seedWatchdogPaneActivityFixture({
      bubble,
      scenario: parsedInput.scenario
    });

    let recoverCalled = false;
    const scenarioDependencies = buildWatchdogScenarioDependencies(
      parsedInput.scenario
    );
    const result = await input.executor(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T12:45:00.000Z")
      },
      parsedInput.scenario === "meta_review_authority_expired"
      || parsedInput.scenario === "meta_review_authority_expired_after_rebind"
        ? {
            recoverMetaReviewGateFromSnapshot: async () => {
              recoverCalled = true;
              const latest = await readStateSnapshot(bubble.paths.statePath);
              return {
                bubbleId: bubble.bubbleId,
                route: "human_gate_run_failed",
                state: {
                  ...latest.state,
                  state: "READY_FOR_HUMAN_APPROVAL",
                  active_agent: null,
                  active_role: null,
                  active_since: null,
                  last_command_at: "2026-03-20T12:45:00.000Z"
                },
                gateEnvelope: {
                  id: "evt_meta_review_recover_seed",
                  ts: "2026-03-20T12:45:00.000Z",
                  bubble_id: bubble.bubbleId,
                  sender: "orchestrator",
                  recipient: "human",
                  type: "HUMAN_QUESTION",
                  round: latest.state.round,
                  payload: {
                    question: "Meta-review route recovered by watchdog contract fixture."
                  },
                  refs: []
                },
                gateSequence: 1
              };
            },
            ...(scenarioDependencies ?? {})
          }
        : scenarioDependencies
    );
    if (
      (
        parsedInput.scenario === "meta_review_authority_expired"
        || parsedInput.scenario === "meta_review_authority_expired_after_rebind"
      )
      && !recoverCalled
    ) {
      throw new Error(
        `watchdog contract case=${input.caseDef.id}: expected meta-review recovery dependency to be invoked.`
      );
    }
    return normalizeWatchdogResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runWatchdogContractCase(
  caseDef: ContractCase
): Promise<WatchdogContractRunResult> {
  if (caseDef.command !== "watchdog") {
    throw new Error(
      `Unsupported command for watchdog contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "baseline") {
    const baseline = await executeWatchdogCase({
      caseDef,
      executor: runBubbleWatchdog
    });
    assertContractExpectedSubset({
      output: baseline,
      expected: caseDef.expected,
      label: "baseline"
    });
    return {
      mode: caseDef.mode,
      baseline
    };
  }

  if (caseDef.mode === "v11") {
    const v11 = await executeWatchdogCase({
      caseDef,
      executor: runBubbleWatchdogV11
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

  const baseline = await executeWatchdogCase({
    caseDef,
    executor: runBubbleWatchdog
  });
  const v11 = await executeWatchdogCase({
    caseDef,
    executor: runBubbleWatchdogV11
  });
  assertContractExpectedSubset({
    output: baseline,
    expected: caseDef.expected,
    label: "parity/baseline"
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "parity/v11"
  });
  assertParityEquivalent({
    baseline,
    v11,
    caseId: caseDef.id
  });
  return {
    mode: caseDef.mode,
    baseline,
    v11
  };
}
