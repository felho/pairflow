let watchdogCommandDefaultsPromise:
  | Promise<typeof import("../../../core/watchdog/watchdogCommandDefaults.js")["watchdogCommandDefaults"]>
  | undefined;

let watchdogPendingReworkDefaultsPromise:
  | Promise<typeof import("../../../core/watchdog/watchdogPendingReworkDefaults.js")["watchdogPendingReworkDefaults"]>
  | undefined;

export async function loadWatchdogCommandDefaults() {
  watchdogCommandDefaultsPromise ??= import(
    "../../../core/watchdog/watchdogCommandDefaults.js"
  ).then(({ watchdogCommandDefaults }) => watchdogCommandDefaults);
  return watchdogCommandDefaultsPromise;
}

export async function loadWatchdogPendingReworkDefaults() {
  watchdogPendingReworkDefaultsPromise ??= import(
    "../../../core/watchdog/watchdogPendingReworkDefaults.js"
  ).then(({ watchdogPendingReworkDefaults }) => watchdogPendingReworkDefaults);
  return watchdogPendingReworkDefaultsPromise;
}
