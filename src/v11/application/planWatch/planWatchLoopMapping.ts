import { relative, resolve, sep } from "node:path";

import type { AgentRunnerBridgeInput } from "./agentRunnerBridgeContract.js";
import type { LinkedBubbleTriggerCandidate } from "./linkedBubbleTriggerIndexContract.js";

const PLAN_WATCH_TRIGGER_SOURCE = "plan_watch";
const PLAN_WATCH_TRIGGER_REASON = "linked_bubble_approval_ready";
const PLAN_WATCH_RUN_NOW_REASON = "operator_run_now";

export function buildPlanWatchDedupeKey(input: {
  repoPath: string;
  planPath: string;
  candidate: LinkedBubbleTriggerCandidate;
}): string {
  const planPath = normalizePlanPathForKey(input.repoPath, input.planPath);
  const statusEvidence =
    input.candidate.statusRef
    ?? input.candidate.observedAt
    ?? "no-status-ref";
  return [
    `plan=${planPath}`,
    `task=${input.candidate.taskId}`,
    `taskPath=${input.candidate.taskPath}`,
    `bubble=${input.candidate.bubbleId}`,
    `role=${input.candidate.bubbleRole}`,
    `state=${input.candidate.observedState}`,
    `status=${statusEvidence}`
  ].join("|");
}

export function buildRunnerInput(input: {
  repoPath: string;
  planPath: string;
  invocationId: string;
  candidate: LinkedBubbleTriggerCandidate;
  dedupeKey: string;
  now: Date;
  stopSignal?: AbortSignal | undefined;
}): AgentRunnerBridgeInput {
  return {
    repoPath: input.repoPath,
    planPath: input.planPath,
    invocationId: input.invocationId,
    now: input.now,
    ...(input.stopSignal !== undefined ? { stopSignal: input.stopSignal } : {}),
    trigger: {
      source: PLAN_WATCH_TRIGGER_SOURCE,
      reason: isRunNowCandidate(input.candidate)
        ? PLAN_WATCH_RUN_NOW_REASON
        : PLAN_WATCH_TRIGGER_REASON,
      observedAt: input.candidate.observedAt ?? input.now.toISOString(),
      refs: [
        ...(input.candidate.statusRef !== undefined ? [input.candidate.statusRef] : []),
        `task:${input.candidate.taskPath}`
      ],
      metadata: {
        taskId: input.candidate.taskId,
        taskPath: input.candidate.taskPath,
        bubbleId: input.candidate.bubbleId,
        bubbleRole: input.candidate.bubbleRole,
        observedState: input.candidate.observedState,
        dedupeKey: input.dedupeKey,
        ...(input.candidate.statusMetadata !== undefined
          ? { statusMetadata: input.candidate.statusMetadata }
          : {})
      }
    }
  };
}

function isRunNowCandidate(candidate: LinkedBubbleTriggerCandidate): boolean {
  return candidate.statusMetadata?.triggerKind === "operator_run_now";
}

function normalizePlanPathForKey(repoPath: string, planPath: string): string {
  const relativePath = relative(repoPath, planPath);
  if (
    relativePath.length > 0
    && !relativePath.startsWith("..")
    && !relativePath.includes(`${sep}..${sep}`)
  ) {
    return relativePath.split(sep).join("/");
  }
  return resolve(planPath).split(sep).join("/");
}
