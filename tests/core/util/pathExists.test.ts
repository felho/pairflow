import { constants as fsConstants } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

const accessMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  access: accessMock
}));

import { pathExists } from "../../../src/core/util/pathExists.js";

afterEach(() => {
  accessMock.mockReset();
});

describe("pathExists", () => {
  it("returns true when access succeeds", async () => {
    accessMock.mockResolvedValueOnce(undefined);

    await expect(pathExists("/tmp/existing")).resolves.toBe(true);
    expect(accessMock).toHaveBeenCalledWith("/tmp/existing", fsConstants.F_OK);
  });

  it("returns false on ENOENT", async () => {
    accessMock.mockRejectedValueOnce(
      Object.assign(new Error("missing"), { code: "ENOENT" })
    );

    await expect(pathExists("/tmp/missing")).resolves.toBe(false);
  });

  it("returns false on ENOTDIR", async () => {
    accessMock.mockRejectedValueOnce(
      Object.assign(new Error("not dir"), { code: "ENOTDIR" })
    );

    await expect(pathExists("/tmp/notdir/path")).resolves.toBe(false);
  });

  it("rethrows non-existence errors", async () => {
    accessMock.mockRejectedValueOnce(
      Object.assign(new Error("permission denied"), { code: "EACCES" })
    );

    await expect(pathExists("/tmp/protected")).rejects.toThrow(
      "permission denied"
    );
  });
});
