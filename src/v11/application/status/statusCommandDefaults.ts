import type {
  ReadWatchdogPaneActivity
} from "../../shared/watchdog/watchdogPaneActivityStore.js";
import {
  readWatchdogPaneActivity as readWatchdogPaneActivityDefaults
} from "../../defaults/watchdog/watchdogPaneActivityDefaults.js";

export async function readWatchdogPaneActivity(
  ...args: Parameters<ReadWatchdogPaneActivity>
): Promise<Awaited<ReturnType<ReadWatchdogPaneActivity>>> {
  return readWatchdogPaneActivityDefaults(...args);
}
