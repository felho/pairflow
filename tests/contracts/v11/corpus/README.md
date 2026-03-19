# v11 Parity Corpus (Skeleton)

Status: draft  
Scope: M0 skeleton

## Purpose

This corpus drives deterministic replay/parity comparisons for legacy vs v11 command behavior.

## Source Policy

1. Sources must be reproducible and documented.
2. No live agent calls are allowed in corpus generation.
3. Sensitive data must be redacted before commit.

## Selection Rules

1. Include representative happy-path and failure-path cases.
2. Keep command coverage explicit in `manifest.json`.
3. Prefer stable fixtures over ad-hoc local transcripts.

## Ownership

1. Architecture owner curates schema and normalization policy.
2. Command owner curates command-specific additions.
3. Every regression bugfix must add a corpus entry or justify omission.

## Redaction Policy

1. Remove secrets, tokens, absolute user-specific paths.
2. Keep only deterministic fields needed for parity assertions.
3. Record any normalization transform in the corpus build log.
