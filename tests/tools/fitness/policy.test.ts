import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readPolicy } from "../../../tools/fitness/policy.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-fitness-policy-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("fitness policy loader", () => {
  it("parses valid policy json", async () => {
    const root = await createTempRoot();
    const policyPath = join(root, "policy.json");
    await writeFile(
      policyPath,
      JSON.stringify(
        {
          defaults: { mode: "report-only" },
          checks: [
            {
              id: "boundary",
              metric: "x",
              mode: "hard-fail",
              owner: "architecture",
              scope: ["src/v11/**"],
              exceptions: []
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const policy = await readPolicy(policyPath);
    expect(policy.defaults?.mode).toBe("report-only");
    expect(policy.checks).toHaveLength(1);
    expect(policy.checks[0]?.id).toBe("boundary");
    expect(policy.checks[0]?.scope).toEqual(["src/v11/**"]);
  });

  it("rejects invalid check entries", async () => {
    const root = await createTempRoot();
    const policyPath = join(root, "policy-invalid.json");
    await writeFile(
      policyPath,
      JSON.stringify(
        {
          checks: [
            {
              id: "boundary"
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(readPolicy(policyPath)).rejects.toThrow(
      "Fitness policy check must define string id and metric."
    );
  });
});
