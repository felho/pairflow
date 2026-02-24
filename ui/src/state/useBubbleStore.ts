import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";

import { createApiClient, type PairflowApiClient } from "../lib/api";
import {
  createRealtimeEventsClient,
  type RealtimeEventsClient,
  type RealtimeEventsClientInput
} from "../lib/events";
import {
  emptyStateCounts,
  type BubbleCardModel,
  type BubblePosition,
  type ConnectionStatus,
  type UiBubbleSummary,
  type UiEvent,
  type UiRepoSummary,
  type UiSnapshotEvent,
  type UiStateCounts
} from "../lib/types";

const positionsStorageKey = "pairflow.ui.canvas.positions.v1";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface RepoBubblesPayload {
  repo: UiRepoSummary;
  bubbles: UiBubbleSummary[];
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
  initialize(): Promise<void>;
  toggleRepo(repoPath: string): Promise<void>;
  setPosition(bubbleId: string, position: BubblePosition): void;
  persistPositions(): void;
  stopRealtime(): void;
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

async function fetchRepoPayloads(
  api: PairflowApiClient,
  repos: string[]
): Promise<RepoBubblesPayload[]> {
  return Promise.all(repos.map((repoPath) => api.getBubbles(repoPath)));
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
    const applyEvent = (event: UiEvent): void => {
      set((state) => {
        switch (event.type) {
          case "snapshot": {
            const repoSummaries = { ...state.repoSummaries };
            for (const repo of event.repos) {
              repoSummaries[repo.repoPath] = repo;
            }

            const bubblesById = mergeSnapshot(state.bubblesById, event);
            const positions = prunePositions(state.positions, bubblesById);
            return {
              repoSummaries,
              bubblesById,
              positions
            };
          }
          case "bubble.updated": {
            const bubblesById = {
              ...state.bubblesById,
              [event.bubbleId]: toBubbleCardModel(event.bubble)
            };
            return {
              bubblesById
            };
          }
          case "bubble.removed": {
            const bubblesById = removeBubble(state.bubblesById, event.bubbleId);
            const positions = prunePositions(state.positions, bubblesById);
            return {
              bubblesById,
              positions
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

        return {
          bubblesById,
          repoSummaries,
          loadedRepos,
          positions
        };
      });

      writePositions(storage, get().positions);
    };

    const ensureEventsClient = (): RealtimeEventsClient => {
      if (eventsClient !== null) {
        return eventsClient;
      }

      eventsClient = createEventsClient({
        getRepos: () => get().selectedRepos,
        onEvent: applyEvent,
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

          set({
            repos,
            selectedRepos,
            bubblesById,
            repoSummaries,
            loadedRepos,
            positions,
            isLoading: false,
            error: null
          });

          writePositions(storage, positions);

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

      stopRealtime(): void {
        latestInitializeId += 1;
        if (eventsClient !== null) {
          eventsClient.stop();
          eventsClient = null;
        }
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
