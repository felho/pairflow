import { describe, expect, it } from "vitest";

import {
  getBubbleReconcileHelpText,
  parseBubbleReconcileCommandOptions,
  renderBubbleReconcileText,
  runBubbleReconcileCommand
} from "../../../../src/cli/commands/bubble/reconcile.js";
import {
  getBubbleReconcileHelpText as getBubbleReconcileHelpTextV11,
  parseBubbleReconcileCommandOptions as parseBubbleReconcileCommandOptionsV11,
  renderBubbleReconcileText as renderBubbleReconcileTextV11,
  runBubbleReconcileCommand as runBubbleReconcileCommandV11
} from "../../../../src/v11/application/reconcile/reconcileCliCommand.js";

describe("reconcile CLI entrypoint parity", () => {
  it("keeps legacy CLI reconcile exports routed to v11 entrypoint", () => {
    expect(getBubbleReconcileHelpText).toBe(getBubbleReconcileHelpTextV11);
    expect(parseBubbleReconcileCommandOptions).toBe(
      parseBubbleReconcileCommandOptionsV11
    );
    expect(renderBubbleReconcileText).toBe(renderBubbleReconcileTextV11);
    expect(runBubbleReconcileCommand).toBe(runBubbleReconcileCommandV11);
  });
});
