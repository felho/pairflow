import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import type {
  PairflowSkillName,
  SkillsInstallFileSystem,
  SkillsInstallOperation,
  SkillsInstallOptions,
  SkillsInstallPathStatus,
  SkillsInstallPlan,
  SkillsInstallRuntime,
  SkillsInstallStatus
} from "./skillsInstallContract.js";

export class SkillsInstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillsInstallError";
  }
}

interface ManagedPathPreflight {
  path: string;
  status: SkillsInstallPathStatus;
  unsafe: boolean;
}

function otherTargetDir(targetDir: ".claude" | ".codex"): ".claude" | ".codex" {
  return targetDir === ".claude" ? ".codex" : ".claude";
}

function isDirectory(status: SkillsInstallPathStatus): boolean {
  return status.exists && status.type === "directory";
}

async function resolveSourceRoot(
  sourceRootCandidates: string[],
  selectedSkills: PairflowSkillName[],
  fs: SkillsInstallFileSystem
): Promise<string> {
  for (const sourceRoot of sourceRootCandidates) {
    const rootStatus = await fs.pathStatus(sourceRoot);
    if (!isDirectory(rootStatus)) {
      continue;
    }

    let containsAllSelectedSkills = true;
    for (const skill of selectedSkills) {
      const skillStatus = await fs.pathStatus(join(sourceRoot, skill));
      if (!isDirectory(skillStatus)) {
        containsAllSelectedSkills = false;
        break;
      }
    }

    if (containsAllSelectedSkills) {
      return sourceRoot;
    }
  }

  throw new SkillsInstallError(
    `Pairflow skill source files were not found. Expected all selected skills under one package or checkout source root: ${sourceRootCandidates.join(", ")}`
  );
}

async function preflightManagedPaths(input: {
  operations: SkillsInstallOperation[];
  force: boolean;
  fs: SkillsInstallFileSystem;
}): Promise<{
  targetPreflights: ManagedPathPreflight[];
  linkPreflights: ManagedPathPreflight[];
}> {
  const targetPreflights: ManagedPathPreflight[] = [];
  const linkPreflights: ManagedPathPreflight[] = [];

  for (const operation of input.operations) {
    if (operation.kind !== "sync_skill") {
      continue;
    }
    const status = await input.fs.pathStatus(operation.destination);
    targetPreflights.push({
      path: operation.destination,
      status,
      unsafe: status.exists && status.type !== "directory"
    });
  }

  for (const operation of input.operations) {
    if (operation.kind !== "link_other") {
      continue;
    }
    const status = await input.fs.pathStatus(operation.linkPath);
    linkPreflights.push({
      path: operation.linkPath,
      status,
      unsafe: status.exists && status.type !== "symlink"
    });
  }

  const unsafePath = [...targetPreflights, ...linkPreflights].find(
    (preflight) => preflight.unsafe
  );
  if (unsafePath !== undefined && !input.force) {
    throw new SkillsInstallError(
      `Unsafe existing managed path requires --force before replacement: ${unsafePath.path}`
    );
  }

  return {
    targetPreflights,
    linkPreflights
  };
}

async function assertLinkOtherRootsDoNotAlias(input: {
  targetAgentRoot: string;
  otherAgentRoot: string;
  targetRoot: string;
  otherRoot: string;
  fs: SkillsInstallFileSystem;
}): Promise<void> {
  const [targetStatus, otherStatus, targetSkillsStatus, otherSkillsStatus] = await Promise.all([
    input.fs.pathStatus(input.targetAgentRoot),
    input.fs.pathStatus(input.otherAgentRoot),
    input.fs.pathStatus(input.targetRoot),
    input.fs.pathStatus(input.otherRoot)
  ]);
  const symlinkRoot = [
    { path: input.targetAgentRoot, status: targetStatus },
    { path: input.otherAgentRoot, status: otherStatus },
    { path: input.targetRoot, status: targetSkillsStatus },
    { path: input.otherRoot, status: otherSkillsStatus }
  ].find((root) => root.status.exists && root.status.type === "symlink");

  if (symlinkRoot !== undefined) {
    throw new SkillsInstallError(
      `Cannot use --link-other when an agent or skills root is a symlink that may alias the selected target root: ${symlinkRoot.path}`
    );
  }

  const [
    realTargetAgentRoot,
    realOtherAgentRoot,
    realTargetRoot,
    realOtherRoot
  ] = await Promise.all([
    input.fs.realPathIfExists(input.targetAgentRoot),
    input.fs.realPathIfExists(input.otherAgentRoot),
    input.fs.realPathIfExists(input.targetRoot),
    input.fs.realPathIfExists(input.otherRoot)
  ]);
  if (
    realTargetAgentRoot !== null
    && realOtherAgentRoot !== null
    && realTargetAgentRoot === realOtherAgentRoot
  ) {
    throw new SkillsInstallError(
      `Cannot use --link-other when target agent roots resolve to the same directory: ${input.targetAgentRoot} and ${input.otherAgentRoot}`
    );
  }
  if (
    realTargetRoot !== null
    && realOtherRoot !== null
    && realTargetRoot === realOtherRoot
  ) {
    throw new SkillsInstallError(
      `Cannot use --link-other when target skills roots resolve to the same directory: ${input.targetRoot} and ${input.otherRoot}`
    );
  }
}

async function assertManagedPathsDoNotOverlapSourceRoot(input: {
  sourceRoot: string;
  operations: SkillsInstallOperation[];
  fs: SkillsInstallFileSystem;
}): Promise<void> {
  const sourceRoot = resolve(input.sourceRoot);
  const realSourceRoot = await input.fs.realPathIfExists(sourceRoot);
  for (const operation of input.operations) {
    const managedPath =
      operation.kind === "sync_skill" ? operation.destination : operation.linkPath;
    if (isSameOrInside(sourceRoot, managedPath)) {
      throw new SkillsInstallError(
        `Managed install path overlaps Pairflow skill source root and would risk deleting source files: ${managedPath}`
      );
    }
    if (
      realSourceRoot !== null
      && await managedPathResolvesInsideSourceRoot({
        managedPath,
        realSourceRoot,
        fs: input.fs
      })
    ) {
      throw new SkillsInstallError(
        `Managed install path resolves inside Pairflow skill source root and would risk deleting source files: ${managedPath}`
      );
    }
  }
}

function isSameOrInside(basePath: string, candidatePath: string): boolean {
  const relativePath = relative(basePath, resolve(candidatePath));
  return (
    relativePath === ""
    || (
      relativePath.length > 0
      && !relativePath.startsWith(`..${sep}`)
      && relativePath !== ".."
      && !isAbsolute(relativePath)
    )
  );
}

async function managedPathResolvesInsideSourceRoot(input: {
  managedPath: string;
  realSourceRoot: string;
  fs: SkillsInstallFileSystem;
}): Promise<boolean> {
  const realManagedPrefix = await realPathOfNearestExistingPath(
    input.managedPath,
    input.fs
  );
  return (
    realManagedPrefix !== null
    && isSameOrInside(input.realSourceRoot, realManagedPrefix)
  );
}

async function realPathOfNearestExistingPath(
  path: string,
  fs: SkillsInstallFileSystem
): Promise<string | null> {
  let candidate = resolve(path);
  while (true) {
    const realPath = await fs.realPathIfExists(candidate);
    if (realPath !== null) {
      return realPath;
    }
    const parent = dirname(candidate);
    if (parent === candidate) {
      return null;
    }
    candidate = parent;
  }
}

function resolveStatus(input: {
  dryRun: boolean;
  targetPreflights: ManagedPathPreflight[];
  linkPreflights: ManagedPathPreflight[];
}): SkillsInstallStatus {
  if (input.dryRun) {
    return "planned";
  }
  if (
    [...input.targetPreflights, ...input.linkPreflights].some(
      (preflight) => preflight.unsafe
    )
  ) {
    return "replaced_existing";
  }
  if (
    input.targetPreflights.some((preflight) => preflight.status.exists)
    || input.linkPreflights.some((preflight) => preflight.status.exists)
  ) {
    return "updated_existing";
  }
  return "fresh_install";
}

async function executeInstall(input: {
  plan: SkillsInstallPlan;
  preflight: {
    targetPreflights: ManagedPathPreflight[];
    linkPreflights: ManagedPathPreflight[];
  };
  fs: SkillsInstallFileSystem;
}): Promise<void> {
  if (input.plan.dryRun) {
    return;
  }

  await input.fs.ensureDirectory(input.plan.targetRoot);
  if (input.plan.otherRoot !== undefined) {
    await input.fs.ensureDirectory(input.plan.otherRoot);
  }

  const targetPreflights = new Map(
    input.preflight.targetPreflights.map((preflight) => [
      preflight.path,
      preflight.status
    ])
  );
  const linkPreflights = new Map(
    input.preflight.linkPreflights.map((preflight) => [
      preflight.path,
      preflight.status
    ])
  );

  for (const operation of input.plan.operations) {
    if (operation.kind === "sync_skill") {
      const expectedDestination = targetPreflights.get(operation.destination);
      if (expectedDestination === undefined) {
        throw new SkillsInstallError(
          `Missing preflight status for managed install path: ${operation.destination}`
        );
      }
      await input.fs.replaceDirectoryFromSource({
        source: operation.source,
        destination: operation.destination,
        expectedDestination
      });
    }
  }

  for (const operation of input.plan.operations) {
    if (operation.kind === "link_other") {
      const expectedLinkPath = linkPreflights.get(operation.linkPath);
      if (expectedLinkPath === undefined) {
        throw new SkillsInstallError(
          `Missing preflight status for managed link path: ${operation.linkPath}`
        );
      }
      await input.fs.replaceSymlink({
        target: operation.target,
        linkPath: operation.linkPath,
        expectedLinkPath
      });
    }
  }
}

export async function installPairflowSkills(
  options: SkillsInstallOptions,
  runtime: SkillsInstallRuntime
): Promise<SkillsInstallPlan> {
  const sourceRoot = await resolveSourceRoot(
    runtime.sourceRootCandidates,
    options.skills,
    runtime.fs
  );
  const targetRoot = join(runtime.homeDir, options.targetDir, "skills");
  const targetAgentRoot = join(runtime.homeDir, options.targetDir);
  const otherAgentRoot = join(runtime.homeDir, otherTargetDir(options.targetDir));
  const otherRoot = options.linkOther
    ? join(otherAgentRoot, "skills")
    : undefined;

  const operations: SkillsInstallOperation[] = options.skills.flatMap((skill) => {
    const source = join(sourceRoot, skill);
    const destination = join(targetRoot, skill);
    const syncOperation: SkillsInstallOperation = {
      kind: "sync_skill",
      skill,
      source,
      destination
    };
    if (otherRoot === undefined) {
      return [syncOperation];
    }
    return [
      syncOperation,
      {
        kind: "link_other",
        skill,
        linkPath: join(otherRoot, skill),
        target: destination
      }
    ];
  });

  await assertManagedPathsDoNotOverlapSourceRoot({
    sourceRoot,
    operations,
    fs: runtime.fs
  });

  if (options.dryRun) {
    return {
      sourceRoot,
      targetRoot,
      targetDir: options.targetDir,
      selectedSkills: options.skills,
      dryRun: options.dryRun,
      force: options.force,
      linkOther: options.linkOther,
      ...(otherRoot === undefined ? {} : { otherRoot }),
      status: "planned",
      operations
    };
  }

  if (otherRoot !== undefined) {
    await assertLinkOtherRootsDoNotAlias({
      targetAgentRoot,
      otherAgentRoot,
      targetRoot,
      otherRoot,
      fs: runtime.fs
    });
  }

  const preflight = await preflightManagedPaths({
    operations,
    force: options.force,
    fs: runtime.fs
  });
  const status = resolveStatus({
    dryRun: options.dryRun,
    targetPreflights: preflight.targetPreflights,
    linkPreflights: preflight.linkPreflights
  });

  const plan: SkillsInstallPlan = {
    sourceRoot,
    targetRoot,
    targetDir: options.targetDir,
    selectedSkills: options.skills,
    dryRun: options.dryRun,
    force: options.force,
    linkOther: options.linkOther,
    ...(otherRoot === undefined ? {} : { otherRoot }),
    status,
    operations
  };

  await executeInstall({
    plan,
    preflight,
    fs: runtime.fs
  });

  return plan;
}
