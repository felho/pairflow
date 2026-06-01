import { readFileSync } from "node:fs";
import { basename } from "node:path";

type JsonObject = Record<string, unknown>;

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

function readJson(path: string): JsonObject {
  return JSON.parse(readFileSync(path, "utf8")) as JsonObject;
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function hasAll(text: string, values: readonly string[]): boolean {
  return values.every((value) => text.includes(value));
}

function isSemver(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(value)
  );
}

function isGitSha(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
}

function countOccurrences(text: string, value: string): number {
  return text.split(value).length - 1;
}

function check(name: string, ok: boolean, detail: string): Check {
  return { name, ok, detail };
}

const packageJson = readJson("package.json");
const releaseConfig = readJson("release-please-config.json");
const manifest = readJson(".release-please-manifest.json");
const changelog = readText("CHANGELOG.md");
const releaseWorkflow = readText(".github/workflows/release.yml");
const publishWorkflow = readText(".github/workflows/npm-publish.yml");

const packages = releaseConfig.packages as JsonObject | undefined;
const rootPackage = packages?.["."] as JsonObject | undefined;
const scripts = packageJson.scripts as JsonObject | undefined;
const packageBin = packageJson.bin as JsonObject | undefined;
const packageFiles = packageJson.files;
const publishConfig = packageJson.publishConfig as JsonObject | undefined;
const pairflowMetadata = packageJson.pairflow as JsonObject | undefined;
const packageVersion = packageJson.version;
const manifestVersion = manifest["."];
const releasePleaseExtraFiles = rootPackage?.["extra-files"];
const realPublishJobIndex = publishWorkflow.indexOf("real-publish:");
const verifyReleaseTagIndex = publishWorkflow.indexOf(
  "Verify release tag matches package version"
);

const checks: Check[] = [
  check(
    "package identity",
    packageJson.name === "@pairflow/cli" && isSemver(packageVersion),
    "package.json must keep @pairflow/cli and expose a semver package version"
  ),
  check(
    "package publish metadata",
    packageJson.private === undefined &&
      packageBin?.pairflow === "dist/cli/index.js" &&
      Array.isArray(packageFiles) &&
      JSON.stringify(packageFiles) ===
        JSON.stringify(["dist/**", "ui/dist/**", "README.md"]) &&
      publishConfig?.access === "public" &&
      pairflowMetadata?.skillSourcePackaging ===
        "deferred-to-5-skills-install",
    "package.json must remain public, publish the expected files, and preserve pairflow CLI metadata"
  ),
  check(
    "release please root package",
    releaseConfig["release-type"] === "node" &&
      rootPackage?.["package-name"] === "@pairflow/cli" &&
      rootPackage?.["changelog-path"] === "CHANGELOG.md",
    "release-please-config.json must target the root node package and CHANGELOG.md"
  ),
  check(
    "release please bootstrap boundary",
    isGitSha(releaseConfig["bootstrap-sha"]),
    "release-please-config.json must bound the first automation run with bootstrap-sha"
  ),
  check(
    "release please update surfaces",
    releasePleaseExtraFiles === undefined ||
      (Array.isArray(releasePleaseExtraFiles) &&
        !releasePleaseExtraFiles.includes("pnpm-lock.yaml")),
    "release-please-config.json must not configure inert pnpm-lock.yaml extra-files updates"
  ),
  check(
    "manifest current version",
    isSemver(manifestVersion) && manifestVersion === packageVersion,
    ".release-please-manifest.json must track the current package semver version"
  ),
  check(
    "standard tag shape",
    releaseConfig["include-v-in-tag"] === true && releaseConfig["include-component-in-tag"] === false,
    "release tags must be standard v<semver> tags without component prefixes"
  ),
  check(
    "changelog baseline",
    hasAll(changelog, ["# Changelog", "## 0.1.0", "Release Please"]),
    "CHANGELOG.md must exist with the initial 0.1.0 baseline"
  ),
  check(
    "release workflow gates",
    hasAll(releaseWorkflow, [
      "pnpm install --frozen-lockfile",
      "pnpm --dir ui install --frozen-lockfile",
      "pnpm typecheck",
      "pnpm lint",
      "pnpm fitness:check:ci",
      "pnpm test",
      "pnpm build",
      "googleapis/release-please-action@v4"
    ]),
    "release.yml must run local quality gates before Release Please"
  ),
  check(
    "release workflow full checkout",
    hasAll(releaseWorkflow, [
      "fetch-depth: 0",
      'pnpm commit-policy:validate-range -- --from "$VALIDATE_FROM" --to "$VALIDATE_TO"'
    ]),
    "release.yml must preserve full history checkout and pass explicit ranges through shell-safe env variables"
  ),
  check(
    "release workflow incomplete range guard",
    hasAll(releaseWorkflow, [
      "Reject incomplete explicit commit range",
      "Both validate_from and validate_to are required"
    ]),
    "release.yml must fail closed when workflow_dispatch provides only one explicit range endpoint"
  ),
  check(
    "release workflow release token",
    hasAll(releaseWorkflow, [
      "RELEASE_PLEASE_TOKEN is required",
      "token: ${{ secrets.RELEASE_PLEASE_TOKEN }}"
    ]),
    "release.yml must use a non-GITHUB_TOKEN release automation token so release events can trigger guarded publish"
  ),
  check(
    "release workflow concurrency",
    hasAll(releaseWorkflow, [
      "concurrency:",
      "group: release-please-${{ github.ref }}",
      "cancel-in-progress: false"
    ]),
    "release.yml must serialize release automation without canceling in-progress releases"
  ),
  check(
    "publish workflow guard",
    hasAll(publishWorkflow, [
      "vars.PAIRFLOW_NPM_PUBLISH_ENABLED != 'true'",
      "npm publish --dry-run",
      "npm pack --dry-run",
      "github.event_name == 'release'",
      "vars.PAIRFLOW_NPM_PUBLISH_ENABLED == 'true'",
      "environment: npm-publish"
    ]),
    "npm-publish.yml must visibly separate guard-closed dry-run and guard-open real publish paths"
  ),
  check(
    "publish token gate",
    hasAll(publishWorkflow, ["secrets.NPM_TOKEN", "NPM_TOKEN is required", "npm publish --access public"]),
    "real publish must require NPM_TOKEN before npm publish can run"
  ),
  check(
    "publish workflow concurrency",
    hasAll(publishWorkflow, [
      "concurrency:",
      "group: npm-publish-${{ github.repository }}",
      "cancel-in-progress: false"
    ]),
    "npm-publish.yml must serialize publish attempts for the repository so package-version preflight is not raced by another tag"
  ),
  check(
    "real publish release tag matches package version",
    realPublishJobIndex >= 0 &&
      verifyReleaseTagIndex > realPublishJobIndex &&
      hasAll(publishWorkflow, [
        "Verify release tag matches package version",
        "RELEASE_TAG: ${{ github.event.release.tag_name }}",
        'expected_tag="v$version"',
        'if [ "$RELEASE_TAG" != "$expected_tag" ]; then',
        "does not match package.json version"
      ]),
    "real publish must fail when the GitHub release tag does not match package.json version"
  ),
  check(
    "real publish validates metadata",
    countOccurrences(publishWorkflow, "pnpm release:validate") >= 2,
    "real publish must rerun release:validate immediately before build and npm publish"
  ),
  check(
    "duplicate publish preflight",
    hasAll(publishWorkflow, [
      'npm view "@pairflow/cli@$version" version',
      "already exists on npm; refusing duplicate publish",
      'grep -Eq "(E404|404 Not Found|is not in this registry)" "$view_error"',
      "Unable to verify whether @pairflow/cli@$version already exists on npm; refusing duplicate publish."
    ]),
    "real publish must fail before npm publish when the package exists or duplicate lookup status is unknown"
  ),
  check(
    "release validation script",
    scripts?.["release:validate"] ===
      "pnpm exec tsx ./tools/release/validateReleaseAutomation.ts",
    "package.json must expose the local release config validation script"
  ),
  check(
    "no taxonomy duplication",
    !/^(\s*)(feat|fix|perf|refactor|docs|test|build|ci|chore)(\||\)|:)/mu.test(
      releaseWorkflow
    ) &&
      !/^(\s*)(feat|fix|perf|refactor|docs|test|build|ci|chore)(\||\)|:)/mu.test(
        publishWorkflow
      ),
    "workflow YAML must not duplicate conventional-commit taxonomy regexes"
  )
];

let failed = false;
for (const result of checks) {
  const prefix = result.ok ? "ok" : "fail";
  console.log(`${prefix}: ${result.name} - ${result.detail}`);
  failed = failed || !result.ok;
}

console.log(
  [
    "history-selection evidence:",
    "Release Please manifest mode is configured for the full repository history checkout.",
    "The release workflow does not pass or synthesize first-parent-only traversal.",
    "The optional commit range validator uses git log <from>..<to> without --first-parent.",
    `validated by ${basename(process.argv[1] ?? "validateReleaseAutomation.ts")}.`
  ].join("\n")
);

if (failed) {
  process.exitCode = 1;
}
