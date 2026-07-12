import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { admitTemplate, loadTemplate } from "../definition/index.js";
import type { AdmittedTemplate, WorkflowTemplate } from "../domain/index.js";
import type { GateCatalog } from "../ports/index.js";
import { fixtureTemplate } from "./index.js";

/**
 * The MD-1 retirement pin (packet ch8-P2, M3): the canonical authoring
 * file is the SINGLE source of local-pair-v0; the testkit fixture is
 * equality-pinned to its parsed form FROM TESTS (tests may import
 * anything — the kit itself never imports definition/, ADR-005).
 *
 * RE-BOUND at the ADMITTED stage (packet ch11-P2c): `loadTemplate`
 * returns the ADMITTED value (since ch11-P2a), so both sides of the pin
 * pass through `admitTemplate` — the ch8-P2 meaning (canonical file ≡
 * fixture) is preserved SAME-STAGE and survives P4 (when both sides gain
 * the round declaration). The stub catalog is INLINE and never resolves
 * (the G1 eslint ban covers src/testkit/** — no gates/ import); the
 * fixture is gate-free, so admission is vacuous on the gate axis.
 */
function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, { resolve: () => null } satisfies GateCatalog);
  if (!result.ok) {
    throw new Error(`fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

describe("testkit fixtureTemplate — the canonical-file equality pin (packet ch8-P2)", () => {
  it("the canonical file parses through the real pipeline to the exact fixture value (admitted stage)", () => {
    const canonicalPath = join(process.cwd(), "templates", "local-pair-v0@1.yaml");
    const result = loadTemplate(new Uint8Array(readFileSync(canonicalPath)), {
      path: canonicalPath,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.template).toEqual(admit(fixtureTemplate()));
    }
  });
});
