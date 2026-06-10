import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";
import type { AlmostE2eSmokeFixtureRepo } from "./fixtureRepo.js";

export interface CompiledCliInvocation {
  entrypointPath: string;
  argv: string[];
  cwd: string;
}

export interface CompiledCliResult {
  invocation: CompiledCliInvocation;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CompiledCliHarness {
  entrypointPath: string;
  invocations: CompiledCliInvocation[];
  run(argv: string[], options?: CompiledCliRunOptions): Promise<CompiledCliResult>;
}

export interface CompiledCliRunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  expectedExitCode?: number;
  timeoutMs?: number;
}

export interface CompiledCliShimEnvironment {
  shimDir: string;
  homeDir: string;
  sideEffectLogPath: string;
  repoRegistryPath: string;
  env: NodeJS.ProcessEnv;
  readSideEffects(): Promise<CompiledCliSideEffectRecord[]>;
}

export interface CompiledCliSideEffectRecord {
  tool: string;
  args: string[];
  cwd?: string;
}

export interface CreateCompiledCliHarnessOptions {
  entrypointPath?: string;
}

const defaultEntrypointPath = "dist/cli/index.js";
const defaultCommandTimeoutMs = 20_000;

function buildCompiledCliEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries({
      ...Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith("PAIRFLOW_"))
      ),
      ...overrides
    }).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}

function buildMissingEntrypointMessage(entrypointPath: string): string {
  return [
    "COMPILED_CLI_ENTRYPOINT_MISSING:",
    `Expected compiled Pairflow CLI at ${entrypointPath}.`,
    "Run `pnpm build` before collecting compiled CLI smoke evidence."
  ].join(" ");
}

async function assertCompiledEntrypointExists(entrypointPath: string): Promise<void> {
  try {
    await access(entrypointPath, fsConstants.R_OK);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      throw new Error(buildMissingEntrypointMessage(entrypointPath));
    }
    throw error;
  }
}

export function createCompiledCliHarness(
  options: CreateCompiledCliHarnessOptions = {}
): CompiledCliHarness {
  const entrypointPath = resolve(options.entrypointPath ?? defaultEntrypointPath);
  const invocations: CompiledCliInvocation[] = [];

  return {
    entrypointPath,
    invocations,
    run: async (argv, options = {}) => {
      await assertCompiledEntrypointExists(entrypointPath);
      const cwd = options.cwd ?? process.cwd();
      const invocation: CompiledCliInvocation = {
        entrypointPath,
        argv: [...argv],
        cwd
      };
      invocations.push(invocation);

      return new Promise<CompiledCliResult>((resolvePromise, rejectPromise) => {
        let settled = false;
        let timedOut = false;
        const child = spawn(process.execPath, [entrypointPath, ...argv], {
          cwd,
          env: buildCompiledCliEnv(options.env),
          detached: true,
          stdio: ["ignore", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        const timeoutMs = options.timeoutMs ?? defaultCommandTimeoutMs;
        const timeout = setTimeout(() => {
          if (settled) {
            return;
          }
          timedOut = true;
          if (child.pid === undefined) {
            child.kill("SIGKILL");
            return;
          }
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        }, timeoutMs);

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk: string) => {
          stderr += chunk;
        });
        child.on("error", (error) => {
          clearTimeout(timeout);
          if (settled) {
            return;
          }
          settled = true;
          rejectPromise(error);
        });
        child.on("close", (exitCode) => {
          clearTimeout(timeout);
          if (settled) {
            return;
          }
          settled = true;
          if (timedOut) {
            rejectPromise(
              new Error(
                [
                  `COMPILED_CLI_COMMAND_TIMEOUT: node ${entrypointPath} ${argv.join(" ")}`,
                  `timeout_ms=${timeoutMs}`,
                  `stdout=${JSON.stringify(stdout.trim())}`,
                  `stderr=${JSON.stringify(stderr.trim())}`
                ].join(" ")
              )
            );
            return;
          }
          const code = exitCode ?? 1;
          const result: CompiledCliResult = {
            invocation,
            stdout,
            stderr,
            exitCode: code
          };
          const expectedExitCode = options.expectedExitCode ?? 0;
          if (code !== expectedExitCode) {
            rejectPromise(
              new Error(
                [
                  `COMPILED_CLI_COMMAND_FAILED: node ${entrypointPath} ${argv.join(" ")}`,
                  `expected_exit=${expectedExitCode}`,
                  `actual_exit=${code}`,
                  `stdout=${JSON.stringify(stdout.trim())}`,
                  `stderr=${JSON.stringify(stderr.trim())}`
                ].join(" ")
              )
            );
            return;
          }
          resolvePromise(result);
        });
      });
    }
  };
}

function buildTmuxShimScript(): string {
  return `#!/usr/bin/env node
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require("node:fs");

const args = process.argv.slice(2);
const logPath = process.env.PAIRFLOW_SMOKE_SIDE_EFFECT_LOG;
const statePath = process.env.PAIRFLOW_SMOKE_TMUX_STATE;

function log() {
  if (!logPath) return;
  appendFileSync(logPath, JSON.stringify({
    tool: "tmux",
    args,
    cwd: process.cwd()
  }) + "\\n");
}

function readState() {
  if (!statePath || !existsSync(statePath)) {
    return {
      sessions: {},
      nextPaneId: 100,
      nextPaneIndex: 1,
      paneAliases: {},
      paneBuffers: {},
      paneHistory: {}
    };
  }
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  state.paneAliases ||= {};
  state.paneBuffers ||= {};
  state.paneHistory ||= {};
  return state;
}

function writeState(state) {
  if (!statePath) return;
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

log();
const state = readState();
const command = args[0];

function normalizeSession(session) {
  if (!session) return { panes: [] };
  if (session === true) return { panes: [] };
  if (Array.isArray(session.panes)) return session;
  return { panes: [] };
}

function sessionNameForTarget(target) {
  if (!target || target.startsWith("%")) return undefined;
  return target.split(":")[0];
}

function paneSelectorForTarget(target) {
  if (!target || target.startsWith("%")) return undefined;
  const colonIndex = target.indexOf(":");
  if (colonIndex < 0) return undefined;
  const selector = target.slice(colonIndex + 1);
  if (!selector.includes(".")) return undefined;
  return selector;
}

function sessionHasPane(session, paneId) {
  return normalizeSession(session).panes.includes(paneId);
}

function registerPaneAlias(paneId, paneIndex, sessionName) {
  const paneKey = paneId;
  state.paneAliases[paneId] = paneKey;
  state.paneAliases[paneIndex] = paneKey;
  if (sessionName) {
    state.paneAliases[sessionName + ":" + paneIndex] = paneKey;
  }
  state.paneBuffers[paneKey] ||= "";
  state.paneHistory[paneKey] ||= [];
}

function paneKeyForTarget(target) {
  if (!target) return undefined;
  if (state.paneAliases[target]) return state.paneAliases[target];
  if (target.startsWith("%")) return target;
  const session = sessionNameForTarget(target);
  const paneSelector = paneSelectorForTarget(target);
  if (session && paneSelector) {
    return state.paneAliases[session + ":" + paneSelector] || state.paneAliases[paneSelector] || target;
  }
  return target;
}

function paneTargetExists(target) {
  if (!target || !target.startsWith("%")) return false;
  return Object.values(state.sessions).some((session) => sessionHasPane(session, target));
}

function targetExists(target) {
  if (!target) return false;
  if (target.startsWith("%")) return paneTargetExists(target);
  const session = sessionNameForTarget(target);
  if (!session || !state.sessions[session]) return false;
  const paneSelector = paneSelectorForTarget(target);
  if (paneSelector === undefined) return true;
  return sessionHasPane(state.sessions[session], paneSelector);
}

function assertTargetExists(target) {
  if (targetExists(target)) return;
  process.stderr.write("can't find target\\n");
  process.exit(1);
}

if (command === "has-session") {
  const session = valueAfter("-t");
  if (session && state.sessions[session]) {
    process.exit(0);
  }
  process.stderr.write("can't find session\\n");
  process.exit(1);
}

if (command === "new-session") {
  const session = valueAfter("-s");
  if (session && state.sessions[session]) {
    process.stderr.write("duplicate session\\n");
    process.exit(1);
  }
  if (session) {
    const paneId = "%" + (state.nextPaneId || 100);
    const paneIndex = "0.0";
    state.sessions[session] = { panes: [paneId, paneIndex] };
    registerPaneAlias(paneId, paneIndex, session);
    state.nextPaneIndex = 1;
    writeState(state);
  }
  process.exit(0);
}

if (
  command === "set-option"
  || command === "set-window-option"
  || command === "set-environment"
  || command === "set-hook"
  || command === "run-shell"
) {
  process.exit(0);
}

if (
  command === "resize-pane"
  || command === "respawn-pane"
) {
  const target = valueAfter("-t");
  if (target) {
    assertTargetExists(target);
  }
  process.exit(0);
}

if (command === "split-window") {
  const target = valueAfter("-t");
  if (target) {
    assertTargetExists(target);
  }
  const session = sessionNameForTarget(target) || Object.keys(state.sessions)[0];
  if (!session || !state.sessions[session]) {
    process.stderr.write("can't find target session\\n");
    process.exit(1);
  }
  state.nextPaneId = (state.nextPaneId || 100) + 1;
  const paneId = "%" + state.nextPaneId;
  const paneIndex = "0." + (state.nextPaneIndex || normalizeSession(state.sessions[session]).panes.filter((pane) => /^0\\.[0-9]+$/.test(pane)).length);
  state.nextPaneIndex = (state.nextPaneIndex || 1) + 1;
  const normalizedSession = normalizeSession(state.sessions[session]);
  normalizedSession.panes.push(paneId);
  normalizedSession.panes.push(paneIndex);
  state.sessions[session] = normalizedSession;
  registerPaneAlias(paneId, paneIndex, session);
  writeState(state);
  process.stdout.write(paneId + "\\n");
  process.exit(0);
}

if (command === "display-message") {
  const target = valueAfter("-t");
  if (target) {
    assertTargetExists(target);
  }
  const format = args[args.length - 1] || "";
  process.stdout.write(format.includes("pane_in_mode") ? "0\\n" : "40\\n");
  process.exit(0);
}

if (command === "capture-pane") {
  const target = valueAfter("-t");
  if (target) {
    assertTargetExists(target);
  }
  const paneKey = paneKeyForTarget(target);
  const history = paneKey ? (state.paneHistory[paneKey] || []) : [];
  const buffer = paneKey ? (state.paneBuffers[paneKey] || "") : "";
  const lines = [...history];
  lines.push(buffer.length > 0 ? "> " + buffer : "> ");
  process.stdout.write(lines.join("\\n") + "\\n");
  process.exit(0);
}

if (command === "send-keys") {
  const target = valueAfter("-t");
  assertTargetExists(target);
  const paneKey = paneKeyForTarget(target);
  if (paneKey) {
    const literalIndex = args.indexOf("-l");
    if (literalIndex >= 0) {
      state.paneBuffers[paneKey] = (state.paneBuffers[paneKey] || "") + (args[literalIndex + 1] || "");
      writeState(state);
      process.exit(0);
    }
    if (args.includes("Enter")) {
      const buffer = state.paneBuffers[paneKey] || "";
      if (buffer.length > 0) {
        state.paneHistory[paneKey] ||= [];
        state.paneHistory[paneKey].push(buffer);
        state.paneBuffers[paneKey] = "";
        writeState(state);
      }
      process.exit(0);
    }
  }
  process.exit(0);
}

if (command === "kill-session") {
  const session = valueAfter("-t");
  if (session && state.sessions[session]) {
    for (const pane of normalizeSession(state.sessions[session]).panes) {
      const paneKey = paneKeyForTarget(pane);
      if (paneKey) {
        delete state.paneBuffers[paneKey];
        delete state.paneHistory[paneKey];
      }
      delete state.paneAliases[pane];
      delete state.paneAliases[session + ":" + pane];
    }
    delete state.sessions[session];
    writeState(state);
    process.exit(0);
  }
  process.stderr.write("can't find session\\n");
  process.exit(1);
}

process.stderr.write("Unsupported smoke tmux command: " + args.join(" ") + "\\n");
process.exit(64);
`;
}

function buildOpenShimScript(): string {
  return `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");

const logPath = process.env.PAIRFLOW_SMOKE_SIDE_EFFECT_LOG;
if (logPath) {
  appendFileSync(logPath, JSON.stringify({
    tool: "pairflow-smoke-open",
    args: process.argv.slice(2),
    cwd: process.cwd()
  }) + "\\n");
}
`;
}

function buildCodexShimScript(): string {
  return `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");

const args = process.argv.slice(2);
const logPath = process.env.PAIRFLOW_SMOKE_SIDE_EFFECT_LOG;
if (logPath) {
  appendFileSync(logPath, JSON.stringify({
    tool: "codex",
    args,
    cwd: process.cwd()
  }) + "\\n");
}

if (args[0] === "mcp" && args[1] === "list" && args[2] === "--json") {
  process.stdout.write("[]\\n");
  process.exit(0);
}

process.stderr.write("Unsupported smoke codex command: " + args.join(" ") + "\\n");
process.exit(64);
`;
}

export async function installCompiledCliShimEnvironment(
  fixture: AlmostE2eSmokeFixtureRepo
): Promise<CompiledCliShimEnvironment> {
  const supportDir = join(fixture.root, ".pairflow-smoke");
  const shimDir = join(supportDir, "bin");
  const homeDir = join(supportDir, "home");
  const pairflowHomeDir = join(homeDir, ".pairflow");
  const sideEffectLogPath = join(supportDir, "side-effects.jsonl");
  const tmuxStatePath = join(supportDir, "tmux-state.json");
  const repoRegistryPath = join(supportDir, "repos.json");
  await mkdir(shimDir, { recursive: true });
  await mkdir(pairflowHomeDir, { recursive: true });
  await writeFile(join(pairflowHomeDir, "config.toml"), [
    `open_command = "pairflow-smoke-open {{worktree_path}}"`,
    ""
  ].join("\n"), "utf8");
  const tmuxShimPath = join(shimDir, "tmux");
  const openShimPath = join(shimDir, "pairflow-smoke-open");
  const codexShimPath = join(shimDir, "codex");
  await writeFile(tmuxShimPath, buildTmuxShimScript(), "utf8");
  await writeFile(openShimPath, buildOpenShimScript(), "utf8");
  await writeFile(codexShimPath, buildCodexShimScript(), "utf8");
  await chmod(tmuxShimPath, 0o755);
  await chmod(openShimPath, 0o755);
  await chmod(codexShimPath, 0o755);

  return {
    shimDir,
    homeDir,
    sideEffectLogPath,
    repoRegistryPath,
    env: {
      HOME: homeDir,
      PATH: `${shimDir}${delimiter}${process.env.PATH ?? ""}`,
      PAIRFLOW_REPO_REGISTRY_PATH: repoRegistryPath,
      PAIRFLOW_SMOKE_FAST_TMUX_DELIVERY: "1",
      PAIRFLOW_SMOKE_SIDE_EFFECT_LOG: sideEffectLogPath,
      PAIRFLOW_SMOKE_TMUX_STATE: tmuxStatePath
    },
    readSideEffects: async () => {
      const raw = await readFile(sideEffectLogPath, "utf8").catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") {
            return "";
          }
          throw error;
        }
      );
      return raw
        .split(/\r?\n/u)
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as CompiledCliSideEffectRecord);
    }
  };
}
