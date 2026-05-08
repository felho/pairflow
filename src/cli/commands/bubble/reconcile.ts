import { readStateSnapshot } from "../../../v11/defaults/state/stateStoreDefaults.js";
import {
  reconcileRuntimeSessionsDefaultDependencies
} from "../../../v11/defaults/reconcile/reconcileCommandDefaults.js";
import {
  runBubbleReconcileCommand as runApplicationBubbleReconcileCommand,
  type BubbleReconcileCommandDependencies,
  type BubbleReconcileCommandOptions
} from "../../../v11/application/reconcile/reconcileCliCommand.js";
import {
  reconcileRuntimeSessions
} from "../../../v11/application/reconcile/reconcileCommandApi.js";

export {
  getBubbleReconcileHelpText,
  parseBubbleReconcileCommandOptions,
  renderBubbleReconcileText
} from "../../../v11/application/reconcile/reconcileCliCommand.js";
export type {
  BubbleReconcileCommandDependencies,
  BubbleReconcileCommandOptions,
  BubbleReconcileHelpCommandOptions,
  ParsedBubbleReconcileCommandOptions
} from "../../../v11/application/reconcile/reconcileCliCommand.js";

const reconcileRuntimeSessionDefaults = {
  ...reconcileRuntimeSessionsDefaultDependencies,
  readStateSnapshot
};

export function runBubbleReconcileCommand(
  args: string[] | BubbleReconcileCommandOptions,
  cwd: string = process.cwd(),
  dependencies: BubbleReconcileCommandDependencies = {}
) {
  return runApplicationBubbleReconcileCommand(args, cwd, {
    reconcileRuntimeSessions:
      dependencies.reconcileRuntimeSessions ??
      ((input) => reconcileRuntimeSessions(input, reconcileRuntimeSessionDefaults))
  });
}
