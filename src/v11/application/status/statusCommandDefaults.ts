import type {
  ReadWatchdogPaneActivity
} from "../../shared/watchdog/watchdogPaneActivityStore.js";
import type { ReadWatchdogPaneActivityPort } from "../../shared/ports/watchdogPaneActivity.js";

type WatchdogPaneActivityDefaultsModule = {
  readWatchdogPaneActivity: ReadWatchdogPaneActivityPort;
};

let watchdogPaneActivityDefaultsPromise:
  | Promise<WatchdogPaneActivityDefaultsModule>
  | undefined;

function getWatchdogPaneActivityDefaultsModulePath(): string {
  return [
    "..",
    "..",
    "defaults",
    "watchdog",
    "watchdogPaneActivityDefaults.js"
  ].join("/");
}

async function loadWatchdogPaneActivityDefaults(): Promise<WatchdogPaneActivityDefaultsModule> {
  watchdogPaneActivityDefaultsPromise ??= import(
    getWatchdogPaneActivityDefaultsModulePath()
  ) as Promise<WatchdogPaneActivityDefaultsModule>;
  return watchdogPaneActivityDefaultsPromise;
}

export async function readWatchdogPaneActivity(
  ...args: Parameters<ReadWatchdogPaneActivity>
): Promise<Awaited<ReturnType<ReadWatchdogPaneActivity>>> {
  const defaults = await loadWatchdogPaneActivityDefaults();
  return defaults.readWatchdogPaneActivity(...args);
}
