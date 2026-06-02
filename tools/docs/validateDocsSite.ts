import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import YAML from "yaml";

const execFileAsync = promisify(execFile);
const requiredOutputFiles = [
  "docs/site-dist/index.html",
  "docs/site-dist/install.html",
  "docs/site-dist/upgrade.html",
  "docs/site-dist/cli-basics.html",
  "docs/site-dist/ui.html",
  "docs/site-dist/skills.html",
  "docs/site-dist/release.html",
  "docs/site-dist/pages.html",
  "docs/site-dist/styles.css"
];

type Workflow = {
  on?: unknown;
  permissions?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
};

async function main(): Promise<void> {
  await validatePackageScript();
  await validateGeneratedOutput();
  await validateWorkflow();
  await validateGeneratedOutputIsIgnored();
  console.log("Docs site validation passed");
}

async function validatePackageScript(): Promise<void> {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };
  assert(
    packageJson.scripts?.["docs:build"] === "pnpm exec tsx ./tools/docs/buildDocsSite.ts",
    "package.json must define docs:build with the repo-local docs builder"
  );
  assert(
    packageJson.scripts?.["docs:validate"] === "pnpm docs:build && pnpm exec tsx ./tools/docs/validateDocsSite.ts",
    "package.json must define docs:validate as the docs build plus validator gate"
  );
}

async function validateGeneratedOutput(): Promise<void> {
  for (const file of requiredOutputFiles) {
    await stat(file);
  }
  const combined = await Promise.all(
    requiredOutputFiles
      .filter((file) => file.endsWith(".html"))
      .map((file) => readFile(file, "utf8"))
  );
  const output = combined.join("\n");
  for (const needle of [
    "@pairflow/cli",
    "pairflow",
    "npm install",
    "version pin",
    "pairflow ui",
    "repo-local install workflow",
    "guarded",
    "GitHub Pages"
  ]) {
    assert(output.includes(needle), `generated docs output must include ${needle}`);
  }
  for (const forbidden of [
    "pairflow skills install is available",
    "pairflow ui start is available",
    "pairflow ui stop is available",
    "pairflow ui status is available",
    "pairflow ui restart is available",
    "public URL is proven"
  ]) {
    assert(!output.includes(forbidden), `generated docs output must not include ${forbidden}`);
  }
}

async function validateWorkflow(): Promise<void> {
  const workflowText = await readFile(".github/workflows/docs-pages.yml", "utf8");
  const document = YAML.parseDocument(workflowText);
  assert(document.errors.length === 0, `workflow YAML parse errors: ${document.errors.join(", ")}`);
  const workflow = document.toJSON() as Workflow;
  const triggers = workflow.on;
  assert(isRecord(triggers), "docs workflow must define event triggers");
  const push = triggers["push"];
  const release = triggers["release"];
  assert(isRecord(push) && Array.isArray(push["branches"]) && push["branches"].includes("main"), "docs workflow must run on pushes to main");
  assert(
    isRecord(release) && Array.isArray(release["types"]) && release["types"].includes("published"),
    "docs workflow must run on published release events"
  );
  assert("workflow_dispatch" in triggers, "docs workflow should support manual dispatch");

  assert(workflow.permissions?.["pages"] === "write", "docs workflow must grant pages: write");
  assert(workflow.permissions?.["id-token"] === "write", "docs workflow must grant id-token: write");
  assert(workflow.permissions?.["contents"] === "read", "docs workflow must grant contents: read");

  assert(workflowText.includes("pnpm docs:validate"), "docs workflow must run pnpm docs:validate before upload");
  assert(workflowText.includes("path: docs/site-dist"), "docs workflow must upload docs/site-dist");
  assert(workflowText.includes("actions/upload-pages-artifact"), "docs workflow must upload a Pages artifact");
  assert(workflowText.includes("actions/deploy-pages"), "docs workflow must deploy through GitHub Pages");
}

async function validateGeneratedOutputIsIgnored(): Promise<void> {
  const { stdout } = await execFileAsync("git", ["check-ignore", "docs/site-dist/index.html"]);
  assert(stdout.includes("docs/site-dist/index.html"), "docs/site-dist output must be ignored");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

await main();
