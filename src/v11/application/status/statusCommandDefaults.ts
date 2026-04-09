import type {
  ReadWatchdogPaneActivity
} from "../../shared/watchdog/watchdogPaneActivityStore.js";

let watchdogPaneActivityStorePromise:
  | Promise<{ readWatchdogPaneActivity: ReadWatchdogPaneActivity }>
  | undefined;

async function loadWatchdogPaneActivityStore(): Promise<{
  readWatchdogPaneActivity: ReadWatchdogPaneActivity;
}> {
  watchdogPaneActivityStorePromise ??= import(
    "../../../core/watchdog/watchdogPaneActivityStore.js"
  );
  return watchdogPaneActivityStorePromise;
}

export async function readWatchdogPaneActivity(
  ...args: Parameters<ReadWatchdogPaneActivity>
): Promise<Awaited<ReturnType<ReadWatchdogPaneActivity>>> {
  const { readWatchdogPaneActivity: readWatchdogPaneActivityImpl } =
    await loadWatchdogPaneActivityStore();
  return readWatchdogPaneActivityImpl(...args);
}
