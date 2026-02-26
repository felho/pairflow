# Task: Create Installer for Pairflow

## Goal

Create a simple installer that sets up everything a new user needs after cloning the pairflow repository from GitHub.

## Constraints — READ THESE FIRST

- **pnpm only.** The project uses pnpm with `pnpm-lock.yaml`. Do NOT support npm, yarn, or any other package manager. Do NOT write package manager detection logic.
- **No custom semver parser.** Use `node -e "..."` with a simple major version check, or just let `pnpm install` fail naturally if Node is too old.
- **Keep it short.** The entire install script should be under 80 lines of bash. If you're writing more, you're over-engineering.
- **No corepack bootstrap.** Assume pnpm is already installed. If it's not, print "Install pnpm: npm i -g pnpm" and exit.
- **Do NOT add `files` field to package.json.** Do NOT modify package.json unless strictly necessary.
- **Do NOT change README prerequisites** to be "generic" — keep them specific (pnpm, Node >= 22).

## What the Installer Should Do

Scenario: you just `git clone`-d this repo. Run one script and you're ready.

```bash
./scripts/install.sh
```

Steps (in order):
1. Check prerequisites exist: `node`, `pnpm`, `git`, `tmux` — if missing, print install hint and exit
2. Check Node.js version >= 22 (simple major version check, ~3 lines max)
3. `pnpm install --frozen-lockfile`
4. `pnpm build`
5. `pnpm link --global`
6. `mkdir -p .pairflow/{bubbles,locks,runtime}` and init `sessions.json` if missing
7. Smoke test: `pairflow bubble list --repo . --json` (or local node fallback)
8. Print getting-started summary

## Design

- Idempotent — safe to run multiple times
- macOS primary, Linux secondary
- Clear error messages with install hints (brew for macOS, apt for Linux)
- `set -euo pipefail` at the top

## Deliverables

- `scripts/install.sh` — the installer (under 80 lines)
- Update `INSTALL.md` if needed (keep it simple, reference the script)
