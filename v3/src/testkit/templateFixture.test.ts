import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadTemplate } from "../definition/index.js";
import { fixtureTemplate } from "./index.js";

/**
 * The MD-1 retirement pin (packet ch8-P2, M3): the canonical authoring
 * file is the SINGLE source of local-pair-v0; the testkit fixture is
 * equality-pinned to its parsed form FROM TESTS (tests may import
 * anything — the kit itself never imports definition/, ADR-005).
 */
describe("testkit fixtureTemplate — the canonical-file equality pin (packet ch8-P2)", () => {
  it("the canonical file parses through the real pipeline to the exact fixture value", () => {
    const canonicalPath = join(process.cwd(), "templates", "local-pair-v0@1.yaml");
    const result = loadTemplate(new Uint8Array(readFileSync(canonicalPath)), {
      path: canonicalPath,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.template).toEqual(fixtureTemplate());
    }
  });
});
