import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";

import {
  createApiClient,
  PairflowApiError,
  type PairflowApiClient
} from "../lib/api";
import {
  createRealtimeEventsClient,
  type RealtimeEventsClient,
  type RealtimeEventsClientInput
} from "../lib/events";
import type {
  BubbleActionKind,
  BubbleCardModel,
  BubbleDeleteResult,
  BubblePosition,
  CommitActionInput,
  ConnectionStatus,
  MergeActionInput,
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiSnapshotEvent,
  UiStateCounts,
  UiTimelineEntry
} from "../lib/types";
import { emptyStateCounts } from "../lib/types";

const positionsStorageKey = "pairflow.ui.canvas.positions.v1";
const expandedIdsStorageKey = "pairflow.ui.canvas.expandedIds.v1";
const expandedPositionsStorageKey = "pairflow.ui.canvas.expandedPositions.v1";

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
  auto?: boolean;
  push?: boolean;
  deleteRemote?: boolean;
}

export interface BubbleStoreState {
  repos: string[];
  selectedRepos: string[];
  bubblesById: Record<string, BubbleCardModel>;
  repoSummaries: Record<string, UiRepoSummary>;
  loadedRepos: Record<string, boolean>;
  positions: Record<string, BubblePosition>;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  expandedBubbleIds: string[];
  expandedPositions: Record<string, BubblePosition>;
  bubbleDetails: Record<string, UiBubbleDetail>;
  bubbleTimelines: Record<string, UiTimelineEntry[]>;
  detailLoadingById: Record<string, boolean>;
  timelineLoadingById: Record<string, boolean>;
  detailErrorById: Record<string, string>;
  timelineErrorById: Record<string, string>;
  actionLoadingById: Record<string, boolean>;
  actionErrorById: Record<string, string>;
  actionRetryHintById: Record<string, string>;
  actionFailureById: Record<string, BubbleActionKind>;
  initialize(): Promise<void>;
  toggleRepo(repoPath: string): Promise<void>;
  setPosition(bubbleId: string, position: BubblePosition): void;
  persistPositions(): void;
  setExpandedPosition(bubbleId: string, position: BubblePosition): void;
  persistExpandedPositions(): void;
  stopRealtime(): void;
  toggleBubbleExpanded(bubbleId: string): Promise<void>;
  collapseBubble(bubbleId: string): void;
  refreshExpandedBubble(bubbleId: string): Promise<void>;
  runBubbleAction(input: RunBubbleActionInput): Promise<void>;
  // repoPathOverride is required for confirm-phase deletes when the bubble was
  // concurrently removed from bubblesById by realtime events.
  deleteBubble(
    bubbleId: string,
    force?: boolean,
    repoPathOverride?: string
  ): Promise<BubbleDeleteResult>;
  clearActionFeedback(bubbleId: string): void;
}

export interface BubbleStoreDependencies {
  api?: PairflowApiClient;
  createEventsClient?: (input: RealtimeEventsClientInput) => RealtimeEventsClient;
  storage?: StorageLike | null;
  pollingIntervalMs?: number;
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toBubbleCardModel(bubble: UiBubbleSummary): BubbleCardModel {
  return {
    ...bubble,
    hasRuntimeSession: bubble.runtimeSession !== null
  };
}

function toBubbleCardModelFromDetail(detail: UiBubbleDetail): BubbleCardModel {
  return toBubbleCardModel(detail);
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

function writePositions(
  storage: StorageLike | null,
  positions: Record<string, BubblePosition>
): void {
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(positionsStorageKey, JSON.stringify(positions));
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

function readExpandedPositions(storage: StorageLike | null): Record<string, BubblePosition> {
  if (storage === null) {
    return {};
  }
  try {
    const raw = storage.getItem(expandedPositionsStorageKey);
    if (raw === null || raw.trim().length === 0) {
      return {};
    }
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
      result[key] = { x, y };
    }
    return result;
  } catch {
    return {};
  }
}

function writeExpandedPositions(
  storage: StorageLike | null,
  positions: Record<string, BubblePosition>
): void {
  if (storage === null) {
    return;
  }
  try {
    storage.setItem(expandedPositionsStorageKey, JSON.stringify(positions));
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
): Promise<void> {
  switch (input.action) {
    case "start":
      await api.startBubble(bubble.repoPath, bubble.bubbleId);
      return;
    case "approve":
      await api.approveBubble(bubble.repoPath, bubble.bubbleId, {
        ...(input.refs !== undefined ? { refs: input.refs } : {})
      });
      return;
    case "request-rework": {
      const message = input.message?.trim() ?? "";
      if (message.length === 0) {
        throw new Error("Request rework requires a message.");
      }
      await api.requestRework(bubble.repoPath, bubble.bubbleId, {
        message,
        ...(input.refs !== undefined ? { refs: input.refs } : {})
      });
      return;
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
      return;
    }
    case "resume":
      await api.resumeBubble(bubble.repoPath, bubble.bubbleId);
      return;
    case "commit": {
      const commitInput: CommitActionInput = {
        auto: input.auto ?? true,
        ...(input.message !== undefined && input.message.trim().length > 0
          ? { message: input.message.trim() }
          : {}),
        ...(input.refs !== undefined && input.refs.length > 0
          ? { refs: input.refs }
          : {})
      };
      await api.commitBubble(bubble.repoPath, bubble.bubbleId, commitInput);
      return;
    }
    case "merge": {
      const mergeInput: MergeActionInput = {
        ...(input.push !== undefined ? { push: input.push } : {}),
        ...(input.deleteRemote !== undefined
          ? { deleteRemote: input.deleteRemote }
          : {})
      };
      await api.mergeBubble(bubble.repoPath, bubble.bubbleId, mergeInput);
      return;
    }
    case "open":
      await api.openBubble(bubble.repoPath, bubble.bubbleId);
      return;
    case "attach":
      await api.attachBubble(bubble.repoPath, bubble.bubbleId);
      return;
    case "stop":
      await api.stopBubble(bubble.repoPath, bubble.bubbleId);
      return;
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

  const store = createStore<BubbleStoreState>((set, get) => {
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
        next[bubbleId] = {
          ...detail,
          ...bubble
        };
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
        const repoSummaries = { ...state.repoSummaries };
        const loadedRepos = { ...state.loadedRepos };

        for (const payload of payloads) {
          repoSummaries[payload.repo.repoPath] = payload.repo;
          loadedRepos[payload.repo.repoPath] = true;
        }

        const positions = prunePositions(state.positions, bubblesById);
        const bubbleDetails = syncExpandedFromSummary(state.bubbleDetails, bubblesById);

        return {
          bubblesById,
          repoSummaries,
          loadedRepos,
          positions,
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
          expandedBubbleIds: state.expandedBubbleIds.filter(
            (id) => bubblesById[id] !== undefined
          ),
          expandedPositions: prunePositions(state.expandedPositions, bubblesById)
        };
      });

      writePositions(storage, get().positions);
      writeExpandedIds(storage, get().expandedBubbleIds);
      writeExpandedPositions(storage, get().expandedPositions);
    };

    const refreshExpandedBubble = async (bubbleId: string): Promise<void> => {
      const bubble = get().bubblesById[bubbleId];
      if (bubble === undefined) {
        return;
      }

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

      set((state) => {
        const detailLoadingById = { ...state.detailLoadingById };
        const timelineLoadingById = { ...state.timelineLoadingById };
        delete detailLoadingById[bubbleId];
        delete timelineLoadingById[bubbleId];

        const next: Partial<BubbleStoreState> = {
          detailLoadingById,
          timelineLoadingById
        };

        if (detailResult.status === "fulfilled") {
          const detail = detailResult.value;
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
            [bubbleId]: asMessage(detailResult.reason)
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
    };

    const ensureEventsClient = (): RealtimeEventsClient => {
      if (eventsClient !== null) {
        return eventsClient;
      }

      eventsClient = createEventsClient({
        getRepos: () => get().selectedRepos,
        onEvent: (event) => {
          set((state) => {
            switch (event.type) {
              case "snapshot": {
                const repoSummaries = { ...state.repoSummaries };
                for (const repo of event.repos) {
                  repoSummaries[repo.repoPath] = repo;
                }

                const bubblesById = mergeSnapshot(state.bubblesById, event);
                const positions = prunePositions(state.positions, bubblesById);
                const bubbleDetails = syncExpandedFromSummary(
                  state.bubbleDetails,
                  bubblesById
                );
                return {
                  repoSummaries,
                  bubblesById,
                  positions,
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
                  expandedBubbleIds: state.expandedBubbleIds.filter(
                    (id) => bubblesById[id] !== undefined
                  ),
                  expandedPositions: prunePositions(state.expandedPositions, bubblesById)
                };
              }
              case "bubble.updated": {
                const bubblesById = {
                  ...state.bubblesById,
                  [event.bubbleId]: toBubbleCardModel(event.bubble)
                };
                const existingDetail = state.bubbleDetails[event.bubbleId];
                const bubbleDetails =
                  existingDetail === undefined
                    ? state.bubbleDetails
                    : {
                        ...state.bubbleDetails,
                        [event.bubbleId]: {
                          ...existingDetail,
                          ...event.bubble
                        }
                      };
                return {
                  bubblesById,
                  bubbleDetails
                };
              }
              case "bubble.removed": {
                const bubblesById = removeBubble(state.bubblesById, event.bubbleId);
                const positions = prunePositions(state.positions, bubblesById);
                return {
                  bubblesById,
                  positions,
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
                  ),
                  expandedPositions: prunePositions(state.expandedPositions, bubblesById)
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

          writePositions(storage, get().positions);
          writeExpandedIds(storage, get().expandedBubbleIds);
          writeExpandedPositions(storage, get().expandedPositions);

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
          set({ connectionStatus: status });
        },
        onPollingError: (error) => {
          set({
            error: `Polling refresh failed: ${asMessage(error)}`
          });
        },
        poll: async (repos) => {
          if (repos.length === 0) {
            return;
          }
          await refreshRepos(repos);
        },
        ...(dependencies.pollingIntervalMs !== undefined
          ? { pollingIntervalMs: dependencies.pollingIntervalMs }
          : {})
      });
      return eventsClient;
    };

    return {
      repos: [],
      selectedRepos: [],
      bubblesById: {},
      repoSummaries: {},
      loadedRepos: {},
      positions: readPositions(storage),
      connectionStatus: "idle",
      isLoading: false,
      error: null,
      expandedBubbleIds: readExpandedIds(storage),
      expandedPositions: readExpandedPositions(storage),
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
        set({ isLoading: true, error: null });

        try {
          const repos = await api.getRepos();
          if (initializeId !== latestInitializeId) {
            return;
          }
          const priorSelected = get().selectedRepos;
          const selectedRepos =
            priorSelected.length > 0
              ? priorSelected.filter((repo) => repos.includes(repo))
              : [...repos];

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

          const positions = prunePositions(get().positions, bubblesById);

          set((state) => ({
            repos,
            selectedRepos,
            bubblesById,
            repoSummaries,
            loadedRepos,
            positions,
            isLoading: false,
            error: null,
            expandedBubbleIds: state.expandedBubbleIds.filter(
              (id) => bubblesById[id] !== undefined
            ),
            expandedPositions: prunePositions(state.expandedPositions, bubblesById),
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

          writePositions(storage, positions);
          writeExpandedIds(storage, get().expandedBubbleIds);
          writeExpandedPositions(storage, get().expandedPositions);

          // Re-fetch details for any expanded bubbles that survived pruning
          const expandedIds = get().expandedBubbleIds;
          for (const expandedId of expandedIds) {
            void refreshExpandedBubble(expandedId);
          }

          const client = ensureEventsClient();
          client.start();
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
          return {
            positions
          };
        });
      },

      persistPositions(): void {
        writePositions(storage, get().positions);
      },

      setExpandedPosition(bubbleId: string, position: BubblePosition): void {
        set((state) => ({
          expandedPositions: {
            ...state.expandedPositions,
            [bubbleId]: position
          }
        }));
      },

      persistExpandedPositions(): void {
        writeExpandedPositions(storage, get().expandedPositions);
      },

      stopRealtime(): void {
        latestInitializeId += 1;
        if (eventsClient !== null) {
          eventsClient.stop();
          eventsClient = null;
        }
      },

      async toggleBubbleExpanded(bubbleId: string): Promise<void> {
        const state = get();
        if (state.expandedBubbleIds.includes(bubbleId)) {
          // Collapse
          set({
            expandedBubbleIds: state.expandedBubbleIds.filter((id) => id !== bubbleId)
          });
          writeExpandedIds(storage, get().expandedBubbleIds);
          return;
        }

        if (state.bubblesById[bubbleId] === undefined) {
          return;
        }

        // Expand
        set({
          expandedBubbleIds: [...state.expandedBubbleIds, bubbleId]
        });
        writeExpandedIds(storage, get().expandedBubbleIds);
        await refreshExpandedBubble(bubbleId);
      },

      collapseBubble(bubbleId: string): void {
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
          await performBubbleAction(api, bubble, inputValue);
          await refreshRepos([bubble.repoPath]);
          if (get().expandedBubbleIds.includes(bubble.bubbleId)) {
            await refreshExpandedBubble(bubble.bubbleId);
          }
        } catch (error) {
          const message = asMessage(error);
          let retryHint: string | null = null;

          if (error instanceof PairflowApiError && error.status === 409) {
            if (inputValue.action === "open" || inputValue.action === "attach") {
              // Open/attach are not state-changing actions; show the actual error
              // message instead of the generic "state changed" retry hint.
              retryHint = null;
            } else {
              retryHint =
                "State changed in CLI/UI. Latest state was refetched. Review state, then retry.";
            }
            try {
              await refreshRepos([bubble.repoPath]);
              if (get().expandedBubbleIds.includes(bubble.bubbleId)) {
                await refreshExpandedBubble(bubble.bubbleId);
              }
            } catch {
              // Ignore secondary refresh failure and preserve original action error.
            }
          }

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

export function selectStateCounts(state: BubbleStoreState): UiStateCounts {
  const visibleBubbles = selectVisibleBubbles(state);
  const counts = emptyStateCounts();
  for (const bubble of visibleBubbles) {
    counts[bubble.state] += 1;
  }
  return counts;
}
