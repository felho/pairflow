import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createFileDefinitionStore, TemplateLoadError } from "./index.js";

// Packet ch8-P1: the file-backed pinned DefinitionStore — the S1–S4
// dispositions (byte-exact listing identity, declared-ref authority,
// invalid ≠ absent, the unlistable-dir lane), the no-prevalidation
// twin, and the validate→store ordering combination (dimension 9).

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-definition-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function validTemplate(id: string, version: string): string {
  return `ref:
  id: ${id}
  version: ${version}
start: s
steps:
  s:
    role: r
    instruction: i
    transitions: {}
terminal:
  - done
roles:
  r: {}
`;
}

async function expectReject(promise: Promise<unknown>): Promise<TemplateLoadError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(TemplateLoadError);
    return error as TemplateLoadError;
  }
  throw new Error("expected the load to reject");
}

describe("S1 — byte-exact listing identity", () => {
  it("loads a present, valid template (hit)", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "x@1.yaml"), validTemplate("x", "1"));
    const store = createFileDefinitionStore(dir);
    const template = await store.load({ id: "x", version: 1 });
    expect(template).not.toBeNull();
    expect(template?.ref).toStrictEqual({ id: "x", version: 1 });
  });

  it("resolves null on a miss", async () => {
    const dir = tempDir();
    const store = createFileDefinitionStore(dir);
    expect(await store.load({ id: "x", version: 1 })).toBeNull();
  });

  it("resolves null on a case-variant filename (byte-exact, never OS path resolution)", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "X@1.yaml"), validTemplate("x", "1"));
    const store = createFileDefinitionStore(dir);
    // On the case-insensitive default macOS FS, fs path resolution WOULD
    // find X@1.yaml for "x@1.yaml" — the listing match must not.
    expect(await store.load({ id: "x", version: 1 })).toBeNull();
  });

  it("resolves null on a traversal-shaped ref (the ref never contributes a path segment)", async () => {
    const dir = tempDir();
    const store = createFileDefinitionStore(dir);
    expect(await store.load({ id: "../evil", version: 1 })).toBeNull();
  });

  it("resolves null on a .yml-named near-miss", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "x@1.yml"), validTemplate("x", "1"));
    const store = createFileDefinitionStore(dir);
    expect(await store.load({ id: "x", version: 1 })).toBeNull();
  });

  it("lists FRESH per load call (a file added after a miss is found — no cache)", async () => {
    const dir = tempDir();
    const store = createFileDefinitionStore(dir);
    expect(await store.load({ id: "x", version: 1 })).toBeNull();
    writeFileSync(join(dir, "x@1.yaml"), validTemplate("x", "1"));
    expect(await store.load({ id: "x", version: 1 })).not.toBeNull();
  });
});

describe("S1 — the no-prevalidation twin (dimension 9)", () => {
  it("rejects TYPED when an off-grammar request matches a real file (its own V3 lane)", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "x@1.5.yaml"), validTemplate("x", "1.5"));
    const store = createFileDefinitionStore(dir);
    const err = await expectReject(store.load({ id: "x", version: 1.5 }));
    expect(err.stage).toBe("validate");
  });

  it("resolves null for the same off-grammar request with no matching file", async () => {
    const dir = tempDir();
    const store = createFileDefinitionStore(dir);
    expect(await store.load({ id: "x", version: 1.5 })).toBeNull();
  });
});

describe("S2 — declared-ref authority (the store stage, after validate)", () => {
  it("rejects a declared-ref/filename mismatch at stage store, path ref", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "y@1.yaml"), validTemplate("y", "2"));
    const store = createFileDefinitionStore(dir);
    const err = await expectReject(store.load({ id: "y", version: 1 }));
    expect(err.stage).toBe("store");
    expect(err.findings).toHaveLength(1);
    expect(err.findings[0]).toMatchObject({ path: "ref" });
  });

  it("runs AFTER validate: a validate defect AND a ref mismatch yield ONLY validate findings", async () => {
    const dir = tempDir();
    // Both defects in one file: version 2 mismatches the @1 filename AND
    // start names a missing step. Validate fails first; the store stage
    // never runs (the ordering combination lane).
    writeFileSync(
      join(dir, "z@1.yaml"),
      validTemplate("z", "2").replace("start: s\n", "start: nope\n"),
    );
    const store = createFileDefinitionStore(dir);
    const err = await expectReject(store.load({ id: "z", version: 1 }));
    expect(err.stage).toBe("validate");
    for (const finding of err.findings) {
      expect(Object.keys(finding as object).sort()).toStrictEqual(["message", "path"]);
    }
  });
});

describe("S3 — invalid is never conflated with absent", () => {
  it("rejects TYPED on a present file with garbage content (parse stage)", async () => {
    const dir = tempDir();
    writeFileSync(join(dir, "g@1.yaml"), "a: 1\na: 2\n");
    const store = createFileDefinitionStore(dir);
    const err = await expectReject(store.load({ id: "g", version: 1 }));
    expect(err.stage).toBe("parse");
    expect(err.findings.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects TYPED with the OS code on a present-but-unreadable entry (a DIRECTORY named x@1.yaml)", async () => {
    const dir = tempDir();
    mkdirSync(join(dir, "x@1.yaml"));
    const store = createFileDefinitionStore(dir);
    const err = await expectReject(store.load({ id: "x", version: 1 }));
    expect(err.stage).toBe("read");
    expect(err.findings).toHaveLength(1);
    expect(err.findings[0]).toMatchObject({
      stage: "read",
      code: "EISDIR",
      path: join(dir, "x@1.yaml"),
    });
  });
});

describe("S4 — an unlistable templates directory is a typed rejection, never null", () => {
  it("rejects with the read-stage OS half over the DIRECTORY path (ENOENT)", async () => {
    const dir = join(tempDir(), "does-not-exist");
    const store = createFileDefinitionStore(dir);
    const err = await expectReject(store.load({ id: "x", version: 1 }));
    expect(err.stage).toBe("read");
    expect(err.findings).toHaveLength(1);
    expect(err.findings[0]).toMatchObject({ stage: "read", code: "ENOENT", path: dir });
  });

  it("rejects when the configured directory is a FILE (ENOTDIR)", async () => {
    const parent = tempDir();
    const filePath = join(parent, "not-a-dir");
    writeFileSync(filePath, "x");
    const store = createFileDefinitionStore(filePath);
    const err = await expectReject(store.load({ id: "x", version: 1 }));
    expect(err.stage).toBe("read");
    expect(err.findings[0]).toMatchObject({ stage: "read", code: "ENOTDIR", path: filePath });
  });
});

describe("E5 — the typed error's machine shape at the store surface", () => {
  it("carries {stage, findings} and read-stage entries keep the OS-half keyset", async () => {
    const dir = join(tempDir(), "missing");
    const store = createFileDefinitionStore(dir);
    const err = await expectReject(store.load({ id: "x", version: 1 }));
    expect(Object.keys({ stage: err.stage, findings: err.findings }).sort()).toStrictEqual([
      "findings",
      "stage",
    ]);
    const finding = err.findings[0];
    expect(Object.keys(finding as object).sort()).toStrictEqual(["code", "message", "path", "stage"]);
  });

  it("serializes to EXACTLY {stage, findings} (aftermath — toJSON keeps E5's shape on the naive path)", async () => {
    const dir = join(tempDir(), "missing");
    const store = createFileDefinitionStore(dir);
    const err = await expectReject(store.load({ id: "x", version: 1 }));
    const serialized = JSON.parse(JSON.stringify(err)) as Record<string, unknown>;
    expect(Object.keys(serialized).sort()).toStrictEqual(["findings", "stage"]);
  });
});
