import { readFile as nodeReadFile } from "node:fs/promises";

import type {
  LinkedBubbleStatusPortInput,
  LinkedBubbleTriggerDiagnostic,
  LinkedBubbleTriggerIndexDependencies
} from "../../application/planWatch/linkedBubbleTriggerIndexContract.js";

export const linkedBubbleTriggerIndexDefaults: LinkedBubbleTriggerIndexDependencies = {
  readFile: (path) => nodeReadFile(path, "utf8"),
  getBubbleStatus: missingLinkedBubbleStatusPort
};

function missingLinkedBubbleStatusPort(
  input: LinkedBubbleStatusPortInput
): Promise<LinkedBubbleTriggerDiagnostic> {
  void input;
  return Promise.resolve({
    kind: "linked_bubble_trigger_diagnostic",
    scope: "bubble",
    code: "BUBBLE_STATUS_UNAVAILABLE",
    severity: "error",
    message:
      "No linked bubble status port was provided; exact-id status lookup is required."
  });
}
