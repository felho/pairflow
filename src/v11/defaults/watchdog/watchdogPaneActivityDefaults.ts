import {
  readWatchdogPaneActivity as readWatchdogPaneActivityCanonical,
  removeWatchdogPaneActivity as removeWatchdogPaneActivityCanonical,
  writeWatchdogPaneActivity as writeWatchdogPaneActivityCanonical
} from "../../infrastructure/artifact/watchdog/watchdogPaneActivityStore.js";
import type {
  RemoveWatchdogPaneActivityPort,
  ReadWatchdogPaneActivityPort,
  WriteWatchdogPaneActivityPort
} from "../../ports/watchdogPaneActivity.js";

export const readWatchdogPaneActivity: ReadWatchdogPaneActivityPort = async (
  ...args
) => readWatchdogPaneActivityCanonical(...args);

export const writeWatchdogPaneActivity: WriteWatchdogPaneActivityPort = async (
  ...args
) => writeWatchdogPaneActivityCanonical(...args);

export const removeWatchdogPaneActivity: RemoveWatchdogPaneActivityPort = async (
  ...args
) => removeWatchdogPaneActivityCanonical(...args);
