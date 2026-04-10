import {
  readWatchdogPaneActivity as readWatchdogPaneActivityCanonical,
  writeWatchdogPaneActivity as writeWatchdogPaneActivityCanonical
} from "../../infrastructure/artifact/watchdog/watchdogPaneActivityStore.js";
import type {
  ReadWatchdogPaneActivityPort,
  WriteWatchdogPaneActivityPort
} from "../../shared/ports/watchdogPaneActivity.js";

export const readWatchdogPaneActivity: ReadWatchdogPaneActivityPort = async (
  ...args
) => readWatchdogPaneActivityCanonical(...args);

export const writeWatchdogPaneActivity: WriteWatchdogPaneActivityPort = async (
  ...args
) => writeWatchdogPaneActivityCanonical(...args);
