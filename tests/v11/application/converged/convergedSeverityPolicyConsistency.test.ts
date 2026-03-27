import { describe, expect, it } from "vitest";

import { findingSeverities } from "../../../../src/types/findings.js";
import { normalizeConvergedCommandInput } from "../../../../src/v11/shared/converged/convergedCommandInputNormalization.js";
import { convergedBlockerFindingsForbiddenReasonCode } from "../../../../src/v11/shared/converged/convergedCommandReasonCodes.js";
import {
  convergedStructuredFindingSeverities,
  isConvergedStructuredFindingSeverity
} from "../../../../src/v11/shared/converged/convergedCommandTypes.js";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return `${input.reasonCode !== undefined ? `${input.reasonCode}: ` : ""}${input.message}`;
}

class SyntheticConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticConvergedCommandError";
  }
}

describe("converged severity policy consistency", () => {
  it("keeps the exported converged severity allowlist aligned with non-blocker finding severities", () => {
    expect([...convergedStructuredFindingSeverities]).toEqual(
      findingSeverities.filter((severity) => severity !== "P0" && severity !== "P1")
    );
  });

  it("keeps the severity predicate aligned with the exported allowlist", () => {
    for (const severity of findingSeverities) {
      expect(isConvergedStructuredFindingSeverity(severity)).toBe(
        convergedStructuredFindingSeverities.includes(
          severity as (typeof convergedStructuredFindingSeverities)[number]
        )
      );
    }
    expect(isConvergedStructuredFindingSeverity("P9")).toBe(false);
  });

  it("accepts only allowlisted severities and keeps blocker rejection reason code stable", () => {
    for (const severity of findingSeverities) {
      if (isConvergedStructuredFindingSeverity(severity)) {
        const normalized = normalizeConvergedCommandInput({
          summary: "ready",
          findings: [
            {
              severity,
              title: `${severity} allowed`
            }
          ],
          createError: (input) =>
            new SyntheticConvergedCommandError(toErrorMessage(input))
        });

        expect(normalized.findings).toEqual([
          {
            severity,
            title: `${severity} allowed`
          }
        ]);
        continue;
      }

      expect(() =>
        normalizeConvergedCommandInput({
          summary: "ready",
          findings: [
            {
              severity: severity as never,
              title: `${severity} blocked`
            }
          ],
          createError: (input) =>
            new SyntheticConvergedCommandError(toErrorMessage(input))
        })
      ).toThrow(convergedBlockerFindingsForbiddenReasonCode);
    }
  });
});
