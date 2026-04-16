import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { SchemaValidationError } from "../../src/v11/shared/validation/primitives.js";
import {
  loadPairflowGlobalConfig,
  parsePairflowGlobalConfigToml,
  resolvePairflowGlobalConfigPath,
  validateRemoteDefaultPortForwards,
  validatePairflowGlobalConfig
} from "../../src/config/pairflowConfig.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-global-config-"));
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

describe("pairflow global config", () => {
  it("parses attach_launcher when provided", () => {
    const parsed = parsePairflowGlobalConfigToml(`
attach_launcher = "warp"
`);

    expect(parsed.attach_launcher).toBe("warp");
  });

  it("parses open_command when provided", () => {
    const parsed = parsePairflowGlobalConfigToml(`
open_command = "code --reuse-window {{worktree_path}}"
`);

    expect(parsed.open_command).toBe("code --reuse-window {{worktree_path}}");
  });

  it("parses empty config when attach_launcher is omitted", () => {
    const parsed = parsePairflowGlobalConfigToml(`
# empty config
`);

    expect(parsed).toEqual({});
  });

  it("parses remote host definitions from [remotes.<name>] sections", () => {
    const parsed = parsePairflowGlobalConfigToml(`
attach_launcher = "copy"

[remotes.homelab]
host = "homelab"
repo_base = "~/repos"

[remotes.workstation]
host = "office-ws"
user = "dev"
repo_base = "/data/repos"
pairflow_command = "pairflow-dev"
pairflow_sync_command = "cd ~/src/pairflow && pnpm build"
default_port_forwards = [3000, 5173, 8080]
`);

    expect(parsed.attach_launcher).toBe("copy");
    expect(parsed.remotes).toEqual({
      homelab: {
        host: "homelab",
        repo_base: "~/repos"
      },
      workstation: {
        host: "office-ws",
        user: "dev",
        repo_base: "/data/repos",
        pairflow_command: "pairflow-dev",
        pairflow_sync_command: "cd ~/src/pairflow && pnpm build",
        default_port_forwards: [3000, 5173, 8080]
      }
    });
  });

  it("normalizes optional pairflow_sync_command when provided", () => {
    const result = validatePairflowGlobalConfig({
      remotes: {
        workstation: {
          host: "office-ws",
          repo_base: "/data/repos",
          pairflow_sync_command: "  cd ~/src/pairflow && pnpm build  "
        }
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({
      remotes: {
        workstation: {
          host: "office-ws",
          repo_base: "/data/repos",
          pairflow_sync_command: "cd ~/src/pairflow && pnpm build"
        }
      }
    });
  });

  it("keeps missing pairflow_sync_command as an explicit valid absence", () => {
    const result = validatePairflowGlobalConfig({
      remotes: {
        homelab: {
          host: "homelab",
          repo_base: "~/repos"
        }
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({
      remotes: {
        homelab: {
          host: "homelab",
          repo_base: "~/repos"
        }
      }
    });
    expect(
      Object.hasOwn(result.value.remotes?.homelab ?? {}, "pairflow_sync_command")
    ).toBe(false);
  });

  it("rejects whitespace-only pairflow_sync_command on the TOML parse path", () => {
    try {
      parsePairflowGlobalConfigToml(`
[remotes.workstation]
host = "office-ws"
repo_base = "/data/repos"
pairflow_sync_command = "   "
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors).toEqual([
        {
          path: "remotes.workstation.pairflow_sync_command",
          message: "PAIRFLOW_REMOTE_CONFIG_INVALID: Must be a non-empty string"
        }
      ]);
    }
  });

  it("rejects multi-word pairflow_command on the TOML parse path", () => {
    try {
      parsePairflowGlobalConfigToml(`
[remotes.workstation]
host = "office-ws"
repo_base = "/data/repos"
pairflow_command = "node ./dist/cli/index.js"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors).toEqual([
        {
          path: "remotes.workstation.pairflow_command",
          message:
            "PAIRFLOW_REMOTE_CONFIG_INVALID: Must be a single executable token without whitespace"
        }
      ]);
    }
  });

  it("rejects option-like remote host tokens on the TOML parse path", () => {
    try {
      parsePairflowGlobalConfigToml(`
[remotes.workstation]
host = "-Jjumpbox"
repo_base = "/data/repos"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors).toEqual([
        {
          path: "remotes.workstation.host",
          message:
            "PAIRFLOW_REMOTE_CONFIG_INVALID: Must be a single SSH token without whitespace and may not start with '-'"
        }
      ]);
    }
  });

  it("rejects top-level keys that appear after a [remotes.<name>] section", () => {
    try {
      parsePairflowGlobalConfigToml(`
[remotes.homelab]
host = "homelab"
repo_base = "~/repos"

open_command = "cursor {{worktree_path}}"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /Key "open_command".*not valid inside \[remotes\.homelab\]/u
      );
    }
  });

  it("rejects unknown keys after a [remotes.<name>] section instead of routing them into the remote map", () => {
    try {
      parsePairflowGlobalConfigToml(`
[remotes.homelab]
host = "homelab"
repo_base = "~/repos"

future_root_key = "value"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /Key "future_root_key".*not valid inside \[remotes\.homelab\]/u
      );
    }
  });

  it("rejects unsupported attach launcher values", () => {
    const result = validatePairflowGlobalConfig({
      attach_launcher: "wezterm"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "attach_launcher")).toBe(
      true
    );
  });

  it("rejects empty or whitespace global open_command values", () => {
    const result = validatePairflowGlobalConfig({
      open_command: "   "
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors.some((error) => error.path === "open_command")).toBe(
      true
    );
  });

  it("rejects unsupported global config sections", () => {
    try {
      parsePairflowGlobalConfigToml(`
[ui]
open_command = "code --reuse-window {{worktree_path}}"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR.*only \[remotes\.<name>\] is supported/u
      );
    }
  });

  it("rejects dotted keys in global config", () => {
    try {
      parsePairflowGlobalConfigToml(`
ui.open_command = "code --reuse-window {{worktree_path}}"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /Dotted TOML keys are not supported/u
      );
    }
  });

  it("rejects duplicate keys in global config", () => {
    try {
      parsePairflowGlobalConfigToml(`
open_command = "code --reuse-window {{worktree_path}}"
open_command = "cursor {{worktree_path}}"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /Duplicate TOML key "open_command"/u
      );
    }
  });

  it("rejects duplicate [remotes.<name>] section headers", () => {
    try {
      parsePairflowGlobalConfigToml(`
[remotes.homelab]
host = "homelab"
repo_base = "~/repos"

[remotes.homelab]
host = "other"
repo_base = "/data/repos"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /Duplicate TOML section \[remotes\.homelab\]/u
      );
    }
  });

  it("preserves detailed quoted-string parse diagnostics", () => {
    try {
      parsePairflowGlobalConfigToml(`
open_command = "unterminated
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors[0]?.message).toMatch(
        /Invalid quoted string at line 2: .+/u
      );
    }
  });

  it("rejects invalid remote host configs", () => {
    const result = validatePairflowGlobalConfig({
      remotes: {
        broken: {
          host: "ssh-host",
          repo_base: "",
          pairflow_sync_command: "   ",
          default_port_forwards: [3000, "bad"]
        }
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "remotes.broken.repo_base"
          && error.message.includes("PAIRFLOW_REMOTE_CONFIG_INVALID")
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) =>
          error.path === "remotes.broken.pairflow_sync_command"
          && error.message === "PAIRFLOW_REMOTE_CONFIG_INVALID: Must be a non-empty string"
      )
    ).toBe(true);
    expect(
      result.errors.some(
        (error) => error.path === "remotes.broken.default_port_forwards[1]"
      )
    ).toBe(true);
  });

  it("rejects remote host tokens that could be parsed as ssh/scp options", () => {
    const result = validatePairflowGlobalConfig({
      remotes: {
        broken: {
          host: "-oProxyCommand=evil",
          repo_base: "/repos"
        }
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "remotes.broken.host",
        message:
          "PAIRFLOW_REMOTE_CONFIG_INVALID: Must be a single SSH token without whitespace and may not start with '-'"
      }
    ]);
  });

  it("rejects remote user tokens that are not a single safe ssh token", () => {
    const result = validatePairflowGlobalConfig({
      remotes: {
        broken: {
          host: "ssh-host",
          user: "dev ops",
          repo_base: "/repos"
        }
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "remotes.broken.user",
        message:
          "PAIRFLOW_REMOTE_CONFIG_INVALID: Must be a single SSH token without whitespace and may not start with '-'"
      }
    ]);
  });

  it("fails closed when default_port_forwards contains any invalid entry", () => {
    const errors: Array<{ path: string; message: string }> = [];
    const result = validateRemoteDefaultPortForwards(
      [3000, "bad", 8080],
      "remotes.homelab.default_port_forwards",
      errors
    );

    expect(result).toBeUndefined();
    expect(errors).toEqual([
      {
        path: "remotes.homelab.default_port_forwards[1]",
        message:
          "PAIRFLOW_REMOTE_CONFIG_INVALID: Must be an integer in range 1..65535"
      }
    ]);
  });

  it("returns normalized default_port_forwards only when every entry is valid", () => {
    const errors: Array<{ path: string; message: string }> = [];
    const result = validateRemoteDefaultPortForwards(
      [3000, 5173, 8080],
      "remotes.homelab.default_port_forwards",
      errors
    );

    expect(result).toEqual([3000, 5173, 8080]);
    expect(errors).toEqual([]);
  });

  it("documents that remote sections remain active until another header appears", () => {
    try {
      parsePairflowGlobalConfigToml(`
[remotes.homelab]
host = "homelab"
repo_base = "~/repos"

open_command = "cursor {{worktree_path}}"
`);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);
      expect((error as SchemaValidationError).errors).toEqual([
        {
          path: "$",
          message:
            'PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR: Key "open_command" at line 6 is not valid inside [remotes.homelab]'
        }
      ]);
    }
  });

  it("rejects forwarded ports above the TCP range upper bound", () => {
    const result = validatePairflowGlobalConfig({
      remotes: {
        host1: {
          host: "ssh-host",
          repo_base: "/repos",
          default_port_forwards: [65536]
        }
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "remotes.host1.default_port_forwards[0]",
        message:
          "PAIRFLOW_REMOTE_CONFIG_INVALID: Must be an integer in range 1..65535"
      }
    ]);
  });

  it("rejects invalid remote alias keys on the programmatic validator path", () => {
    const result = validatePairflowGlobalConfig({
      remotes: {
        "bad name": {
          host: "ssh-host",
          repo_base: "/repos"
        }
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      {
        path: "remotes.bad name",
        message:
          "PAIRFLOW_REMOTE_CONFIG_INVALID: Remote alias must match ^[A-Za-z0-9_-]+$"
      }
    ]);
  });

  it("does not wrap unexpected internal parser exceptions as schema failures", () => {
    try {
      parsePairflowGlobalConfigToml({} as never);
      throw new Error("Expected parsePairflowGlobalConfigToml to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error).not.toBeInstanceOf(SchemaValidationError);
    }
  });

  it("rejects unknown fields inside remote host configs", () => {
    const result = validatePairflowGlobalConfig({
      remotes: {
        homelab: {
          host: "homelab",
          repo_base: "~/repos",
          shell: "zsh"
        }
      }
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.errors.some(
        (error) =>
          error.path === "remotes.homelab.shell"
          && error.message.includes("Unknown remote config field")
      )
    ).toBe(true);
  });

  it("loads empty config when file does not exist", async () => {
    const dir = await createTempDir();
    const path = join(dir, "config.toml");

    const loaded = await loadPairflowGlobalConfig(path);
    expect(loaded).toEqual({});
  });

  it("loads and parses config.toml from provided path", async () => {
    const dir = await createTempDir();
    const path = join(dir, "config.toml");
    await writeFile(
      path,
      'attach_launcher = "copy"\nopen_command = "cursor {{worktree_path}}"\n',
      "utf8"
    );

    const loaded = await loadPairflowGlobalConfig(path);
    expect(loaded).toEqual({
      attach_launcher: "copy",
      open_command: "cursor {{worktree_path}}"
    });
  });

  it("loads remote pairflow_sync_command from config.toml and preserves trimmed optional contract", async () => {
    const dir = await createTempDir();
    const path = join(dir, "config.toml");
    await writeFile(
      path,
      [
        '[remotes.workstation]',
        'host = "office-ws"',
        'repo_base = "/data/repos"',
        'pairflow_sync_command = "  cd ~/src/pairflow && pnpm build  "'
      ].join("\n"),
      "utf8"
    );

    const loaded = await loadPairflowGlobalConfig(path);
    expect(loaded).toEqual({
      remotes: {
        workstation: {
          host: "office-ws",
          repo_base: "/data/repos",
          pairflow_sync_command: "cd ~/src/pairflow && pnpm build"
        }
      }
    });
  });

  it("resolves default global config path under ~/.pairflow/config.toml", () => {
    const resolved = resolvePairflowGlobalConfigPath();
    expect(resolved).toMatch(/\.pairflow\/config\.toml$/u);
  });
});
