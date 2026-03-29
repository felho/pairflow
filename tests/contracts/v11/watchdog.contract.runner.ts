import { mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runBubbleWatchdog } from "../../../src/core/bubble/watchdogBubble.js";
import { runBubbleWatchdogV11 } from "../../../src/v11/application/watchdog/emitWatchdogV11.js";
import { buildMetaReviewExecutionContext } from "../../../src/core/bubble/metaReviewExecutionContext.js";
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
  legacy?: WatchdogContractOutput;
  v11?: WatchdogContractOutput;
}

type WatchdogContractScenario = "waiting_human" | "final_state";
type WatchdogContractExtendedScenario =
  | WatchdogContractScenario
  | "expired_recent_change_noop"
  | "expired_quiet_window_escalates"
  | "expired_missing_session_escalates"
  | "expired_unreadable_pane_escalates"
  | "meta_review_running_expired";

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
      scenarioRaw !== "meta_review_running_expired"
    ) {
      throw new Error(
        "watchdog contract input.fixture.scenario must be one of: waiting_human, final_state, expired_recent_change_noop, expired_quiet_window_escalates, expired_missing_session_escalates, expired_unreadable_pane_escalates, meta_review_running_expired."
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
  legacy: WatchdogContractOutput;
  v11: WatchdogContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `watchdog parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
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
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        active_agent: loaded.state.active_agent ?? "codex",
        active_role: loaded.state.active_role ?? "implementer",
        active_since: loaded.state.active_since ?? "2026-03-20T10:00:00.000Z",
        last_command_at: "2026-03-20T10:00:00.000Z"
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    return bubble;
  }
  if (input.scenario === "meta_review_running_expired") {
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "META_REVIEW_RUNNING",
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-20T10:00:00.000Z",
        last_command_at: "2026-03-20T10:00:00.000Z",
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
      parsedInput.scenario === "meta_review_running_expired"
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
    if (parsedInput.scenario === "meta_review_running_expired" && !recoverCalled) {
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

  if (caseDef.mode === "legacy") {
    const legacy = await executeWatchdogCase({
      caseDef,
      executor: runBubbleWatchdog
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

  const legacy = await executeWatchdogCase({
    caseDef,
    executor: runBubbleWatchdog
  });
  const v11 = await executeWatchdogCase({
    caseDef,
    executor: runBubbleWatchdogV11
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
