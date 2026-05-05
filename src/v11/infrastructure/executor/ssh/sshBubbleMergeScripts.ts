import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import type {
  ExecuteRemoteBubbleMergeCleanupCommandInput,
  ExecuteRemoteBubbleMergeCommandInput
} from "../../../shared/remote/remoteMergeContract.js";
import { buildMergeImportRef } from "../../../shared/remote/remoteMergeContract.js";
import {
  remoteMergeCleanupExitStatusEndMarker,
  remoteMergeCleanupExitStatusStartMarker,
  remoteMergeCleanupStderrEndMarker,
  remoteMergeCleanupStderrStartMarker,
  remoteMergeCleanupStdoutEndMarker,
  remoteMergeCleanupStdoutStartMarker,
  remoteMergeExitStatusEndMarker,
  remoteMergeExitStatusStartMarker,
  remoteMergeStderrEndMarker,
  remoteMergeStderrStartMarker,
  remoteMergeStdoutEndMarker,
  remoteMergeStdoutStartMarker
} from "./sshBubbleMergeMarkers.js";

function buildRemoteBubbleMergeCommandLine(
  input: ExecuteRemoteBubbleMergeCommandInput
): string {
  return [
    "git",
    "merge",
    "--no-ff",
    "--no-edit",
    shellQuote(input.bubbleBranch)
  ].join(" ");
}

export function buildRemoteBubbleMergeScript(
  input: ExecuteRemoteBubbleMergeCommandInput
): string {
  const remoteCommandLine = buildRemoteBubbleMergeCommandLine(input);
  const importRef = buildMergeImportRef(input.bubbleId);

  return [
    "set -euo pipefail",
    `cd ${shellQuote(input.remoteClonePath)}`,
    `base_branch=${shellQuote(input.baseBranch)}`,
    `bubble_branch=${shellQuote(input.bubbleBranch)}`,
    `import_ref=${shellQuote(importRef)}`,
    `bubble_id=${shellQuote(input.bubbleId)}`,
    `tmux_session_name=${shellQuote(input.tmuxSessionName ?? "")}`,
    "export base_branch bubble_branch import_ref bubble_id tmux_session_name",
    "stdout_file=$(mktemp)",
    "stderr_file=$(mktemp)",
    "cleanup() { rm -f \"$stdout_file\" \"$stderr_file\"; }",
    "trap cleanup EXIT",
    "command_exit_code=0",
    "set +e",
    "(",
    "  set -euo pipefail",
    "  git checkout \"$base_branch\" >&2",
    `  ${remoteCommandLine} >&2`,
    "  merge_commit_sha=$(git rev-parse HEAD)",
    "  git update-ref \"$import_ref\" \"$merge_commit_sha\"",
    "  export merge_commit_sha import_ref",
    "  node <<'NODE'",
    "const payload = {",
    "  bubbleId: process.env.bubble_id,",
    "  baseBranch: process.env.base_branch,",
    "  bubbleBranch: process.env.bubble_branch,",
    "  mergeCommitSha: process.env.merge_commit_sha,",
    "  importSource: {",
    "    kind: 'git_ref',",
    "    ref: process.env.import_ref,",
    "    commitSha: process.env.merge_commit_sha",
    "  },",
    "  cleanupPending: true",
    "};",
    "if (typeof process.env.tmux_session_name === 'string' && process.env.tmux_session_name.length > 0) {",
    "  payload.tmuxSessionName = process.env.tmux_session_name;",
    "}",
    "process.stdout.write(JSON.stringify(payload));",
    "NODE",
    `) >"$stdout_file" 2>"$stderr_file"`,
    "command_exit_code=$?",
    "set -e",
    "if [ \"$command_exit_code\" -ne 0 ]; then",
    "  if git rev-parse --verify -q MERGE_HEAD >/dev/null 2>&1; then",
    "    git merge --abort >/dev/null 2>&1 || true",
    "    printf '%s\\n' 'MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION: remote merge conflict' >>\"$stderr_file\"",
    "  fi",
    "fi",
    `printf '%s\\n' ${shellQuote(remoteMergeExitStatusStartMarker)}`,
    "printf '%s\\n' \"$command_exit_code\"",
    `printf '%s\\n' ${shellQuote(remoteMergeExitStatusEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteMergeStdoutStartMarker)}`,
    "cat \"$stdout_file\"",
    `printf '\\n%s\\n' ${shellQuote(remoteMergeStdoutEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteMergeStderrStartMarker)}`,
    "cat \"$stderr_file\"",
    `printf '\\n%s\\n' ${shellQuote(remoteMergeStderrEndMarker)}`
  ].join("\n");
}

function buildCleanupScriptSetup(
  input: ExecuteRemoteBubbleMergeCleanupCommandInput
): string[] {
  return [
    "set -euo pipefail",
    `remote_clone_path=${shellQuote(input.remoteClonePath)}`,
    `base_branch=${shellQuote(input.baseBranch)}`,
    `bubble_branch=${shellQuote(input.bubbleBranch)}`,
    `bubble_id=${shellQuote(input.bubbleId)}`,
    `tmux_session_name=${shellQuote(input.tmuxSessionName ?? "")}`,
    "export remote_clone_path base_branch bubble_branch bubble_id tmux_session_name",
    "worktree_existed=false",
    "if [ ! -d \"$remote_clone_path\" ]; then",
    "  printf '%s\\n' \"REMOTE_MERGE_CLEANUP_TARGET_MISSING: Missing remote clone path $remote_clone_path\" >&2",
    "  exit 1",
    "fi",
    "worktree_existed=true",
    "cd \"${remote_clone_path}/..\"",
    "stdout_file=$(mktemp)",
    "stderr_file=$(mktemp)",
    "cleanup() { rm -f \"$stdout_file\" \"$stderr_file\"; }",
    "trap cleanup EXIT",
    "command_exit_code=0",
    "set +e",
    "(",
    "  set -euo pipefail"
  ];
}

function buildCleanupScriptBody(): string[] {
  return [
    "  branch_exists=false",
    "  if git -C \"$remote_clone_path\" show-ref --verify --quiet \"refs/heads/$bubble_branch\"; then",
    "    branch_exists=true",
    "  fi",
    "  runtime_session_path=\"$remote_clone_path/.pairflow/runtime/sessions.json\"",
    "  runtime_session_existed=$(node <<'NODE'",
    "const fs = require('node:fs');",
    "const bubbleId = process.env.bubble_id;",
    "const sessionsPath = process.env.remote_clone_path + '/.pairflow/runtime/sessions.json';",
    "if (bubbleId === undefined) {",
    "  throw new Error('bubble_id is required');",
    "}",
    "if (!fs.existsSync(sessionsPath)) {",
    "  process.stdout.write('false');",
    "} else {",
    "  const raw = fs.readFileSync(sessionsPath, 'utf8').trim();",
    "  const parsed = raw.length === 0 ? {} : JSON.parse(raw);",
    "  process.stdout.write(Object.prototype.hasOwnProperty.call(parsed, bubbleId) ? 'true' : 'false');",
    "}",
    "NODE",
    "  )",
    "  tmux_session_existed=false",
    "  if [ -n \"$tmux_session_name\" ] && tmux has-session -t \"$tmux_session_name\" >/dev/null 2>&1; then",
    "    tmux_session_existed=true",
    "  fi",
    "  if [ \"$tmux_session_existed\" = true ]; then",
    "    tmux kill-session -t \"$tmux_session_name\" >&2",
    "  fi",
    "  runtime_session_removed=false",
    "  if [ \"$runtime_session_existed\" = true ]; then",
    "    runtime_session_removed=$(node <<'NODE'",
    "const fs = require('node:fs');",
    "const bubbleId = process.env.bubble_id;",
    "const sessionsPath = process.env.remote_clone_path + '/.pairflow/runtime/sessions.json';",
    "if (bubbleId === undefined) {",
    "  throw new Error('bubble_id is required');",
    "}",
    "if (!fs.existsSync(sessionsPath)) {",
    "  process.stdout.write('false');",
    "} else {",
    "  const raw = fs.readFileSync(sessionsPath, 'utf8').trim();",
    "  const parsed = raw.length === 0 ? {} : JSON.parse(raw);",
    "  if (!Object.prototype.hasOwnProperty.call(parsed, bubbleId)) {",
    "    process.stdout.write('false');",
    "  } else {",
    "    delete parsed[bubbleId];",
    "    fs.writeFileSync(sessionsPath, JSON.stringify(parsed, null, 2) + '\\n', 'utf8');",
    "    process.stdout.write('true');",
    "  }",
    "}",
    "NODE",
    "    )",
    "  fi",
    "  removed_bubble_branch=false",
    "  branch_cleanup_exit_code=0",
    "  if [ \"$branch_exists\" = true ]; then",
    "    set +e",
    "    git -C \"$remote_clone_path\" checkout \"$base_branch\" >&2",
    "    branch_cleanup_exit_code=$?",
    "    if [ \"$branch_cleanup_exit_code\" -eq 0 ]; then",
    "      git -C \"$remote_clone_path\" branch -D \"$bubble_branch\" >&2",
    "      branch_cleanup_exit_code=$?",
    "      if [ \"$branch_cleanup_exit_code\" -eq 0 ]; then",
    "        removed_bubble_branch=true",
    "      fi",
    "    fi",
    "    set -e",
    "  fi",
    "  rm -rf \"$remote_clone_path\"",
    "  removed_worktree=false",
    "  if [ ! -e \"$remote_clone_path\" ]; then",
    "    removed_worktree=true",
    "  fi",
    "  if [ \"$branch_cleanup_exit_code\" -ne 0 ]; then",
    "    exit \"$branch_cleanup_exit_code\"",
    "  fi"
  ];
}

function buildCleanupScriptPayload(): string[] {
  return [
    "  export branch_exists runtime_session_existed runtime_session_removed tmux_session_existed removed_bubble_branch removed_worktree runtime_session_path worktree_existed",
    "  node <<'NODE'",
    "const payload = {",
    "  bubbleId: process.env.bubble_id,",
    "  baseBranch: process.env.base_branch,",
    "  bubbleBranch: process.env.bubble_branch,",
    "  artifacts: {",
    "    worktree: {",
    "      path: process.env.remote_clone_path,",
    "      existed: process.env.worktree_existed === 'true'",
    "    },",
    "    tmux: {",
    "      existed: process.env.tmux_session_existed === 'true'",
    "    },",
    "    runtimeSession: {",
    "      path: process.env.runtime_session_path,",
    "      existed: process.env.runtime_session_existed === 'true'",
    "    },",
    "    branch: {",
    "      name: process.env.bubble_branch,",
    "      existed: process.env.branch_exists === 'true'",
    "    }",
    "  },",
    "  tmuxSessionTerminated: process.env.tmux_session_existed === 'true',",
    "  runtimeSessionRemoved: process.env.runtime_session_removed === 'true',",
    "  removedWorktree: process.env.removed_worktree === 'true',",
    "  removedBubbleBranch: process.env.removed_bubble_branch === 'true'",
    "};",
    "if (typeof process.env.tmux_session_name === 'string' && process.env.tmux_session_name.length > 0) {",
    "  payload.tmuxSessionName = process.env.tmux_session_name;",
    "  payload.artifacts.tmux.sessionName = process.env.tmux_session_name;",
    "}",
    "process.stdout.write(JSON.stringify(payload));",
    "NODE",
    `) >"$stdout_file" 2>"$stderr_file"`,
    "command_exit_code=$?",
    "set -e"
  ];
}

function buildCleanupScriptEnvelope(): string[] {
  return [
    `printf '%s\\n' ${shellQuote(remoteMergeCleanupExitStatusStartMarker)}`,
    "printf '%s\\n' \"$command_exit_code\"",
    `printf '%s\\n' ${shellQuote(remoteMergeCleanupExitStatusEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteMergeCleanupStdoutStartMarker)}`,
    "cat \"$stdout_file\"",
    `printf '\\n%s\\n' ${shellQuote(remoteMergeCleanupStdoutEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteMergeCleanupStderrStartMarker)}`,
    "cat \"$stderr_file\"",
    `printf '\\n%s\\n' ${shellQuote(remoteMergeCleanupStderrEndMarker)}`
  ];
}

export function buildRemoteBubbleMergeCleanupScript(
  input: ExecuteRemoteBubbleMergeCleanupCommandInput
): string {
  return [
    ...buildCleanupScriptSetup(input),
    ...buildCleanupScriptBody(),
    ...buildCleanupScriptPayload(),
    ...buildCleanupScriptEnvelope()
  ].join("\n");
}
