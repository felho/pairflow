# Pairflow Architecture v2 Note

Status: draft note  
Date: 2026-03-05

## Why this note exists

Pairflow started as a relatively simple system, but after adding many features it is becoming harder to reason about.
The current direction feels increasingly patchwork-like, so we should revisit the architecture after finishing the current change.

## Current concern to keep in mind

For docs-only scenarios, new behavior should extend existing logic, not silently overwrite global behavior.
Right now, the scope boundary between docs-specific logic and system-wide logic is not always obvious.

## v2 intention (high level)

We want a model that is both simpler and more flexible:
- clearer terms and boundaries,
- easier-to-follow decision paths,
- less duplicated policy logic across commands,
- explicit separation between docs-only extensions and global runtime behavior.

## Timing

No architecture migration is planned in this note right now.
This is a reminder to run a focused Architecture v2 design pass immediately after the current doc-contract-gates implementation is closed.
