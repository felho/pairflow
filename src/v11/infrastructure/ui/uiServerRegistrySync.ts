import { watch, type FSWatcher } from "node:fs";
import type { UiEventsBroker } from "./events.js";
import type { UiRepoScope } from "./repoScope.js";
import { fileSignature, pathExists } from "./uiServerAssets.js";

interface UiServerRegistrySyncController {
  close(): Promise<void>;
}

interface UiServerRegistrySyncState {
  closing: boolean;
  requestedVersion: number;
  appliedVersion: number;
  promise: Promise<void> | null;
  watchTimer: NodeJS.Timeout | null;
  watcher: FSWatcher | null;
  lastSignature: string | null;
}

function createUiServerRegistrySyncState(): UiServerRegistrySyncState {
  return {
    closing: false,
    requestedVersion: 0,
    appliedVersion: 0,
    promise: null,
    watchTimer: null,
    watcher: null,
    lastSignature: null
  };
}

async function runUiServerRegistrySyncLoop(input: {
  state: UiServerRegistrySyncState;
  events: UiEventsBroker;
  refreshFromRegistry: () => ReturnType<NonNullable<UiRepoScope["refreshFromRegistry"]>>;
}): Promise<void> {
  while (!input.state.closing && input.state.appliedVersion < input.state.requestedVersion) {
    const requestVersion = input.state.requestedVersion;
    let refreshed = false;
    try {
      const diff = await input.refreshFromRegistry();
      refreshed = true;
      for (const removed of diff.removed) {
        try {
          await input.events.removeRepo(removed);
        } catch (error) {
          console.error(
            `Failed to remove UI events repo after registry refresh: ${removed}`,
            error
          );
        }
      }
      for (const added of diff.added) {
        try {
          await input.events.addRepo(added);
        } catch (error) {
          console.error(
            `Failed to add UI events repo after registry refresh: ${added}`,
            error
          );
        }
      }
      await input.events.refreshNow();
    } finally {
      if (refreshed) {
        input.state.appliedVersion = Math.max(input.state.appliedVersion, requestVersion);
      } else if (input.state.appliedVersion < requestVersion) {
        input.state.requestedVersion = Math.max(input.state.requestedVersion, requestVersion);
      }
    }
  }
}

function createUiServerRegistryRefreshScheduler(input: {
  state: UiServerRegistrySyncState;
  events: UiEventsBroker;
  refreshFromRegistry: () => ReturnType<NonNullable<UiRepoScope["refreshFromRegistry"]>>;
}): () => void {
  return () => {
    if (input.state.closing) {
      return;
    }
    input.state.requestedVersion += 1;
    if (input.state.promise !== null) {
      return;
    }
    input.state.promise = runUiServerRegistrySyncLoop({
      state: input.state,
      events: input.events,
      refreshFromRegistry: input.refreshFromRegistry
    })
      .catch((error) => {
        console.error("Failed to refresh UI repo scope from registry", error);
      })
      .finally(() => {
        input.state.promise = null;
        if (
          !input.state.closing &&
          input.state.appliedVersion < input.state.requestedVersion
        ) {
          void createUiServerRegistryRefreshScheduler({
            state: input.state,
            events: input.events,
            refreshFromRegistry: input.refreshFromRegistry
          })();
        }
      });
  };
}

function createUiServerRegistryWatcher(input: {
  state: UiServerRegistrySyncState;
  registryPath: string;
  scheduleRegistryRefresh: () => void;
}): void {
  void (async () => {
    input.state.lastSignature = await fileSignature(input.registryPath);
    if (await pathExists(input.registryPath)) {
      input.state.watcher = watch(input.registryPath, () => {
        if (input.state.watchTimer !== null) {
          clearTimeout(input.state.watchTimer);
        }
        input.state.watchTimer = setTimeout(() => {
          input.state.watchTimer = null;
          void (async () => {
            const nextSignature = await fileSignature(input.registryPath);
            if (nextSignature === input.state.lastSignature) {
              return;
            }
            input.state.lastSignature = nextSignature;
            input.scheduleRegistryRefresh();
          })().catch((error) => {
            console.error("Failed to schedule UI repo registry refresh", error);
          });
        }, 100);
      });
      input.state.watcher.on("error", (error) => {
        console.error("UI repo registry watcher error", error);
      });
    }
  })().catch((error) => {
    console.error("Failed to initialize UI repo registry watcher", error);
  });
}

export function createUiServerRegistrySyncController(input: {
  repoScope: UiRepoScope;
  events: UiEventsBroker;
}): UiServerRegistrySyncController {
  const state = createUiServerRegistrySyncState();

  const refreshFromRegistry = input.repoScope.refreshFromRegistry;
  if (typeof refreshFromRegistry !== "function") {
    return {
      async close(): Promise<void> {
        state.closing = true;
        await Promise.resolve();
      }
    };
  }

  const registryPath = input.repoScope.registryPath;
  if (registryPath === undefined) {
    return {
      async close(): Promise<void> {
        state.closing = true;
        await Promise.resolve();
      }
    };
  }

  const scheduleRegistryRefresh = createUiServerRegistryRefreshScheduler({
    state,
    events: input.events,
    refreshFromRegistry
  });
  createUiServerRegistryWatcher({
    state,
    registryPath,
    scheduleRegistryRefresh
  });
  return {
    async close(): Promise<void> {
      state.closing = true;
      if (state.watchTimer !== null) {
        clearTimeout(state.watchTimer);
        state.watchTimer = null;
      }
      state.watcher?.close();
      state.watcher = null;
      await state.promise;
    }
  };
}
