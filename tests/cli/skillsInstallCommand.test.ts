import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getSkillsInstallHelpText,
  parseSkillsInstallCommandOptions,
  renderSkillsInstallText,
  runSkillsInstallCommand
} from "../../src/cli/commands/skills/install.js";
import { installPairflowSkills } from "../../src/v11/application/skills/skillsInstall.js";
import type {
  PairflowSkillName,
  SkillsInstallFileSystem
} from "../../src/v11/application/skills/skillsInstallContract.js";
import { nodeSkillsInstallFileSystem } from "../../src/v11/infrastructure/skills/nodeSkillsInstallFileSystem.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(path);
  return path;
}

async function writeSkillSource(
  sourceRoot: string,
  skill: PairflowSkillName,
  content = `# ${skill}\n`
): Promise<void> {
  const skillRoot = join(sourceRoot, skill);
  await mkdir(skillRoot, {
    recursive: true
  });
  await writeFile(join(skillRoot, "SKILL.md"), content, "utf8");
}

async function writeAllSkillSources(sourceRoot: string): Promise<void> {
  await writeSkillSource(sourceRoot, "UsePairflow");
  await writeSkillSource(sourceRoot, "CreatePairflowSpec");
  await writeSkillSource(sourceRoot, "ExecutePairflowPlan");
}

async function setupSourceAndHome(): Promise<{
  sourceRoot: string;
  homeDir: string;
}> {
  const root = await createTempDir("pairflow-skills-install-");
  const sourceRoot = join(root, "package", ".claude", "skills");
  const homeDir = join(root, "home");
  await writeAllSkillSources(sourceRoot);
  return {
    sourceRoot,
    homeDir
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("skills install command parsing", () => {
  it("supports help text with command options and defaults", () => {
    const parsed = parseSkillsInstallCommandOptions(["--help"]);

    expect(parsed.help).toBe(true);
    expect(getSkillsInstallHelpText()).toContain("pairflow skills install");
    expect(getSkillsInstallHelpText()).toContain("--skills all|UsePairflow");
    expect(getSkillsInstallHelpText()).toContain("Default: .claude");
  });

  it("parses selected skills, target dir, json, force, dry-run, and link-other", () => {
    const parsed = parseSkillsInstallCommandOptions([
      "--skills",
      "UsePairflow,ExecutePairflowPlan,UsePairflow",
      "--target-dir",
      ".codex",
      "--link-other",
      "--dry-run",
      "--force",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected non-help parsed options.");
    }
    expect(parsed.skills).toEqual(["UsePairflow", "ExecutePairflowPlan"]);
    expect(parsed.targetDir).toBe(".codex");
    expect(parsed.linkOther).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.force).toBe(true);
    expect(parsed.json).toBe(true);
  });

  it("rejects invalid skills and target dirs before writes", () => {
    expect(() =>
      parseSkillsInstallCommandOptions(["--skills", "UnknownSkill"])
    ).toThrow("Unsupported skill");
    expect(() =>
      parseSkillsInstallCommandOptions(["--target-dir", ".ssh"])
    ).toThrow("Unsupported target dir");
  });
});

describe("skills install command execution", () => {
  it("returns parseable dry-run JSON shape and leaves target root absent", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();

    const result = await runSkillsInstallCommand(
      ["--dry-run", "--json", "--skills", "all", "--target-dir", ".claude"],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );

    expect(result).not.toBeNull();
    expect(JSON.parse(JSON.stringify(result))).toMatchObject({
      sourceRoot,
      targetRoot: join(homeDir, ".claude", "skills"),
      targetDir: ".claude",
      selectedSkills: [
        "UsePairflow",
        "CreatePairflowSpec",
        "ExecutePairflowPlan"
      ],
      dryRun: true,
      linkOther: false,
      status: "planned"
    });
    await expect(lstat(join(homeDir, ".claude"))).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("copies only selected skill directories", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();

    const result = await runSkillsInstallCommand(
      ["--skills", "UsePairflow,ExecutePairflowPlan", "--target-dir", ".claude"],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );

    expect(result?.status).toBe("fresh_install");
    await expect(
      readFile(join(homeDir, ".claude", "skills", "UsePairflow", "SKILL.md"), "utf8")
    ).resolves.toContain("UsePairflow");
    await expect(
      readFile(
        join(homeDir, ".claude", "skills", "ExecutePairflowPlan", "SKILL.md"),
        "utf8"
      )
    ).resolves.toContain("ExecutePairflowPlan");
    await expect(
      lstat(join(homeDir, ".claude", "skills", "CreatePairflowSpec"))
    ).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("installs duplicate selected skills once", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();

    const result = await runSkillsInstallCommand(
      ["--skills", "UsePairflow,UsePairflow", "--target-dir", ".claude"],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );

    expect(result?.selectedSkills).toEqual(["UsePairflow"]);
    expect(result?.operations).toHaveLength(1);
    await expect(
      readFile(join(homeDir, ".claude", "skills", "UsePairflow", "SKILL.md"), "utf8")
    ).resolves.toContain("UsePairflow");
  });

  it("refreshes an existing selected target directory and reports updated_existing", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const destination = join(homeDir, ".claude", "skills", "UsePairflow");
    await mkdir(destination, {
      recursive: true
    });
    await writeFile(join(destination, "stale.txt"), "stale\n", "utf8");

    const result = await runSkillsInstallCommand(
      ["--skills", "UsePairflow", "--target-dir", ".claude"],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );

    expect(result?.status).toBe("updated_existing");
    await expect(lstat(join(destination, "stale.txt"))).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(readFile(join(destination, "SKILL.md"), "utf8")).resolves.toContain(
      "UsePairflow"
    );
  });

  it("creates and updates per-skill links in the other agent directory", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();

    const first = await runSkillsInstallCommand(
      ["--skills", "CreatePairflowSpec", "--target-dir", ".claude", "--link-other"],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );
    const linkPath = join(homeDir, ".codex", "skills", "CreatePairflowSpec");
    await expect(readlink(linkPath)).resolves.toBe(
      join(homeDir, ".claude", "skills", "CreatePairflowSpec")
    );
    expect(first?.status).toBe("fresh_install");

    const second = await runSkillsInstallCommand(
      [
        "--skills",
        "CreatePairflowSpec",
        "--target-dir",
        ".claude",
        "--link-other",
        "true"
      ],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );

    expect(second?.status).toBe("updated_existing");
    await expect(readlink(linkPath)).resolves.toBe(
      join(homeDir, ".claude", "skills", "CreatePairflowSpec")
    );
  });

  it("fails unsafe managed paths before later writes without force", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const destination = join(homeDir, ".claude", "skills", "UsePairflow");
    const linkPath = join(homeDir, ".codex", "skills", "UsePairflow");
    await mkdir(join(homeDir, ".claude", "skills"), {
      recursive: true
    });
    await mkdir(join(homeDir, ".codex", "skills"), {
      recursive: true
    });
    await writeFile(destination, "unsafe target\n", "utf8");
    await writeFile(linkPath, "unsafe link\n", "utf8");

    await expect(
      runSkillsInstallCommand(
        ["--skills", "UsePairflow", "--target-dir", ".claude", "--link-other"],
        {
          homeDir,
          sourceRootCandidates: [sourceRoot]
        }
      )
    ).rejects.toThrow("requires --force");

    await expect(readFile(destination, "utf8")).resolves.toBe("unsafe target\n");
    await expect(readFile(linkPath, "utf8")).resolves.toBe("unsafe link\n");
  });

  it("reports a dry-run plan even when existing managed paths would be unsafe for real writes", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const destination = join(homeDir, ".claude", "skills", "UsePairflow");
    await mkdir(join(homeDir, ".claude", "skills"), {
      recursive: true
    });
    await writeFile(destination, "unsafe target\n", "utf8");

    const result = await runSkillsInstallCommand(
      ["--skills", "UsePairflow", "--target-dir", ".claude", "--dry-run"],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );

    expect(result?.status).toBe("planned");
    expect(result?.dryRun).toBe(true);
    await expect(readFile(destination, "utf8")).resolves.toBe("unsafe target\n");
  });

  it("fails closed when managed target paths overlap the selected source root", async () => {
    const root = await createTempDir("pairflow-skills-source-overlap-");
    const sourceRoot = join(root, ".claude", "skills");
    await writeAllSkillSources(sourceRoot);

    await expect(
      runSkillsInstallCommand(
        ["--skills", "UsePairflow", "--target-dir", ".claude", "--force"],
        {
          homeDir: root,
          sourceRootCandidates: [sourceRoot]
        }
      )
    ).rejects.toThrow("overlaps Pairflow skill source root");

    await expect(
      readFile(join(sourceRoot, "UsePairflow", "SKILL.md"), "utf8")
    ).resolves.toContain("UsePairflow");
  });

  it("fails closed when a managed target path reaches the source root through a parent symlink", async () => {
    const root = await createTempDir("pairflow-skills-source-symlink-overlap-");
    const packageRoot = join(root, "package");
    const sourceRoot = join(packageRoot, ".claude", "skills");
    const homeDir = join(root, "home");
    await writeAllSkillSources(sourceRoot);
    await mkdir(homeDir, {
      recursive: true
    });
    await symlink(join(packageRoot, ".claude"), join(homeDir, ".claude"), "dir");

    await expect(
      runSkillsInstallCommand(
        ["--skills", "UsePairflow", "--target-dir", ".claude", "--force"],
        {
          homeDir,
          sourceRootCandidates: [sourceRoot]
        }
      )
    ).rejects.toThrow("resolves inside Pairflow skill source root");

    await expect(
      readFile(join(sourceRoot, "UsePairflow", "SKILL.md"), "utf8")
    ).resolves.toContain("UsePairflow");
  });

  it("fails closed when link-other agent roots alias through a parent symlink", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const targetAgentRoot = join(homeDir, ".claude");
    await mkdir(targetAgentRoot, {
      recursive: true
    });
    await symlink(targetAgentRoot, join(homeDir, ".codex"), "dir");

    await expect(
      runSkillsInstallCommand(
        ["--skills", "UsePairflow", "--target-dir", ".claude", "--link-other"],
        {
          homeDir,
          sourceRootCandidates: [sourceRoot]
        }
      )
    ).rejects.toThrow("agent or skills root is a symlink");

    await expect(
      lstat(join(homeDir, ".claude", "skills", "UsePairflow"))
    ).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(
      readFile(join(sourceRoot, "UsePairflow", "SKILL.md"), "utf8")
    ).resolves.toContain("UsePairflow");
  });

  it("fails closed when link-other skills roots alias through a parent symlink even with force", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const targetSkillsRoot = join(homeDir, ".claude", "skills");
    const otherAgentRoot = join(homeDir, ".codex");
    await mkdir(targetSkillsRoot, {
      recursive: true
    });
    await mkdir(otherAgentRoot, {
      recursive: true
    });
    await symlink(targetSkillsRoot, join(otherAgentRoot, "skills"), "dir");

    await expect(
      runSkillsInstallCommand(
        [
          "--skills",
          "UsePairflow",
          "--target-dir",
          ".claude",
          "--link-other",
          "--force"
        ],
        {
          homeDir,
          sourceRootCandidates: [sourceRoot]
        }
      )
    ).rejects.toThrow("agent or skills root is a symlink");

    await expect(lstat(join(targetSkillsRoot, "UsePairflow"))).rejects.toMatchObject({
      code: "ENOENT"
    });
    await expect(
      readFile(join(sourceRoot, "UsePairflow", "SKILL.md"), "utf8")
    ).resolves.toContain("UsePairflow");
  });

  it("reports a dry-run plan when the target agent root parent is not a directory", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const targetAgentRoot = join(homeDir, ".claude");
    await mkdir(homeDir, {
      recursive: true
    });
    await writeFile(targetAgentRoot, "not a directory\n", "utf8");

    const result = await runSkillsInstallCommand(
      ["--skills", "UsePairflow", "--target-dir", ".claude", "--dry-run"],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );

    expect(result?.status).toBe("planned");
    expect(result?.dryRun).toBe(true);
    await expect(readFile(targetAgentRoot, "utf8")).resolves.toBe(
      "not a directory\n"
    );
  });

  it("replaces unsafe selected managed paths with force and reports replaced_existing", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const destination = join(homeDir, ".claude", "skills", "UsePairflow");
    const linkPath = join(homeDir, ".codex", "skills", "UsePairflow");
    await mkdir(join(homeDir, ".claude", "skills"), {
      recursive: true
    });
    await mkdir(join(homeDir, ".codex", "skills"), {
      recursive: true
    });
    await writeFile(destination, "unsafe target\n", "utf8");
    await writeFile(linkPath, "unsafe link\n", "utf8");

    const result = await runSkillsInstallCommand(
      [
        "--skills",
        "UsePairflow",
        "--target-dir",
        ".claude",
        "--link-other",
        "--force"
      ],
      {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      }
    );

    expect(result?.status).toBe("replaced_existing");
    await expect(readFile(join(destination, "SKILL.md"), "utf8")).resolves.toContain(
      "UsePairflow"
    );
    await expect(readlink(linkPath)).resolves.toBe(destination);
  });

  it("keeps an existing install when staged directory replacement cannot copy source", async () => {
    const { homeDir } = await setupSourceAndHome();
    const destination = join(homeDir, ".claude", "skills", "UsePairflow");
    await mkdir(destination, {
      recursive: true
    });
    await writeFile(join(destination, "SKILL.md"), "previous install\n", "utf8");

    await expect(
      nodeSkillsInstallFileSystem.replaceDirectoryFromSource({
        source: join(homeDir, "missing-source"),
        destination,
        expectedDestination: {
          exists: true,
          type: "directory"
        }
      })
    ).rejects.toMatchObject({
      code: "ENOENT"
    });

    await expect(readFile(join(destination, "SKILL.md"), "utf8")).resolves.toBe(
      "previous install\n"
    );
  });

  it("fails closed without deleting when a managed target changes after preflight", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const destination = join(homeDir, ".claude", "skills", "UsePairflow");
    await mkdir(destination, {
      recursive: true
    });
    await writeFile(join(destination, "SKILL.md"), "previous install\n", "utf8");
    const expectedDestination = await nodeSkillsInstallFileSystem.pathStatus(
      destination
    );
    await rm(destination, {
      recursive: true,
      force: true
    });
    await mkdir(destination, {
      recursive: true
    });
    await writeFile(join(destination, "replacement.txt"), "concurrent directory\n", "utf8");

    await expect(
      nodeSkillsInstallFileSystem.replaceDirectoryFromSource({
        source: join(sourceRoot, "UsePairflow"),
        destination,
        expectedDestination
      })
    ).rejects.toThrow("changed after preflight");

    await expect(readFile(join(destination, "replacement.txt"), "utf8")).resolves.toBe(
      "concurrent directory\n"
    );
  });

  it("uses staged replacement primitives instead of remove-before-copy application flow", async () => {
    const calls: string[] = [];
    const sourceRoot = "/source/.claude/skills";
    const homeDir = "/home";
    const fakeFs: SkillsInstallFileSystem = {
      async pathStatus(path) {
        if (
          path === sourceRoot
          || path === join(sourceRoot, "UsePairflow")
          || path === join(homeDir, ".claude", "skills", "UsePairflow")
          || path === join(homeDir, ".codex", "skills", "UsePairflow")
        ) {
          return {
            exists: true,
            type: path.endsWith("UsePairflow") && path.startsWith(homeDir)
              ? "symlink"
              : "directory"
          };
        }
        return {
          exists: false
        };
      },
      async realPathIfExists(path) {
        if (path === sourceRoot) {
          return path;
        }
        return null;
      },
      async ensureDirectory(path) {
        calls.push(`ensure:${path}`);
      },
      async removePath(path) {
        calls.push(`remove:${path}`);
      },
      async copyDirectory(source, destination) {
        calls.push(`copy:${source}->${destination}`);
      },
      async createSymlink(target, linkPath) {
        calls.push(`symlink:${target}->${linkPath}`);
      },
      async replaceDirectoryFromSource(input) {
        calls.push(`replace-dir:${input.source}->${input.destination}`);
      },
      async replaceSymlink(input) {
        calls.push(`replace-link:${input.target}->${input.linkPath}`);
        throw new Error("simulated symlink replace failure");
      }
    };

    await expect(
      installPairflowSkills(
        {
          skills: ["UsePairflow"],
          targetDir: ".claude",
          linkOther: true,
          force: true,
          dryRun: false
        },
        {
          homeDir,
          sourceRootCandidates: [sourceRoot],
          fs: fakeFs
        }
      )
    ).rejects.toThrow("simulated symlink replace failure");

    expect(calls).toContain(
      `replace-dir:${join(sourceRoot, "UsePairflow")}->${join(homeDir, ".claude", "skills", "UsePairflow")}`
    );
    expect(calls).toContain(
      `replace-link:${join(homeDir, ".claude", "skills", "UsePairflow")}->${join(homeDir, ".codex", "skills", "UsePairflow")}`
    );
    expect(calls.some((call) => call.startsWith("remove:"))).toBe(false);
    expect(calls.some((call) => call.startsWith("copy:"))).toBe(false);
    expect(calls.some((call) => call.startsWith("symlink:"))).toBe(false);
  });

  it("fails closed when selected package source files are missing", async () => {
    const root = await createTempDir("pairflow-skills-missing-source-");
    const sourceRoot = join(root, "package", ".claude", "skills");
    const homeDir = join(root, "home");
    await writeSkillSource(sourceRoot, "UsePairflow");

    await expect(
      runSkillsInstallCommand(["--skills", "UsePairflow,ExecutePairflowPlan"], {
        homeDir,
        sourceRootCandidates: [sourceRoot]
      })
    ).rejects.toThrow("source files were not found");
  });

  it("renders deterministic text summary", async () => {
    const { sourceRoot, homeDir } = await setupSourceAndHome();
    const result = await runSkillsInstallCommand(["--skills", "UsePairflow"], {
      homeDir,
      sourceRootCandidates: [sourceRoot]
    });

    expect(result).not.toBeNull();
    expect(renderSkillsInstallText(result!)).toContain(
      "Pairflow skills install summary:"
    );
    expect(renderSkillsInstallText(result!)).toContain(`- Source root: ${sourceRoot}`);
    expect(renderSkillsInstallText(result!)).toContain("- Status: fresh install");
  });
});
