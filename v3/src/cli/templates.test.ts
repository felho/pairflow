import { describe, expect, it } from "vitest";

import { fixtureTemplate } from "../testkit/index.js";
import { builtinDefinitionStore, builtinTemplate } from "./templates.js";

describe("cli builtin template — the MD-1 production copy (packet ch6-P4a)", () => {
  it("drift-pin: the production copy deep-equals the testkit fixture (ch 8 retires both)", () => {
    expect(builtinTemplate()).toEqual(fixtureTemplate());
  });

  it("builtinDefinitionStore loads exactly the pinned ref", async () => {
    const definitions = builtinDefinitionStore();
    expect(await definitions.load({ id: "local-pair-v0", version: 1 })).toEqual(
      builtinTemplate(),
    );
    expect(await definitions.load({ id: "local-pair-v0", version: 2 })).toBeNull();
    expect(await definitions.load({ id: "other", version: 1 })).toBeNull();
  });
});
