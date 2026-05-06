import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";

import {
  createApiClient,
  PairflowApiError,
  type PairflowApiClient
} from "../lib/api";
import { copyToClipboard } from "../lib/clipboard";
import {
  defaultPosition,
  resolveViewportAwarePosition,
  type PlacementSource,
  type ViewportRectangle
} from "../lib/canvasLayout";
import {
  createRealtimeEventsClient,
  type RealtimeEventsClient,
  type RealtimeEventsClientInput
} from "../lib/events";
import type {
  BubbleLifecycleState,
  BubbleActionKind,
  BubbleReviewAutoReworkSeverity,
  MetaReviewQualityPreset,
  AttachActionResult,
  BubbleReviewLoopMode,
  BubbleCardModel,
  BubbleDeleteResult,
  BubblePosition,
  CommitActionInput,
  ConnectionStatus,
  MergeActionInput,
  UpdateReviewPolicyActionResult,
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiSnapshotEvent,
  UiTimelineDisplayItem
} from "../lib/types";
import { bubbleLifecycleStates } from "../lib/types";

const positionsStorageKey = "pairflow.ui.canvas.positions.v2";
const expandedIdsStorageKey = "pairflow.ui.canvas.expandedIds.v1";
const pollingRefreshErrorPrefix = "Polling refresh failed:";
const expandedTimelineLagRetryDelayMs = 150;
const expandedTimelineLagRetryMaxAttempts = 3;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface RepoBubblesPayload {
  repo: UiRepoSummary;
  bubbles: UiBubbleSummary[];
}

export interface RunBubbleActionInput {
  bubbleId: string;
  action: BubbleActionKind;
  message?: string;
  refs?: string[];
  overrideNonApprove?: boolean;
  overrideReason?: string;
  stageAll?: boolean;
  push?: boolean;
  deleteRemote?: boolean;
  reviewLoopMode?: BubbleReviewLoopMode;
  reviewBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
  metaReviewQualityPreset?: MetaReviewQualityPreset;
  expectedBubbleToml?: string;
}

export interface BubbleStoreState {
  repos: string[];
  selectedRepos: string[];
  bubblesById: Record<string, BubbleCardModel>;
  repoSummaries: Record<string, UiRepoSummary>;
  loadedRepos: Record<string, boolean>;
  positions: Record<string, BubblePosition>;
  positionSources: Record<string, BubblePositionSource>;
  canvasViewport: ViewportRectangle | null;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  expandedBubbleIds: string[];
  bubbleDetails: Record<string, UiBubbleDetail>;
  bubbleTimelines: Record<string, UiTimelineDisplayItem[]>;
  detailLoadingById: Record<string, boolean>;
  timelineLoadingById: Record<string, boolean>;
  detailErrorById: Record<string, string>;
  timelineErrorById: Record<string, string>;
  actionLoadingById: Record<string, boolean>;
  actionErrorById: Record<string, string>;
  actionRetryHintById: Record<string, string>;
  actionFailureById: Record<string, BubbleActionKind>;
  initialize: () => Promise<void>;
  toggleRepo: (repoPath: string) => Promise<void>;
  setPosition: (bubbleId: string, position: BubblePosition) => void;
  persistPositions: (bubbleId?: string) => void;
  setCanvasViewport: (viewport: ViewportRectangle | null) => void;
  stopRealtime: () => void;
  toggleBubbleExpanded: (bubbleId: string) => Promise<void>;
  collapseBubble: (bubbleId: string) => void;
  refreshExpandedBubble: (bubbleId: string) => Promise<void>;
  runBubbleAction: (input: RunBubbleActionInput) => Promise<void>;
  // repoPathOverride is required for confirm-phase deletes when the bubble was
  // concurrently removed from bubblesById by realtime events.
  deleteBubble: (
    bubbleId: string,
    force?: boolean,
    repoPathOverride?: string
  ) => Promise<BubbleDeleteResult>;
  clearActionFeedback: (bubbleId: string) => void;
}

export interface BubbleStoreDependencies {
  api?: PairflowApiClient;
  createEventsClient?: (input: RealtimeEventsClientInput) => RealtimeEventsClient;
  storage?: StorageLike | null;
  pollingIntervalMs?: number;
}

type BubblePositionSource = PlacementSource | "explicit";

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clearPollingRefreshError(error: string | null): string | null {
  if (error === null) {
    return null;
  }
  return error.startsWith(pollingRefreshErrorPrefix) ? null : error;
}

function resolveAttachCopyCommand(result: AttachActionResult): string | null {
  if (result.launcherUsed !== "copy") {
    return null;
  }
  const candidate = result.attachCommand?.trim();
  if (candidate === undefined || candidate.length === 0) {
    return null;
  }
  return candidate;
}

function defaultMetaReviewSummary(): UiBubbleSummary["metaReview"] {
  return {
    actor: "meta-reviewer",
    authorityActive: false,
    consecutiveCleanRuns: 0,
    runtimeDelivery: null
  };
}

function normalizeReviewPolicy(
  input: unknown,
  options: {
    allowUnsupportedSupportStatusAlias?: boolean;
    warningContext?: {
      bubbleId?: string;
      repoPath?: string;
      source: "conflict_response";
    };
  } = {}
): UiBubbleSummary["reviewPolicy"] {
  if (input === undefined || input === null || typeof input !== "object") {
    return null;
  }
  const candidate = input as Partial<NonNullable<UiBubbleSummary["reviewPolicy"]>>;
  const rawSupportStatus = (input as { support_status?: unknown }).support_status;
  const requestedLoopMode = candidate.requested_loop_mode;
  const effectiveLoopMode = candidate.effective_loop_mode;
  const supportStatus =
    rawSupportStatus === "enabled" || rawSupportStatus === "guarded"
      ? rawSupportStatus
      : options.allowUnsupportedSupportStatusAlias === true
        && rawSupportStatus === "unsupported"
        ? "guarded"
        : rawSupportStatus;
  const reviewerBlockingSeverity =
    candidate.reviewer_blocking_min_severity;
  const metaReviewSeverity = candidate.meta_review_auto_rework_min_severity;
  const consecutiveCleanRunsRequired =
    candidate.meta_review_consecutive_clean_runs_required;
  if (
    (requestedLoopMode !== "full" && requestedLoopMode !== "meta_only")
    || (effectiveLoopMode !== "full" && effectiveLoopMode !== "meta_only")
    || (supportStatus !== "enabled" && supportStatus !== "guarded")
    || (
      reviewerBlockingSeverity !== "P1"
      && reviewerBlockingSeverity !== "P2"
      && reviewerBlockingSeverity !== "P3"
    )
    || (
      metaReviewSeverity !== "P1"
      && metaReviewSeverity !== "P2"
      && metaReviewSeverity !== "P3"
    )
    || !Number.isInteger(consecutiveCleanRunsRequired)
    || (consecutiveCleanRunsRequired as number) < 1
  ) {
    return null;
  }
  if (
    options.allowUnsupportedSupportStatusAlias === true
    && rawSupportStatus === "unsupported"
  ) {
    console.warn(
      "Normalizing non-canonical review-policy support_status 'unsupported' from a 409 conflict payload to canonical 'guarded'.",
      {
        ...(options.warningContext?.bubbleId !== undefined
          ? { bubbleId: options.warningContext.bubbleId }
          : {}),
        ...(options.warningContext?.repoPath !== undefined
          ? { repoPath: options.warningContext.repoPath }
          : {}),
        source: options.warningContext?.source ?? "conflict_response"
      }
    );
  }
  return {
    requested_loop_mode: requestedLoopMode,
    effective_loop_mode: effectiveLoopMode,
    support_status: supportStatus,
    reviewer_blocking_min_severity: reviewerBlockingSeverity,
    meta_review_auto_rework_min_severity: metaReviewSeverity,
    meta_review_consecutive_clean_runs_required:
      consecutiveCleanRunsRequired as number,
    ...(typeof candidate.blocked_reason_code === "string"
      ? { blocked_reason_code: candidate.blocked_reason_code }
      : {}),
    ...(Array.isArray(candidate.blocked_prerequisites)
      && candidate.blocked_prerequisites.length > 0
      && candidate.blocked_prerequisites.every((item) => typeof item === "string")
      ? { blocked_prerequisites: candidate.blocked_prerequisites }
      : {}),
    ...(typeof candidate.provenance_note === "string"
      ? { provenance_note: candidate.provenance_note }
      : {})
  };
}

function resolveActionRetryHint(
  input: {
    action: BubbleActionKind;
    error: PairflowApiError;
    usedConflictBubbleContext: boolean;
    malformedConflictReviewPolicyPayload: boolean;
    refreshConfirmed: boolean;
  }
): string | null {
  if (input.error.status !== 409) {
    return null;
  }
  if (input.action === "open" || input.action === "attach") {
    return null;
  }

  const reasonCode =
    typeof input.error.details?.reasonCode === "string"
      ? input.error.details.reasonCode
      : null;

  if (input.action === "update-review-policy") {
    if (reasonCode === "REVIEW_POLICY_WRITE_CONFLICT") {
      if (
        input.usedConflictBubbleContext
        && input.malformedConflictReviewPolicyPayload
      ) {
        return "bubble.toml compare-and-swap conflict. Current bubble.toml/state came from the conflict response, but its reviewPolicy payload was malformed; refresh the bubble detail before retrying.";
      }
      if (input.usedConflictBubbleContext) {
        return "bubble.toml compare-and-swap conflict. Current review-policy snapshot came from the conflict response; review it, then retry.";
      }
      if (input.refreshConfirmed) {
        return "bubble.toml compare-and-swap conflict. A follow-up refresh completed; review the current review-policy snapshot, then retry.";
      }
      return "bubble.toml compare-and-swap conflict. Automatic refresh could not be confirmed; reload the bubble detail, then retry.";
    }
    if (reasonCode === "REVIEW_POLICY_STATE_CONFLICT") {
      if (input.usedConflictBubbleContext) {
        return "Review policy updates are disabled in the current lifecycle state. Current bubble context came from the conflict response.";
      }
      if (input.refreshConfirmed) {
        return "Review policy updates are disabled in the current lifecycle state. A follow-up refresh completed.";
      }
      return "Review policy updates are disabled in the current lifecycle state. Automatic refresh could not be confirmed.";
    }
  }

  return input.refreshConfirmed
    ? "State changed in CLI/UI. Latest state was refetched. Review state, then retry."
    : "State changed in CLI/UI. Automatic refresh could not be confirmed; reload state, then retry.";
}

interface ReviewPolicyConflictContext {
  bubbleId: string;
  repoPath: string;
  currentState: BubbleLifecycleState | null;
  bubbleToml: string;
  reviewPolicy: NonNullable<UiBubbleSummary["reviewPolicy"]> | null;
  reviewPolicyPayloadState: "present" | "missing" | "malformed";
}

function warnInvalidReviewPolicyConflictContext(input: {
  bubbleId?: string;
  repoPath?: string;
  reviewPolicy: unknown;
}): void {
  console.warn(
    "Ignoring review-policy conflict context because the 409 reviewPolicy payload is malformed.",
    {
      ...(input.bubbleId !== undefined ? { bubbleId: input.bubbleId } : {}),
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      reviewPolicy: input.reviewPolicy
    }
  );
}

function extractReviewPolicyConflictContext(
  error: PairflowApiError
): ReviewPolicyConflictContext | null {
  if (error.status !== 409 || error.details === undefined) {
    return null;
  }

  const candidate = error.details.reviewPolicyConflict;
  if (
    candidate === null
    || candidate === undefined
    || typeof candidate !== "object"
    || Array.isArray(candidate)
  ) {
    return null;
  }

  const conflict = candidate as Partial<{
    bubbleId: string;
    repoPath: string;
    currentState: BubbleLifecycleState;
    bubbleToml: string;
    reviewPolicy: UiBubbleSummary["reviewPolicy"];
  }>;
  const reviewPolicy = normalizeReviewPolicy(conflict.reviewPolicy, {
    allowUnsupportedSupportStatusAlias: true,
    warningContext: {
      ...(typeof conflict.bubbleId === "string" ? { bubbleId: conflict.bubbleId } : {}),
      ...(typeof conflict.repoPath === "string" ? { repoPath: conflict.repoPath } : {}),
      source: "conflict_response"
    }
  });
  if (reviewPolicy === null && conflict.reviewPolicy !== undefined) {
    warnInvalidReviewPolicyConflictContext({
      ...(typeof conflict.bubbleId === "string" ? { bubbleId: conflict.bubbleId } : {}),
      ...(typeof conflict.repoPath === "string" ? { repoPath: conflict.repoPath } : {}),
      reviewPolicy: conflict.reviewPolicy
    });
  }
  if (
    typeof conflict.bubbleId !== "string"
    || typeof conflict.repoPath !== "string"
    || typeof conflict.bubbleToml !== "string"
  ) {
    return null;
  }

  const currentState = bubbleLifecycleStates.includes(
    conflict.currentState as BubbleLifecycleState
  )
    ? (conflict.currentState as BubbleLifecycleState)
    : null;

  return {
    bubbleId: conflict.bubbleId,
    repoPath: conflict.repoPath,
    currentState,
    bubbleToml: conflict.bubbleToml,
    reviewPolicy,
    reviewPolicyPayloadState:
      reviewPolicy !== null
        ? "present"
        : conflict.reviewPolicy === undefined
          ? "missing"
          : "malformed"
  };
}

function normalizeAttention(
  input: UiBubbleSummary["attention"] | undefined
): UiBubbleSummary["attention"] {
  if (input === undefined || input === null || typeof input !== "object") {
    return null;
  }
  if (
    typeof input.code !== "string"
    || (input.severity !== "warning" && input.severity !== "critical")
    || typeof input.label !== "string"
  ) {
    return null;
  }
  return {
    code: input.code,
    severity: input.severity,
    label: input.label,
    ...(typeof input.detail === "string" ? { detail: input.detail } : {})
  };
}

function normalizeBubbleSummary(input: UiBubbleSummary): UiBubbleSummary {
  const candidate = (input as Partial<UiBubbleSummary>).metaReview;
  if (candidate === undefined || candidate === null || typeof candidate !== "object") {
    return {
      ...input,
      metaReview: defaultMetaReviewSummary()
    };
  }
  const meta = candidate as Partial<UiBubbleSummary["metaReview"]>;
  const consecutiveCleanRuns = meta.consecutiveCleanRuns;
  return {
    ...input,
    attention: normalizeAttention((input as Partial<UiBubbleSummary>).attention),
    reviewPolicy: normalizeReviewPolicy((input as Partial<UiBubbleSummary>).reviewPolicy),
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: meta.authorityActive === true,
      consecutiveCleanRuns:
        Number.isInteger(consecutiveCleanRuns)
        && (consecutiveCleanRuns as number) >= 0
          ? consecutiveCleanRuns as number
          : 0,
      runtimeDelivery:
        meta.runtimeDelivery !== null &&
        meta.runtimeDelivery !== undefined &&
        typeof meta.runtimeDelivery === "object" &&
        (
          meta.runtimeDelivery.status === "confirmed" ||
          meta.runtimeDelivery.status === "uncertain" ||
          meta.runtimeDelivery.status === "failed"
        ) &&
        typeof meta.runtimeDelivery.message === "string" &&
        typeof meta.runtimeDelivery.observedAt === "string"
          ? {
              status: meta.runtimeDelivery.status,
              reasonCode:
                typeof meta.runtimeDelivery.reasonCode === "string"
                  ? meta.runtimeDelivery.reasonCode
                  : null,
              message: meta.runtimeDelivery.message,
              observedAt: meta.runtimeDelivery.observedAt,
              observedForHandoffId:
                typeof meta.runtimeDelivery.observedForHandoffId === "string"
                  ? meta.runtimeDelivery.observedForHandoffId
                  : null,
              observedForRound:
                typeof meta.runtimeDelivery.observedForRound === "number"
                  ? meta.runtimeDelivery.observedForRound
                  : null
            }
          : null
    }
  };
}

function toBubbleCardModel(bubble: UiBubbleSummary): BubbleCardModel {
  const normalized = normalizeBubbleSummary(bubble);
  return {
    ...normalized,
    hasRuntimeSession: normalized.runtimeSession !== null
  };
}

function toBubbleCardModelFromDetail(detail: UiBubbleDetail): BubbleCardModel {
  return toBubbleCardModel({
    ...detail,
    attention: normalizeAttention(detail.attention)
  });
}

function normalizeBubbleDetail(detail: UiBubbleDetail): UiBubbleDetail {
  return {
    ...detail,
    ...normalizeBubbleSummary(detail)
  };
}

function resolveSelectedRepos(input: {
  priorSelected: string[];
  priorRepos: string[];
  repos: string[];
}): string[] {
  if (input.priorSelected.length === 0) {
    return [...input.repos];
  }

  const repoSet = new Set(input.repos);
  const priorRepoSet = new Set(input.priorRepos);
  const retained = input.priorSelected.filter((repo) => repoSet.has(repo));
  const discovered = input.repos.filter((repo) => !priorRepoSet.has(repo));
  return [...retained, ...discovered];
}

function mergeExpandedDetailWithSummary(
  detail: UiBubbleDetail,
  bubble: BubbleCardModel
): UiBubbleDetail {
  const summaryRuntimeHealthy =
    bubble.runtimeSession !== null &&
    bubble.runtime.present &&
    !bubble.runtime.stale;
  const detailRuntimeHealthy =
    detail.runtimeSession !== null &&
    detail.runtime.present &&
    !detail.runtime.stale;
  const preserveDetailRuntime = detailRuntimeHealthy && !summaryRuntimeHealthy;
  const preserveDetailRemoteExecution =
    detail.remoteExecution !== undefined
    && (
      bubble.remoteExecution === undefined
      || isWeakerRemoteExecutionSummary(detail.remoteExecution, bubble.remoteExecution)
    );
  const preserveDetailAttention =
    detail.attention !== null
    && bubble.attention === null
    && preserveDetailRemoteExecution;
  const mergedRemoteExecution = preserveDetailRemoteExecution
    ? detail.remoteExecution
    : bubble.remoteExecution;

  return {
    ...detail,
    ...bubble,
    // Expanded cards should keep their last confirmed runtime snapshot until the
    // follow-up detail refresh lands, otherwise realtime summary jitter can
    // briefly show a false "runtime unavailable" hint while the session is
    // actually still running.
    runtimeSession: preserveDetailRuntime
      ? detail.runtimeSession
      : bubble.runtimeSession,
    runtime: preserveDetailRuntime ? detail.runtime : bubble.runtime,
    attention: preserveDetailAttention ? detail.attention : bubble.attention,
    ...(mergedRemoteExecution !== undefined
      ? { remoteExecution: mergedRemoteExecution }
      : {})
  };
}

function isWeakerRemoteExecutionSummary(
  detail: UiBubbleDetail["remoteExecution"],
  summary: BubbleCardModel["remoteExecution"]
): boolean {
  if (detail === undefined || summary === undefined) {
    return false;
  }

  if (detail.viewKind !== "status" || summary.viewKind !== "list") {
    return false;
  }

  return (
    summary.stateSource === "cache"
    && summary.runtimeAvailability === undefined
    && detail.runtimeAvailability !== "not_started"
  );
}

function mergeExpandedDetailWithIncomingDetail(
  previous: UiBubbleDetail | undefined,
  incoming: UiBubbleDetail
): UiBubbleDetail {
  if (previous === undefined) {
    return incoming;
  }

  const preservePreviousRemoteExecution =
    previous.remoteExecution !== undefined && incoming.remoteExecution === undefined;

  return {
    ...previous,
    ...incoming,
    ...(preservePreviousRemoteExecution
      ? { remoteExecution: previous.remoteExecution }
      : incoming.remoteExecution !== undefined
        ? { remoteExecution: incoming.remoteExecution }
        : {})
  };
}

function getStorageFromWindow(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  const candidate = (window as { localStorage?: unknown }).localStorage;
  if (
    candidate === null ||
    candidate === undefined ||
    typeof (candidate as StorageLike).getItem !== "function" ||
    typeof (candidate as StorageLike).setItem !== "function"
  ) {
    return null;
  }
  return candidate as StorageLike;
}

function readPositions(storage: StorageLike | null): Record<string, BubblePosition> {
  if (storage === null) {
    return {};
  }

  let raw: string | null = null;
  try {
    raw = storage.getItem(positionsStorageKey);
  } catch {
    return {};
  }
  if (raw === null || raw.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const result: Record<string, BubblePosition> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        continue;
      }
      const x = (value as { x?: unknown }).x;
      const y = (value as { y?: unknown }).y;
      if (typeof x !== "number" || typeof y !== "number") {
        continue;
      }
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }
      result[key] = {
        x,
        y
      };
    }
    return result;
  } catch {
    return {};
  }
}

function initialPositionSources(
  positions: Record<string, BubblePosition>
): Record<string, BubblePositionSource> {
  return Object.fromEntries(
    Object.keys(positions).map((bubbleId) => [bubbleId, "explicit"])
  );
}

function writePositions(
  storage: StorageLike | null,
  positions: Record<string, BubblePosition>,
  sources: Record<string, BubblePositionSource>
): void {
  if (storage === null) {
    return;
  }

  const persisted: Record<string, BubblePosition> = {};
  for (const [bubbleId, position] of Object.entries(positions)) {
    if (sources[bubbleId] === "explicit") {
      persisted[bubbleId] = position;
    }
  }

  try {
    storage.setItem(positionsStorageKey, JSON.stringify(persisted));
  } catch {
    return;
  }
}

function readExpandedIds(storage: StorageLike | null): string[] {
  if (storage === null) {
    return [];
  }
  try {
    const raw = storage.getItem(expandedIdsStorageKey);
    if (raw === null || raw.trim().length === 0) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeExpandedIds(storage: StorageLike | null, ids: string[]): void {
  if (storage === null) {
    return;
  }
  try {
    storage.setItem(expandedIdsStorageKey, JSON.stringify(ids));
  } catch {
    return;
  }
}


function mergeRepoPayloads(
  currentBubbles: Record<string, BubbleCardModel>,
  reposToReplace: string[],
  payloads: RepoBubblesPayload[]
): Record<string, BubbleCardModel> {
  const scopedRepos = new Set(reposToReplace);
  const next: Record<string, BubbleCardModel> = {};

  for (const [bubbleId, bubble] of Object.entries(currentBubbles)) {
    if (!scopedRepos.has(bubble.repoPath)) {
      next[bubbleId] = bubble;
    }
  }

  for (const payload of payloads) {
    for (const bubble of payload.bubbles) {
      next[bubble.bubbleId] = toBubbleCardModel(bubble);
    }
  }

  return next;
}

function mergeSnapshot(
  currentBubbles: Record<string, BubbleCardModel>,
  snapshot: UiSnapshotEvent
): Record<string, BubbleCardModel> {
  const scopedRepos = new Set(snapshot.repos.map((repo) => repo.repoPath));
  const next: Record<string, BubbleCardModel> = {};

  for (const [bubbleId, bubble] of Object.entries(currentBubbles)) {
    if (!scopedRepos.has(bubble.repoPath)) {
      next[bubbleId] = bubble;
    }
  }

  for (const bubble of snapshot.bubbles) {
    next[bubble.bubbleId] = toBubbleCardModel(bubble);
  }

  return next;
}

function syncExpandedBubbleIds(
  expandedBubbleIds: string[],
  previousBubbles: Record<string, BubbleCardModel>,
  nextBubbles: Record<string, BubbleCardModel>
): string[] {
  const nextExpanded = expandedBubbleIds.filter((id) => nextBubbles[id] !== undefined);
  const expandedSet = new Set(nextExpanded);
  let changed = nextExpanded.length !== expandedBubbleIds.length;

  for (const bubbleId of Object.keys(nextBubbles)) {
    if (previousBubbles[bubbleId] !== undefined || expandedSet.has(bubbleId)) {
      continue;
    }
    nextExpanded.push(bubbleId);
    expandedSet.add(bubbleId);
    changed = true;
  }

  return changed ? nextExpanded : expandedBubbleIds;
}

function removeBubble(
  currentBubbles: Record<string, BubbleCardModel>,
  bubbleId: string
): Record<string, BubbleCardModel> {
  if (currentBubbles[bubbleId] === undefined) {
    return currentBubbles;
  }
  const next = { ...currentBubbles };
  delete next[bubbleId];
  return next;
}

function prunePositions(
  currentPositions: Record<string, BubblePosition>,
  bubbles: Record<string, BubbleCardModel>
): Record<string, BubblePosition> {
  const next = { ...currentPositions };
  let changed = false;

  for (const bubbleId of Object.keys(next)) {
    if (bubbles[bubbleId] !== undefined) {
      continue;
    }
    delete next[bubbleId];
    changed = true;
  }

  return changed ? next : currentPositions;
}

function prunePositionSources(
  currentSources: Record<string, BubblePositionSource>,
  bubbles: Record<string, BubbleCardModel>
): Record<string, BubblePositionSource> {
  const next = { ...currentSources };
  let changed = false;

  for (const bubbleId of Object.keys(next)) {
    if (bubbles[bubbleId] !== undefined) {
      continue;
    }
    delete next[bubbleId];
    changed = true;
  }

  return changed ? next : currentSources;
}

function positionsEqual(left: BubblePosition, right: BubblePosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function fillDefaultPositions(
  positions: Record<string, BubblePosition>,
  positionSources: Record<string, BubblePositionSource>,
  bubbles: Record<string, BubbleCardModel>,
  selectedRepos: Set<string>,
  expandedBubbleIds: readonly string[],
  viewport: ViewportRectangle | null
): {
  positions: Record<string, BubblePosition>;
  positionSources: Record<string, BubblePositionSource>;
} {
  const expandedSet = new Set(expandedBubbleIds);
  const visible = Object.values(bubbles)
    .filter((bubble) => selectedRepos.has(bubble.repoPath))
    .sort((left, right) => left.bubbleId.localeCompare(right.bubbleId));

  let changed = false;
  const next = { ...positions };
  const nextSources = { ...positionSources };

  for (const [index, bubble] of visible.entries()) {
    const currentPosition = next[bubble.bubbleId];
    const currentSource = nextSources[bubble.bubbleId];
    if (currentPosition !== undefined && currentSource !== "generated-fallback") {
      continue;
    }
    if (currentPosition !== undefined && currentSource === "generated-fallback" && viewport === null) {
      continue;
    }

    const occupied: {
      position: BubblePosition;
      expanded: boolean;
    }[] = [];
    for (const candidate of visible) {
      if (candidate.bubbleId === bubble.bubbleId) {
        continue;
      }
      const candidatePosition = next[candidate.bubbleId];
      if (candidatePosition === undefined) {
        continue;
      }
      occupied.push({
        position: candidatePosition,
        expanded: expandedSet.has(candidate.bubbleId)
      });
    }
    const result = resolveViewportAwarePosition(
        defaultPosition(index),
        occupied,
        expandedSet.has(bubble.bubbleId),
        viewport
      );
    if (
      currentPosition === undefined
      || !positionsEqual(currentPosition, result.position)
      || currentSource !== result.source
    ) {
      next[bubble.bubbleId] = result.position;
      nextSources[bubble.bubbleId] = result.source;
      changed = true;
    }
  }

  return changed
    ? {
        positions: next,
        positionSources: nextSources
      }
    : {
        positions,
        positionSources
      };
}

function pruneRecordByBubbleIds<T>(
  current: Record<string, T>,
  bubbles: Record<string, BubbleCardModel>
): Record<string, T> {
  const next = { ...current };
  let changed = false;
  for (const key of Object.keys(next)) {
    if (bubbles[key] !== undefined) {
      continue;
    }
    delete next[key];
    changed = true;
  }
  return changed ? next : current;
}

async function fetchRepoPayloads(
  api: PairflowApiClient,
  repos: string[]
): Promise<RepoBubblesPayload[]> {
  return Promise.all(repos.map((repoPath) => api.getBubbles(repoPath)));
}

async function performBubbleAction(
  api: PairflowApiClient,
  bubble: BubbleCardModel,
  input: RunBubbleActionInput
): Promise<UpdateReviewPolicyActionResult | null> {
  switch (input.action) {
    case "start":
      await api.startBubble(bubble.repoPath, bubble.bubbleId);
      return null;
    case "approve":
      await api.approveBubble(bubble.repoPath, bubble.bubbleId, {
        ...(input.refs !== undefined ? { refs: input.refs } : {}),
        ...(input.overrideNonApprove !== undefined
          ? { overrideNonApprove: input.overrideNonApprove }
          : {}),
        ...(input.overrideReason !== undefined
          ? { overrideReason: input.overrideReason }
          : {})
      });
      return null;
    case "request-rework": {
      const message = input.message?.trim() ?? "";
      if (message.length === 0) {
        throw new Error("Request rework requires a message.");
      }
      await api.requestRework(bubble.repoPath, bubble.bubbleId, {
        message,
        ...(input.refs !== undefined ? { refs: input.refs } : {})
      });
      return null;
    }
    case "reply": {
      const message = input.message?.trim() ?? "";
      if (message.length === 0) {
        throw new Error("Reply requires a message.");
      }
      await api.replyBubble(bubble.repoPath, bubble.bubbleId, {
        message,
        ...(input.refs !== undefined ? { refs: input.refs } : {})
      });
      return null;
    }
    case "resume":
      await api.resumeBubble(bubble.repoPath, bubble.bubbleId);
      return null;
    case "update-review-policy": {
      const reviewLoopMode = input.reviewLoopMode;
      if (reviewLoopMode === undefined) {
        throw new Error("Review policy update requires a target review loop mode.");
      }
      return api.updateReviewPolicy(bubble.repoPath, bubble.bubbleId, {
        reviewLoopMode,
        ...(input.reviewBlockingMinSeverity !== undefined
          ? {
              reviewBlockingMinSeverity:
                input.reviewBlockingMinSeverity
            }
          : {}),
        ...(input.metaReviewQualityPreset !== undefined
          ? { metaReviewQualityPreset: input.metaReviewQualityPreset }
          : {}),
        ...(input.expectedBubbleToml !== undefined
          ? { expectedBubbleToml: input.expectedBubbleToml }
          : {})
      });
    }
    case "restart":
      await api.restartBubble(bubble.repoPath, bubble.bubbleId);
      return null;
    case "commit": {
      const commitInput: CommitActionInput = {
        stageAll: input.stageAll ?? true,
        ...(input.message !== undefined && input.message.trim().length > 0
          ? { message: input.message.trim() }
          : {}),
        ...(input.refs !== undefined && input.refs.length > 0
          ? { refs: input.refs }
          : {})
      };
      await api.commitBubble(bubble.repoPath, bubble.bubbleId, commitInput);
      return null;
    }
    case "merge": {
      const mergeInput: MergeActionInput = {
        ...(input.push !== undefined ? { push: input.push } : {}),
        ...(input.deleteRemote !== undefined
          ? { deleteRemote: input.deleteRemote }
          : {})
      };
      await api.mergeBubble(bubble.repoPath, bubble.bubbleId, mergeInput);
      return null;
    }
    case "open":
      await api.openBubble(bubble.repoPath, bubble.bubbleId);
      return null;
    case "attach":
      {
        const attachResult = await api.attachBubble(
          bubble.repoPath,
          bubble.bubbleId
        );
        const copyCommand = resolveAttachCopyCommand(attachResult);
        if (copyCommand !== null) {
          try {
            await copyToClipboard(copyCommand);
          } catch (error) {
            throw new Error(
              `Attach command copy failed. Run manually: ${copyCommand}. Reason: ${asMessage(error)}`
            );
          }
        }
      }
      return null;
    case "stop":
      await api.stopBubble(bubble.repoPath, bubble.bubbleId);
      return null;
    case "delete":
      throw new Error(
        "Delete action requires two-phase confirmation and must use deleteBubble()."
      );
    default: {
      const _exhaustive: never = input.action;
      throw new Error(`Unsupported action: ${_exhaustive as string}`);
    }
  }
}

export function createBubbleStore(
  dependencies: BubbleStoreDependencies = {}
): StoreApi<BubbleStoreState> {
  const api = dependencies.api ?? createApiClient();
  const storage = dependencies.storage ?? getStorageFromWindow();
  const createEventsClient =
    dependencies.createEventsClient ?? createRealtimeEventsClient;

  let eventsClient: RealtimeEventsClient | null = null;
  let latestInitializeId = 0;
  let latestAppliedEventId = 0;
  let latestAppliedSnapshotTs = "";
  const latestExpandedRefreshRequestIdByBubble = new Map<string, number>();
  const expandedTimelineLagRetryTimerByBubble = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  const expandedTimelineLagRetryStateByBubble = new Map<
    string,
    {
      expectedCount: number;
      attempts: number;
    }
  >();

  const store = createStore<BubbleStoreState>((set, get) => {
    const clearExpandedTimelineLagRetry = (bubbleId: string): void => {
      const timer = expandedTimelineLagRetryTimerByBubble.get(bubbleId);
      if (timer !== undefined) {
        clearTimeout(timer);
        expandedTimelineLagRetryTimerByBubble.delete(bubbleId);
      }
      expandedTimelineLagRetryStateByBubble.delete(bubbleId);
    };

    const scheduleExpandedTimelineLagRetry = (
      bubbleId: string,
      expectedCount: number
    ): void => {
      const state = get();
      if (
        !state.expandedBubbleIds.includes(bubbleId)
        || state.bubblesById[bubbleId] === undefined
      ) {
        clearExpandedTimelineLagRetry(bubbleId);
        return;
      }

      const previous = expandedTimelineLagRetryStateByBubble.get(bubbleId);
      const attempts =
        previous?.expectedCount === expectedCount ? previous.attempts + 1 : 1;
      if (attempts > expandedTimelineLagRetryMaxAttempts) {
        clearExpandedTimelineLagRetry(bubbleId);
        return;
      }

      const existingTimer = expandedTimelineLagRetryTimerByBubble.get(bubbleId);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
      }

      expandedTimelineLagRetryStateByBubble.set(bubbleId, {
        expectedCount,
        attempts
      });
      const timer = setTimeout(() => {
        expandedTimelineLagRetryTimerByBubble.delete(bubbleId);
        const latest = expandedTimelineLagRetryStateByBubble.get(bubbleId);
        if (latest?.expectedCount !== expectedCount) {
          return;
        }
        void refreshExpandedBubble(bubbleId);
      }, expandedTimelineLagRetryDelayMs);
      expandedTimelineLagRetryTimerByBubble.set(bubbleId, timer);
    };

    const syncExpandedFromSummary = (
      details: Record<string, UiBubbleDetail>,
      bubblesById: Record<string, BubbleCardModel>
    ): Record<string, UiBubbleDetail> => {
      const next = { ...details };
      for (const [bubbleId, detail] of Object.entries(next)) {
        const bubble = bubblesById[bubbleId];
        if (bubble === undefined) {
          delete next[bubbleId];
          continue;
        }
        next[bubbleId] = mergeExpandedDetailWithSummary(detail, bubble);
      }
      return next;
    };

    const refreshRepos = async (repos: string[]): Promise<void> => {
      if (repos.length === 0) {
        return;
      }
      const payloads = await fetchRepoPayloads(api, repos);

      set((state) => {
        const bubblesById = mergeRepoPayloads(state.bubblesById, repos, payloads);
        const expandedBubbleIds = syncExpandedBubbleIds(
          state.expandedBubbleIds,
          state.bubblesById,
          bubblesById
        );
        const repoSummaries = { ...state.repoSummaries };
        const loadedRepos = { ...state.loadedRepos };

        for (const payload of payloads) {
          repoSummaries[payload.repo.repoPath] = payload.repo;
          loadedRepos[payload.repo.repoPath] = true;
        }

        const prunedPositions = prunePositions(state.positions, bubblesById);
        const prunedSources = prunePositionSources(state.positionSources, bubblesById);
        const placement = fillDefaultPositions(
          prunedPositions,
          prunedSources,
          bubblesById,
          new Set(state.selectedRepos),
          expandedBubbleIds,
          state.canvasViewport
        );
        const bubbleDetails = syncExpandedFromSummary(state.bubbleDetails, bubblesById);

        return {
          bubblesById,
          repoSummaries,
          loadedRepos,
          positions: placement.positions,
          positionSources: placement.positionSources,
          bubbleDetails,
          bubbleTimelines: pruneRecordByBubbleIds(state.bubbleTimelines, bubblesById),
          detailLoadingById: pruneRecordByBubbleIds(state.detailLoadingById, bubblesById),
          timelineLoadingById: pruneRecordByBubbleIds(state.timelineLoadingById, bubblesById),
          detailErrorById: pruneRecordByBubbleIds(state.detailErrorById, bubblesById),
          timelineErrorById: pruneRecordByBubbleIds(state.timelineErrorById, bubblesById),
          actionLoadingById: pruneRecordByBubbleIds(state.actionLoadingById, bubblesById),
          actionErrorById: pruneRecordByBubbleIds(state.actionErrorById, bubblesById),
          actionRetryHintById: pruneRecordByBubbleIds(state.actionRetryHintById, bubblesById),
          actionFailureById: pruneRecordByBubbleIds(state.actionFailureById, bubblesById),
          expandedBubbleIds
        };
      });

      writePositions(storage, get().positions, get().positionSources);
      writeExpandedIds(storage, get().expandedBubbleIds);
    };

    const refreshExpandedBubble = async (bubbleId: string): Promise<void> => {
      const bubble = get().bubblesById[bubbleId];
      if (bubble === undefined) {
        clearExpandedTimelineLagRetry(bubbleId);
        return;
      }
      const refreshRequestId =
        (latestExpandedRefreshRequestIdByBubble.get(bubbleId) ?? 0) + 1;
      latestExpandedRefreshRequestIdByBubble.set(bubbleId, refreshRequestId);

      set((state) => ({
        detailLoadingById: {
          ...state.detailLoadingById,
          [bubbleId]: true
        },
        timelineLoadingById: {
          ...state.timelineLoadingById,
          [bubbleId]: true
        },
        detailErrorById: (() => {
          const next = { ...state.detailErrorById };
          delete next[bubbleId];
          return next;
        })(),
        timelineErrorById: (() => {
          const next = { ...state.timelineErrorById };
          delete next[bubbleId];
          return next;
        })()
      }));

      const [detailResult, timelineResult] = await Promise.allSettled([
        api.getBubble(bubble.repoPath, bubbleId),
        api.getBubbleTimeline(bubble.repoPath, bubbleId)
      ]);

      let acceptedLatestRefresh = false;
      set((state) => {
        if (latestExpandedRefreshRequestIdByBubble.get(bubbleId) !== refreshRequestId) {
          return {};
        }
        acceptedLatestRefresh = true;
        latestExpandedRefreshRequestIdByBubble.delete(bubbleId);

        const detailLoadingById = { ...state.detailLoadingById };
        const timelineLoadingById = { ...state.timelineLoadingById };
        delete detailLoadingById[bubbleId];
        delete timelineLoadingById[bubbleId];

        const next: Partial<BubbleStoreState> = {
          detailLoadingById,
          timelineLoadingById
        };

        if (
          detailResult.status === "fulfilled"
          && detailResult.value !== undefined
          && detailResult.value !== null
        ) {
          const detail = mergeExpandedDetailWithIncomingDetail(
            state.bubbleDetails[bubbleId],
            normalizeBubbleDetail(detailResult.value)
          );
          next.bubbleDetails = {
            ...state.bubbleDetails,
            [bubbleId]: detail
          };
          next.bubblesById = {
            ...state.bubblesById,
            [bubbleId]: toBubbleCardModelFromDetail(detail)
          };
          const detailErrorById = { ...state.detailErrorById };
          delete detailErrorById[bubbleId];
          next.detailErrorById = detailErrorById;
        } else {
          next.detailErrorById = {
            ...state.detailErrorById,
            [bubbleId]:
              detailResult.status === "fulfilled"
                ? "Bubble detail response was empty."
                : asMessage(detailResult.reason)
          };
        }

        if (timelineResult.status === "fulfilled") {
          next.bubbleTimelines = {
            ...state.bubbleTimelines,
            [bubbleId]: timelineResult.value
          };
          const timelineErrorById = { ...state.timelineErrorById };
          delete timelineErrorById[bubbleId];
          next.timelineErrorById = timelineErrorById;
        } else {
          next.timelineErrorById = {
            ...state.timelineErrorById,
            [bubbleId]: asMessage(timelineResult.reason)
          };
        }

        return next;
      });

      if (!acceptedLatestRefresh) {
        return;
      }

      if (
        detailResult.status === "fulfilled" &&
        detailResult.value !== undefined &&
        detailResult.value !== null &&
        timelineResult.status === "fulfilled"
      ) {
        const expectedTimelineCount = detailResult.value.transcript.totalMessages;
        const actualTimelineCount = timelineResult.value.length;
        if (actualTimelineCount < expectedTimelineCount) {
          scheduleExpandedTimelineLagRetry(bubbleId, expectedTimelineCount);
          return;
        }
      }

      clearExpandedTimelineLagRetry(bubbleId);
    };

    const ensureEventsClient = (): RealtimeEventsClient => {
      if (eventsClient !== null) {
        return eventsClient;
      }

      eventsClient = createEventsClient({
        getRepos: () => get().selectedRepos,
        onEvent: (event) => {
          const isSnapshot = event.type === "snapshot";
          const isOlderThanAppliedSnapshot =
            !isSnapshot &&
            (
              event.id <= latestAppliedEventId ||
              (
                latestAppliedSnapshotTs.length > 0 &&
                event.ts < latestAppliedSnapshotTs
              )
            );

          if (isOlderThanAppliedSnapshot) {
            return;
          }

          if (isSnapshot) {
            latestAppliedEventId = event.id;
            if (event.ts > latestAppliedSnapshotTs) {
              latestAppliedSnapshotTs = event.ts;
            }
          } else {
            latestAppliedEventId = Math.max(latestAppliedEventId, event.id);
          }

          set((state) => {
            switch (event.type) {
              case "snapshot": {
                const repoSummaries = { ...state.repoSummaries };
                for (const repo of event.repos) {
                  repoSummaries[repo.repoPath] = repo;
                }

                const bubblesById = mergeSnapshot(state.bubblesById, event);
                const expandedBubbleIds = syncExpandedBubbleIds(
                  state.expandedBubbleIds,
                  state.bubblesById,
                  bubblesById
                );
                const placement = fillDefaultPositions(
                  prunePositions(state.positions, bubblesById),
                  prunePositionSources(state.positionSources, bubblesById),
                  bubblesById,
                  new Set(state.selectedRepos),
                  expandedBubbleIds,
                  state.canvasViewport
                );
                const bubbleDetails = syncExpandedFromSummary(
                  state.bubbleDetails,
                  bubblesById
                );
                return {
                  repoSummaries,
                  bubblesById,
                  positions: placement.positions,
                  positionSources: placement.positionSources,
                  bubbleDetails,
                  bubbleTimelines: pruneRecordByBubbleIds(
                    state.bubbleTimelines,
                    bubblesById
                  ),
                  detailLoadingById: pruneRecordByBubbleIds(
                    state.detailLoadingById,
                    bubblesById
                  ),
                  timelineLoadingById: pruneRecordByBubbleIds(
                    state.timelineLoadingById,
                    bubblesById
                  ),
                  detailErrorById: pruneRecordByBubbleIds(
                    state.detailErrorById,
                    bubblesById
                  ),
                  timelineErrorById: pruneRecordByBubbleIds(
                    state.timelineErrorById,
                    bubblesById
                  ),
                  actionLoadingById: pruneRecordByBubbleIds(
                    state.actionLoadingById,
                    bubblesById
                  ),
                  actionErrorById: pruneRecordByBubbleIds(
                    state.actionErrorById,
                    bubblesById
                  ),
                  actionRetryHintById: pruneRecordByBubbleIds(
                    state.actionRetryHintById,
                    bubblesById
                  ),
                  actionFailureById: pruneRecordByBubbleIds(
                    state.actionFailureById,
                    bubblesById
                  ),
                  expandedBubbleIds
                };
              }
              case "bubble.updated": {
                const bubblesById = {
                  ...state.bubblesById,
                  [event.bubbleId]: toBubbleCardModel(event.bubble)
                };
                const expandedBubbleIds = syncExpandedBubbleIds(
                  state.expandedBubbleIds,
                  state.bubblesById,
                  bubblesById
                );
                const placement = fillDefaultPositions(
                  prunePositions(state.positions, bubblesById),
                  prunePositionSources(state.positionSources, bubblesById),
                  bubblesById,
                  new Set(state.selectedRepos),
                  expandedBubbleIds,
                  state.canvasViewport
                );
                const existingDetail = state.bubbleDetails[event.bubbleId];
                const bubbleDetails =
                  existingDetail === undefined
                    ? state.bubbleDetails
                    : {
                        ...state.bubbleDetails,
                        [event.bubbleId]: mergeExpandedDetailWithSummary(
                          existingDetail,
                          toBubbleCardModel(event.bubble)
                        )
                      };
                return {
                  bubblesById,
                  positions: placement.positions,
                  positionSources: placement.positionSources,
                  bubbleDetails,
                  expandedBubbleIds
                };
              }
              case "bubble.removed": {
                const bubblesById = removeBubble(state.bubblesById, event.bubbleId);
                const placement = fillDefaultPositions(
                  prunePositions(state.positions, bubblesById),
                  prunePositionSources(state.positionSources, bubblesById),
                  bubblesById,
                  new Set(state.selectedRepos),
                  state.expandedBubbleIds,
                  state.canvasViewport
                );
                return {
                  bubblesById,
                  positions: placement.positions,
                  positionSources: placement.positionSources,
                  bubbleDetails: pruneRecordByBubbleIds(state.bubbleDetails, bubblesById),
                  bubbleTimelines: pruneRecordByBubbleIds(state.bubbleTimelines, bubblesById),
                  detailLoadingById: pruneRecordByBubbleIds(
                    state.detailLoadingById,
                    bubblesById
                  ),
                  timelineLoadingById: pruneRecordByBubbleIds(
                    state.timelineLoadingById,
                    bubblesById
                  ),
                  detailErrorById: pruneRecordByBubbleIds(
                    state.detailErrorById,
                    bubblesById
                  ),
                  timelineErrorById: pruneRecordByBubbleIds(
                    state.timelineErrorById,
                    bubblesById
                  ),
                  actionLoadingById: pruneRecordByBubbleIds(
                    state.actionLoadingById,
                    bubblesById
                  ),
                  actionErrorById: pruneRecordByBubbleIds(
                    state.actionErrorById,
                    bubblesById
                  ),
                  actionRetryHintById: pruneRecordByBubbleIds(
                    state.actionRetryHintById,
                    bubblesById
                  ),
                  actionFailureById: pruneRecordByBubbleIds(
                    state.actionFailureById,
                    bubblesById
                  ),
                  expandedBubbleIds: state.expandedBubbleIds.filter(
                    (id) => id !== event.bubbleId
                  )
                };
              }
              case "repo.updated": {
                return {
                  repoSummaries: {
                    ...state.repoSummaries,
                    [event.repo.repoPath]: event.repo
                  }
                };
              }
              default: {
                return {};
              }
            }
          });

          writePositions(storage, get().positions, get().positionSources);
          writeExpandedIds(storage, get().expandedBubbleIds);

          const expandedIds = get().expandedBubbleIds;
          if (expandedIds.length === 0) {
            return;
          }
          if (event.type === "bubble.updated" && expandedIds.includes(event.bubbleId)) {
            void refreshExpandedBubble(event.bubbleId);
            return;
          }
          if (event.type === "snapshot") {
            for (const expandedId of expandedIds) {
              if (get().bubblesById[expandedId] === undefined) {
                continue;
              }
              const inSnapshot = event.bubbles.some(
                (bubble) => bubble.bubbleId === expandedId
              );
              if (inSnapshot) {
                void refreshExpandedBubble(expandedId);
              }
            }
          }
        },
        onStatus: (status) => {
          set((state) => ({
            connectionStatus: status,
            ...(status === "connected"
              ? { error: clearPollingRefreshError(state.error) }
              : {})
          }));
        },
        onPollingError: (error) => {
          set({
            error: `${pollingRefreshErrorPrefix} ${asMessage(error)}`
          });
        },
        poll: async (repos) => {
          if (repos.length === 0) {
            return;
          }
          await refreshRepos(repos);
          set((state) => ({
            error: clearPollingRefreshError(state.error)
          }));
        },
        ...(dependencies.pollingIntervalMs !== undefined
          ? { pollingIntervalMs: dependencies.pollingIntervalMs }
          : {})
      });
      return eventsClient;
    };

    const initialPositions = readPositions(storage);

    return {
      repos: [],
      selectedRepos: [],
      bubblesById: {},
      repoSummaries: {},
      loadedRepos: {},
      positions: initialPositions,
      positionSources: initialPositionSources(initialPositions),
      canvasViewport: null,
      connectionStatus: "idle",
      isLoading: false,
      error: null,
      expandedBubbleIds: readExpandedIds(storage),
      bubbleDetails: {},
      bubbleTimelines: {},
      detailLoadingById: {},
      timelineLoadingById: {},
      detailErrorById: {},
      timelineErrorById: {},
      actionLoadingById: {},
      actionErrorById: {},
      actionRetryHintById: {},
      actionFailureById: {},

      async initialize(): Promise<void> {
        const initializeId = latestInitializeId + 1;
        latestInitializeId = initializeId;
        latestAppliedEventId = 0;
        latestAppliedSnapshotTs = "";
        set({ isLoading: true, error: null });

        try {
          const repos = await api.getRepos();
          if (initializeId !== latestInitializeId) {
            return;
          }
          const selectedRepos = resolveSelectedRepos({
            priorSelected: get().selectedRepos,
            priorRepos: get().repos,
            repos
          });

          const payloads = await fetchRepoPayloads(api, repos);
          if (initializeId !== latestInitializeId) {
            return;
          }
          const bubblesById: Record<string, BubbleCardModel> = {};
          const repoSummaries: Record<string, UiRepoSummary> = {};
          const loadedRepos: Record<string, boolean> = {};

          for (const payload of payloads) {
            repoSummaries[payload.repo.repoPath] = payload.repo;
            loadedRepos[payload.repo.repoPath] = true;
            for (const bubble of payload.bubbles) {
              bubblesById[bubble.bubbleId] = toBubbleCardModel(bubble);
            }
          }

          const placement = fillDefaultPositions(
            prunePositions(get().positions, bubblesById),
            prunePositionSources(get().positionSources, bubblesById),
            bubblesById,
            new Set(selectedRepos),
            get().expandedBubbleIds,
            get().canvasViewport
          );

          set((state) => ({
            repos,
            selectedRepos,
            bubblesById,
            repoSummaries,
            loadedRepos,
            positions: placement.positions,
            positionSources: placement.positionSources,
            isLoading: false,
            error: null,
            expandedBubbleIds: state.expandedBubbleIds.filter(
              (id) => bubblesById[id] !== undefined
            ),
            bubbleDetails: syncExpandedFromSummary(state.bubbleDetails, bubblesById),
            bubbleTimelines: pruneRecordByBubbleIds(state.bubbleTimelines, bubblesById),
            detailLoadingById: pruneRecordByBubbleIds(state.detailLoadingById, bubblesById),
            timelineLoadingById: pruneRecordByBubbleIds(state.timelineLoadingById, bubblesById),
            detailErrorById: pruneRecordByBubbleIds(state.detailErrorById, bubblesById),
            timelineErrorById: pruneRecordByBubbleIds(state.timelineErrorById, bubblesById),
            actionLoadingById: pruneRecordByBubbleIds(state.actionLoadingById, bubblesById),
            actionErrorById: pruneRecordByBubbleIds(state.actionErrorById, bubblesById),
            actionRetryHintById: pruneRecordByBubbleIds(
              state.actionRetryHintById,
              bubblesById
            ),
            actionFailureById: pruneRecordByBubbleIds(state.actionFailureById, bubblesById)
          }));

          writePositions(storage, placement.positions, placement.positionSources);
          writeExpandedIds(storage, get().expandedBubbleIds);

          // Re-fetch details for any expanded bubbles that survived pruning
          const expandedIds = get().expandedBubbleIds;
          for (const expandedId of expandedIds) {
            void refreshExpandedBubble(expandedId);
          }

          const hadEventsClient = eventsClient !== null;
          const client = ensureEventsClient();
          if (hadEventsClient) {
            client.refresh();
          } else {
            client.start();
          }
        } catch (error) {
          if (initializeId !== latestInitializeId) {
            return;
          }
          set({
            isLoading: false,
            error: asMessage(error)
          });
        }
      },

      async toggleRepo(repoPath: string): Promise<void> {
        const state = get();
        const isSelected = state.selectedRepos.includes(repoPath);
        const selectedRepos = isSelected
          ? state.selectedRepos.filter((repo) => repo !== repoPath)
          : [...state.selectedRepos, repoPath];

        set({ selectedRepos, error: null });

        const shouldLoadRepo = !isSelected && !state.loadedRepos[repoPath];
        if (shouldLoadRepo) {
          try {
            await refreshRepos([repoPath]);
          } catch (error) {
            set({ error: asMessage(error) });
          }
        }

        if (eventsClient !== null) {
          eventsClient.refresh();
        }
      },

      setPosition(bubbleId: string, position: BubblePosition): void {
        set((state) => {
          const positions = {
            ...state.positions,
            [bubbleId]: position
          };
          const positionSources = {
            ...state.positionSources,
            [bubbleId]: "explicit" as const
          };
          return {
            positions,
            positionSources
          };
        });
      },

      persistPositions(bubbleId?: string): void {
        if (bubbleId !== undefined) {
          set((state) => {
            if (state.positions[bubbleId] === undefined) {
              return {};
            }
            return {
              positionSources: {
                ...state.positionSources,
                [bubbleId]: "explicit" as const
              }
            };
          });
        }
        writePositions(storage, get().positions, get().positionSources);
      },

      setCanvasViewport(viewport: ViewportRectangle | null): void {
        set((state) => {
          const placement = fillDefaultPositions(
            state.positions,
            state.positionSources,
            state.bubblesById,
            new Set(state.selectedRepos),
            state.expandedBubbleIds,
            viewport
          );
          return {
            canvasViewport: viewport,
            positions: placement.positions,
            positionSources: placement.positionSources
          };
        });
      },

      stopRealtime(): void {
        latestInitializeId += 1;
        latestAppliedEventId = 0;
        latestAppliedSnapshotTs = "";
        for (const bubbleId of expandedTimelineLagRetryTimerByBubble.keys()) {
          const timer = expandedTimelineLagRetryTimerByBubble.get(bubbleId);
          if (timer !== undefined) {
            clearTimeout(timer);
          }
        }
        expandedTimelineLagRetryTimerByBubble.clear();
        expandedTimelineLagRetryStateByBubble.clear();
        if (eventsClient !== null) {
          eventsClient.stop();
          eventsClient = null;
        }
      },

      async toggleBubbleExpanded(bubbleId: string): Promise<void> {
        const state = get();
        if (state.expandedBubbleIds.includes(bubbleId)) {
          // Collapse only toggles the display mode. Existing card coordinates stay fixed.
          const timer = expandedTimelineLagRetryTimerByBubble.get(bubbleId);
          if (timer !== undefined) {
            clearTimeout(timer);
          }
          expandedTimelineLagRetryTimerByBubble.delete(bubbleId);
          expandedTimelineLagRetryStateByBubble.delete(bubbleId);
          set({
            expandedBubbleIds: state.expandedBubbleIds.filter((id) => id !== bubbleId)
          });
          writeExpandedIds(storage, get().expandedBubbleIds);
          return;
        }

        if (state.bubblesById[bubbleId] === undefined) {
          return;
        }

        // Expand only toggles the display mode. We intentionally do not reflow already
        // positioned cards here, because users may have manually arranged the canvas.
        set({
          expandedBubbleIds: [...state.expandedBubbleIds, bubbleId]
        });
        writeExpandedIds(storage, get().expandedBubbleIds);
        await refreshExpandedBubble(bubbleId);
      },

      collapseBubble(bubbleId: string): void {
        const timer = expandedTimelineLagRetryTimerByBubble.get(bubbleId);
        if (timer !== undefined) {
          clearTimeout(timer);
        }
        expandedTimelineLagRetryTimerByBubble.delete(bubbleId);
        expandedTimelineLagRetryStateByBubble.delete(bubbleId);
        set((state) => ({
          expandedBubbleIds: state.expandedBubbleIds.filter((id) => id !== bubbleId)
        }));
        writeExpandedIds(storage, get().expandedBubbleIds);
      },

      async refreshExpandedBubble(bubbleId: string): Promise<void> {
        await refreshExpandedBubble(bubbleId);
      },

      async runBubbleAction(inputValue: RunBubbleActionInput): Promise<void> {
        const state = get();
        const bubble = state.bubblesById[inputValue.bubbleId];
        if (bubble === undefined) {
          throw new Error(`Bubble not found in UI store: ${inputValue.bubbleId}`);
        }

        set((current) => {
          const actionLoadingById = {
            ...current.actionLoadingById,
            [bubble.bubbleId]: true
          };
          const actionErrorById = { ...current.actionErrorById };
          const actionRetryHintById = { ...current.actionRetryHintById };
          const actionFailureById = { ...current.actionFailureById };
          delete actionErrorById[bubble.bubbleId];
          delete actionRetryHintById[bubble.bubbleId];
          delete actionFailureById[bubble.bubbleId];
          return {
            actionLoadingById,
            actionErrorById,
            actionRetryHintById,
            actionFailureById
          };
        });

        try {
          const result = await performBubbleAction(api, bubble, inputValue);

          if (inputValue.action === "update-review-policy" && result !== null) {
            const normalizedReviewPolicy = normalizeReviewPolicy(result.reviewPolicy);
            if (normalizedReviewPolicy !== null && result.activationChange === "none") {
              set((current) => {
                const currentBubble = current.bubblesById[bubble.bubbleId];
                if (currentBubble === undefined) {
                  return {};
                }

                const nextBubble = {
                  ...currentBubble,
                  reviewPolicy: normalizedReviewPolicy
                };
                const next: Partial<BubbleStoreState> = {
                  bubblesById: {
                    ...current.bubblesById,
                    [bubble.bubbleId]: nextBubble
                  }
                };
                const currentDetail = current.bubbleDetails[bubble.bubbleId];

                if (currentDetail !== undefined) {
                  next.bubbleDetails = {
                    ...current.bubbleDetails,
                    [bubble.bubbleId]: mergeExpandedDetailWithIncomingDetail(
                      currentDetail,
                      normalizeBubbleDetail({
                        ...currentDetail,
                        reviewPolicy: normalizedReviewPolicy,
                        bubbleToml: result.bubbleToml
                      })
                    )
                  };
                }

                return next;
              });
              return;
            }
          }

          await refreshRepos([bubble.repoPath]);
          if (get().expandedBubbleIds.includes(bubble.bubbleId)) {
            await refreshExpandedBubble(bubble.bubbleId);
          }
        } catch (error) {
          const message = asMessage(error);
          let refreshConfirmed = false;
          let usedConflictBubbleContext = false;
          let malformedConflictReviewPolicyPayload = false;

          if (error instanceof PairflowApiError && error.status === 409) {
            const reviewPolicyConflictContext =
              inputValue.action === "update-review-policy"
                ? extractReviewPolicyConflictContext(error)
                : null;

            if (reviewPolicyConflictContext !== null) {
              usedConflictBubbleContext = true;
              malformedConflictReviewPolicyPayload =
                reviewPolicyConflictContext.reviewPolicyPayloadState === "malformed";
              set((current) => {
                const currentDetail = current.bubbleDetails[bubble.bubbleId];
                const nextBubble = {
                  ...(current.bubblesById[bubble.bubbleId] ?? bubble),
                  ...(reviewPolicyConflictContext.currentState !== null
                    ? { state: reviewPolicyConflictContext.currentState }
                    : {}),
                  ...(reviewPolicyConflictContext.reviewPolicy !== null
                    ? { reviewPolicy: reviewPolicyConflictContext.reviewPolicy }
                    : {})
                };
                return {
                  bubblesById: {
                    ...current.bubblesById,
                    [bubble.bubbleId]: nextBubble
                  },
                  ...(currentDetail !== undefined
                    ? {
                        bubbleDetails: {
                          ...current.bubbleDetails,
                          [bubble.bubbleId]: mergeExpandedDetailWithIncomingDetail(
                            currentDetail,
                            normalizeBubbleDetail({
                              ...currentDetail,
                              ...(reviewPolicyConflictContext.currentState !== null
                                ? { state: reviewPolicyConflictContext.currentState }
                                : {}),
                              ...(reviewPolicyConflictContext.reviewPolicy !== null
                                ? {
                                    reviewPolicy:
                                      reviewPolicyConflictContext.reviewPolicy
                                  }
                                : {}),
                              bubbleToml: reviewPolicyConflictContext.bubbleToml
                            })
                          )
                        }
                      }
                    : {})
                };
              });
            } else {
              try {
                await refreshRepos([bubble.repoPath]);
                if (get().expandedBubbleIds.includes(bubble.bubbleId)) {
                  await refreshExpandedBubble(bubble.bubbleId);
                }
                refreshConfirmed = true;
              } catch {
                // Ignore secondary refresh failure and preserve original action error.
              }
            }
          }

          const retryHint =
            error instanceof PairflowApiError
              ? resolveActionRetryHint({
                  action: inputValue.action,
                  error,
                  usedConflictBubbleContext,
                  malformedConflictReviewPolicyPayload,
                  refreshConfirmed
                })
              : null;

          set((current) => {
            const actionErrorById = {
              ...current.actionErrorById,
              [bubble.bubbleId]: message
            };
            const actionFailureById = {
              ...current.actionFailureById,
              [bubble.bubbleId]: inputValue.action
            };

            if (retryHint === null) {
              const nextRetryHints = { ...current.actionRetryHintById };
              delete nextRetryHints[bubble.bubbleId];
              return {
                actionErrorById,
                actionFailureById,
                actionRetryHintById: nextRetryHints
              };
            }

            return {
              actionErrorById,
              actionFailureById,
              actionRetryHintById: {
                ...current.actionRetryHintById,
                [bubble.bubbleId]: retryHint
              }
            };
          });

          throw error;
        } finally {
          set((current) => {
            const actionLoadingById = { ...current.actionLoadingById };
            delete actionLoadingById[bubble.bubbleId];
            return {
              actionLoadingById
            };
          });
        }
      },

      async deleteBubble(
        bubbleId: string,
        force?: boolean,
        repoPathOverride?: string
      ): Promise<BubbleDeleteResult> {
        const state = get();
        const bubble = state.bubblesById[bubbleId];
        const repoPath = bubble?.repoPath ?? repoPathOverride;
        if (repoPath === undefined) {
          throw new Error(
            `Bubble not found in UI store: ${bubbleId}. Provide repoPathOverride for confirm-phase delete retries.`
          );
        }

        set((current) => {
          const actionLoadingById = {
            ...current.actionLoadingById,
            [bubbleId]: true
          };
          const actionErrorById = { ...current.actionErrorById };
          const actionRetryHintById = { ...current.actionRetryHintById };
          const actionFailureById = { ...current.actionFailureById };
          delete actionErrorById[bubbleId];
          delete actionRetryHintById[bubbleId];
          delete actionFailureById[bubbleId];
          return {
            actionLoadingById,
            actionErrorById,
            actionRetryHintById,
            actionFailureById
          };
        });

        try {
          const result = await api.deleteBubble(
            repoPath,
            bubbleId,
            force === true ? { force: true } : undefined
          );
          if (result.deleted) {
            try {
              await refreshRepos([repoPath]);
            } catch {
              // Refresh failures after successful delete are non-fatal.
            }
          }
          return result;
        } catch (error) {
          const message = asMessage(error);
          set((current) => ({
            actionErrorById: {
              ...current.actionErrorById,
              [bubbleId]: message
            },
            actionFailureById: {
              ...current.actionFailureById,
              [bubbleId]: "delete"
            },
            actionRetryHintById: (() => {
              const next = { ...current.actionRetryHintById };
              delete next[bubbleId];
              return next;
            })()
          }));
          throw error;
        } finally {
          set((current) => {
            const actionLoadingById = { ...current.actionLoadingById };
            delete actionLoadingById[bubbleId];
            return {
              actionLoadingById
            };
          });
        }
      },

      clearActionFeedback(bubbleId: string): void {
        set((state) => {
          const actionErrorById = { ...state.actionErrorById };
          const actionRetryHintById = { ...state.actionRetryHintById };
          const actionFailureById = { ...state.actionFailureById };
          delete actionErrorById[bubbleId];
          delete actionRetryHintById[bubbleId];
          delete actionFailureById[bubbleId];
          return {
            actionErrorById,
            actionRetryHintById,
            actionFailureById
          };
        });
      }
    };
  });

  return store;
}

const defaultBubbleStore = createBubbleStore();

export function useBubbleStore<T>(selector: (state: BubbleStoreState) => T): T {
  return useStore(defaultBubbleStore, selector);
}

export function useBubbleStoreApi(): StoreApi<BubbleStoreState> {
  return defaultBubbleStore;
}

export function selectVisibleBubbles(state: BubbleStoreState): BubbleCardModel[] {
  const selected = new Set(state.selectedRepos);
  return Object.values(state.bubblesById)
    .filter((bubble) => selected.has(bubble.repoPath))
    .sort((left, right) => left.bubbleId.localeCompare(right.bubbleId));
}
