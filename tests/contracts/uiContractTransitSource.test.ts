import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

async function readSource(relativePath: string): Promise<string> {
  return readFile(join(repoRoot, relativePath), "utf8");
}

describe("UI contract transit source guards", () => {
  it("keeps remote execution transit surfaces as canonical re-exports", async () => {
    const transit = await readSource("src/types/uiRemoteExecution.ts");
    const backendCompat = await readSource("src/shared/contracts/uiRemoteExecution.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/uiRemoteExecution.ts");

    expect(transit).toContain("from \"../contracts/ui/uiRemoteExecution.js\"");
    expect(backendCompat).toContain("from \"../../contracts/ui/uiRemoteExecution.js\"");
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/uiRemoteExecution.js\""
    );
    expect(transit).not.toMatch(/interface\s+UiBubble/);
    expect(transit).not.toMatch(/type\s+UiBubble\w+\s*=/);
    expect(backendCompat).not.toMatch(/interface\s+UiBubble/);
    expect(backendCompat).not.toMatch(/type\s+UiBubble\w+\s*=/);
    expect(uiCompat).not.toMatch(/interface\s+UiBubble/);
    expect(uiCompat).not.toMatch(/type\s+UiBubble\w+\s*=/);
    expect([transit, backendCompat, uiCompat].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });

  it("keeps state validation diagnostics browser-safe and canonical", async () => {
    const canonical = await readSource("src/contracts/ui/stateValidation.ts");
    const backendCompat = await readSource("src/shared/contracts/stateValidation.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/stateValidation.ts");
    const stateSnapshots = await readSource("src/v11/shared/ports/stateSnapshots.ts");

    expect(canonical).toMatch(
      /export interface ContractValidationError\s*{\s*path:\s*string;\s*message:\s*string;\s*}/
    );
    expect(canonical).toMatch(
      /export interface StateValidationDiagnostics\s*{\s*message:\s*string;\s*errors:\s*ContractValidationError\[\];\s*}/
    );
    expect(canonical).not.toContain("v11/");
    expect(canonical).not.toContain("validation/primitives");
    expect(backendCompat).toContain("from \"../../contracts/ui/stateValidation.js\"");
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/stateValidation.js\""
    );
    expect(stateSnapshots).toContain(
      "from \"../../../contracts/ui/stateValidation.js\""
    );
    expect(stateSnapshots).not.toContain("shared/contracts/stateValidation");
    expect(stateSnapshots).not.toContain("validation/primitives");
    expect(stateSnapshots).not.toMatch(
      /interface\s+(ContractValidationError|StateValidationDiagnostics)/
    );
    expect(stateSnapshots).not.toMatch(
      /type\s+(ContractValidationError|StateValidationDiagnostics)\s*=/
    );
    expect(backendCompat).not.toMatch(
      /interface\s+(ContractValidationError|StateValidationDiagnostics)/
    );
    expect(uiCompat).not.toMatch(
      /interface\s+(ContractValidationError|StateValidationDiagnostics)/
    );
    expect(backendCompat).not.toMatch(
      /type\s+(ContractValidationError|StateValidationDiagnostics)\s*=/
    );
    expect(uiCompat).not.toMatch(
      /type\s+(ContractValidationError|StateValidationDiagnostics)\s*=/
    );
    expect([backendCompat, uiCompat, stateSnapshots].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });

  it("keeps lifecycle literals in src/types/bubble and re-exports them canonically", async () => {
    const runtime = await readSource("src/types/bubble.ts");
    const canonical = await readSource("src/contracts/ui/bubbleLifecycle.ts");
    const backendCompat = await readSource("src/shared/contracts/bubbleLifecycle.ts");
    const uiCompat = await readSource("ui/src/lib/contracts/bubbleLifecycle.ts");
    const stateSnapshots = await readSource("src/v11/shared/ports/stateSnapshots.ts");

    expect(runtime.match(/export const bubbleLifecycleStates = \[/g)).toHaveLength(
      1
    );
    expect(canonical).toContain("from \"../../types/bubble.js\"");
    expect(canonical).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect(backendCompat).toContain("from \"../../contracts/ui/bubbleLifecycle.js\"");
    expect(backendCompat).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect(uiCompat).toContain(
      "from \"../../../../src/contracts/ui/bubbleLifecycle.js\""
    );
    expect(stateSnapshots).toContain(
      "from \"../../../contracts/ui/bubbleLifecycle.js\""
    );
    expect(stateSnapshots).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect(stateSnapshots).not.toMatch(/type\s+BubbleLifecycleState\s*=/);
    expect(stateSnapshots).not.toMatch(/interface\s+BubbleLifecycleState/);
    expect(uiCompat).not.toMatch(/bubbleLifecycleStates\s*=\s*\[/);
    expect([canonical, backendCompat, uiCompat, stateSnapshots].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });

  it("keeps delete-bubble UI names as aliases of the canonical contract", async () => {
    const canonical = await readSource("src/contracts/ui/deleteBubble.ts");
    const backendCompat = await readSource("src/contracts/deleteBubble.ts");
    const uiTypes = await readSource("ui/src/lib/types.ts");

    expect(canonical).toContain("export interface DeleteBubbleArtifacts");
    expect(canonical).toContain("export interface DeleteBubbleResult");
    expect(backendCompat).toContain("from \"./ui/deleteBubble.js\"");
    expect(uiTypes).toContain("from \"../../../src/contracts/ui/deleteBubble.js\"");
    expect(uiTypes).toContain(
      "DeleteBubbleArtifacts as BubbleDeleteArtifacts"
    );
    expect(uiTypes).toContain("DeleteBubbleResult as BubbleDeleteResult");
    expect(backendCompat).not.toMatch(/interface\s+DeleteBubbleArtifacts/);
    expect(backendCompat).not.toMatch(/interface\s+DeleteBubbleResult/);
    expect(backendCompat).not.toMatch(/type\s+DeleteBubbleArtifacts\s*=/);
    expect(backendCompat).not.toMatch(/type\s+DeleteBubbleResult\s*=/);
    expect(uiTypes).not.toMatch(/interface\s+BubbleDeleteArtifacts/);
    expect(uiTypes).not.toMatch(/interface\s+BubbleDeleteResult/);
    expect(uiTypes).not.toMatch(/interface\s+DeleteBubbleArtifacts/);
    expect(uiTypes).not.toMatch(/interface\s+DeleteBubbleResult/);
    expect(uiTypes).not.toMatch(/type\s+BubbleDeleteArtifacts\s*=/);
    expect(uiTypes).not.toMatch(/type\s+BubbleDeleteResult\s*=/);
    expect(uiTypes).not.toMatch(/type\s+DeleteBubbleArtifacts\s*=/);
    expect(uiTypes).not.toMatch(/type\s+DeleteBubbleResult\s*=/);
    expect([backendCompat, uiTypes].join("\n")).not.toMatch(
      /mirror|mirrored|keep.*sync/i
    );
  });
});
