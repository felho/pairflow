import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  getUiServerHelpText,
  isUiLifecycleCommand,
  parseUiServerCommandOptions,
  parseUiServiceCommandOptions,
  runUiServerCommand
} from "../../src/cli/commands/ui/server.js";
import {
  packageRelativeAssetsDirCandidates,
  resolveAssetsDir
} from "../../src/v11/infrastructure/ui/uiServerAssets.js";

describe("parseUiServerCommandOptions", () => {
  it("parses repeatable --repo and optional host/port/assets-dir", () => {
    const parsed = parseUiServerCommandOptions([
      "--repo",
      "/tmp/repo-a",
      "--repo",
      "/tmp/repo-b",
      "--host",
      "0.0.0.0",
      "--port",
      "4312",
      "--assets-dir",
      "/tmp/ui-dist"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected non-help UI server options.");
    }

    expect(parsed.repos).toEqual(["/tmp/repo-a", "/tmp/repo-b"]);
    expect(parsed.host).toBe("0.0.0.0");
    expect(parsed.port).toBe(4312);
    expect(parsed.assetsDir).toBe("/tmp/ui-dist");
  });

  it("supports --help", () => {
    const parsed = parseUiServerCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getUiServerHelpText()).toContain("pairflow ui");
    expect(getUiServerHelpText()).toContain("--repo");
  });

  it("accepts the hidden service token used for background process identity", () => {
    const parsed = parseUiServerCommandOptions([
      "--service-token",
      "pairflow-ui-token"
    ]);

    expect(parsed.help).toBe(false);
    if (!parsed.help) {
      expect(parsed.serviceToken).toBe("pairflow-ui-token");
    }
  });

  it("rejects invalid port", () => {
    expect(() => parseUiServerCommandOptions(["--port", "abc"])).toThrow(
      /Invalid --port/u
    );
  });

  it("rejects unknown positional UI subcommands before foreground startup", async () => {
    expect(() => parseUiServerCommandOptions(["bogus"])).toThrow();
    await expect(() => runUiServerCommand(["bogus"])).rejects.toThrow(
      /Unknown pairflow ui subcommand/u
    );
  });
});

describe("parseUiServiceCommandOptions", () => {
  it("detects lifecycle subcommands", () => {
    expect(isUiLifecycleCommand(["start"])).toBe(true);
    expect(isUiLifecycleCommand(["--port", "4173"])).toBe(false);
  });

  it("parses lifecycle options and json output", () => {
    const parsed = parseUiServiceCommandOptions([
      "restart",
      "--repo",
      "/tmp/repo",
      "--host",
      "0.0.0.0",
      "--port",
      "4312",
      "--assets-dir",
      "/tmp/ui-dist",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (!parsed.help) {
      expect(parsed.lifecycleCommand).toBe("restart");
      expect(parsed.repos).toEqual(["/tmp/repo"]);
      expect(parsed.host).toBe("0.0.0.0");
      expect(parsed.port).toBe(4312);
      expect(parsed.endpointHostFilter).toBe(true);
      expect(parsed.endpointPortFilter).toBe(true);
      expect(parsed.assetsDir).toBe("/tmp/ui-dist");
      expect(parsed.json).toBe(true);
    }
  });

  it("rejects port zero for background lifecycle commands", () => {
    expect(() => parseUiServiceCommandOptions(["start", "--port", "0"])).toThrow(
      /Invalid --port/u
    );
  });

  it("rejects startup-only options for status and stop", () => {
    expect(() =>
      parseUiServiceCommandOptions(["status", "--repo", "/tmp/repo"])
    ).toThrow(/--repo is not supported/u);
    expect(() =>
      parseUiServiceCommandOptions(["stop", "--assets-dir", "/tmp/ui-dist"])
    ).toThrow(/--assets-dir is not supported/u);
  });
});

describe("runUiServerCommand", () => {
  it("returns null when help is requested", async () => {
    const result = await runUiServerCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("delegates startup to startUiServer dependency", async () => {
    const close = vi.fn(() => Promise.resolve(undefined));
    const startUiServerMock = vi.fn(() =>
      Promise.resolve({
        host: "127.0.0.1",
        port: 4173,
        url: "http://127.0.0.1:4173",
        repoScope: {
          repos: ["/tmp/repo-a"],
          has: () => Promise.resolve(true)
        },
        assetsDir: "/tmp/ui-dist",
        close
      })
    );

    const result = await runUiServerCommand(
      ["--repo", "/tmp/repo-a", "--port", "4173"],
      "/tmp/workspace",
      {
        startUiServer: startUiServerMock
      }
    );

    expect(startUiServerMock).toHaveBeenCalledWith({
      repoPaths: ["/tmp/repo-a"],
      port: 4173,
      cwd: "/tmp/workspace"
    });
    expect(result?.url).toBe("http://127.0.0.1:4173");
  });
});

describe("packageRelativeAssetsDirCandidates", () => {
  it("includes the package-root ui/dist candidate for built npm layouts", () => {
    expect(
      packageRelativeAssetsDirCandidates(
        "file:///opt/pairflow/dist/v11/infrastructure/ui/uiServerAssets.js"
      )
    ).toContain("/opt/pairflow/ui/dist");
  });

  it("keeps scoped npm package candidates inside @pairflow/cli", () => {
    const candidates = packageRelativeAssetsDirCandidates(
      "file:///app/node_modules/@pairflow/cli/dist/v11/infrastructure/ui/uiServerAssets.js"
    );

    expect(candidates).toContain("/app/node_modules/@pairflow/cli/ui/dist");
    expect(candidates).not.toContain("/app/node_modules/@pairflow/ui/dist");
  });

  it("does not select stale dist/ui/dist before canonical source-checkout ui/dist", () => {
    expect(
      packageRelativeAssetsDirCandidates(
        "file:///opt/pairflow/dist/v11/infrastructure/ui/uiServerAssets.js"
      )
    ).toEqual(["/opt/pairflow/ui/dist"]);
  });
});

describe("resolveAssetsDir", () => {
  it("prefers package-relative assets over caller cwd assets", async () => {
    const root = await mkdtemp(join(tmpdir(), "pairflow-ui-assets-"));
    const packageRoot = join(root, "node_modules", "@pairflow", "cli");
    const callerProject = join(root, "consumer");
    const packagedAssets = join(packageRoot, "ui", "dist");
    const callerAssets = join(callerProject, "ui", "dist");
    await mkdir(packagedAssets, { recursive: true });
    await mkdir(callerAssets, { recursive: true });
    await writeFile(join(packagedAssets, "index.html"), "packaged", "utf8");
    await writeFile(join(callerAssets, "index.html"), "caller", "utf8");

    await expect(
      resolveAssetsDir({
        cwd: callerProject,
        moduleUrl: pathToFileURL(
          join(
            packageRoot,
            "dist",
            "v11",
            "infrastructure",
            "ui",
            "uiServerAssets.js"
          )
        ).href
      })
    ).resolves.toBe(packagedAssets);
  });
});
