import { createHash } from "node:crypto";

import { runGit } from "../../../../core/workspace/git.js";
import type {
  ReviewerTestCommandEvidence,
  ReviewerTestCommandStatus,
  VerifyImplementerTestEvidenceInput
} from "../../../shared/reviewer/testEvidence.js";
import type { EvidenceSource } from "./testEvidenceSourcePolicy.js";

interface CommandMatch {
  source: EvidenceSource;
  snippet: string;
  explicitExitSuccess: boolean;
  explicitExitFailure: boolean;
  completionMarker: boolean;
  passToken: boolean;
}

export interface WorktreeFingerprint {
  commitSha: string | null;
  statusHash: string | null;
  dirty: boolean | null;
  ok: boolean;
}

interface CommandAliasFamily {
  aliases: readonly string[];
}

const commandBoundaryCharClass = "\\p{L}\\p{N}_:/.@\\-";
const commandAliasFamiliesSeed: readonly CommandAliasFamily[] = [
  {
    aliases: ["pnpm typecheck", "pnpm run typecheck", "tsc --noEmit"]
  },
  {
    aliases: ["pnpm test", "pnpm run test", "vitest", "vitest run"]
  },
  {
    aliases: ["pnpm lint", "pnpm run lint", "eslint"]
  }
];
const commandAliasFamilies: readonly CommandAliasFamily[] = commandAliasFamiliesSeed.map(
  (family) => ({
    aliases: normalizeAliasFamily(family.aliases)
  })
);
const commandAliasLookup = new Map(
  commandAliasFamilies.flatMap((family) =>
    family.aliases.map((alias) => [alias, family.aliases] as const)
  )
);

function normalizeCommandText(command: string): string {
  return command.trim().toLowerCase().replace(/\s+/gu, " ");
}

function normalizeAliasFamily(aliases: readonly string[]): string[] {
  return [...new Set(aliases.map(normalizeCommandText))];
}

function resolveCommandMatchCandidates(command: string): string[] {
  const normalized = normalizeCommandText(command);
  const familyAliases = commandAliasLookup.get(normalized);
  if (familyAliases === undefined) {
    return [normalized];
  }
  return [...familyAliases].sort((left, right) => right.length - left.length);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function buildCommandMatchRegex(commandPattern: string): RegExp {
  const commandBody = commandPattern
    .split(/\s+/u)
    .map((token) => escapeRegExp(token))
    .join("\\s+");
  return new RegExp(
    `(^|[^${commandBoundaryCharClass}])(${commandBody})(?=$|[^${commandBoundaryCharClass}])`,
    "giu"
  );
}

export function normalizeRequiredCommands(
  config: VerifyImplementerTestEvidenceInput["bubbleConfig"]
): string[] {
  const commands = [config.commands.typecheck, config.commands.test]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return [...new Set(commands)];
}

function hashText(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function readWorktreeFingerprint(
  worktreePath: string
): Promise<WorktreeFingerprint> {
  const commit = await runGit(["rev-parse", "HEAD"], {
    cwd: worktreePath,
    allowFailure: true
  });
  const status = await runGit(["status", "--porcelain", "--untracked-files=all"], {
    cwd: worktreePath,
    allowFailure: true
  });

  if (commit.exitCode !== 0 || status.exitCode !== 0) {
    return {
      commitSha: null,
      statusHash: null,
      dirty: null,
      ok: false
    };
  }

  const statusRaw = status.stdout.replace(/\r\n/gu, "\n");
  return {
    commitSha: commit.stdout.trim(),
    statusHash: hashText(statusRaw),
    dirty: statusRaw.trim().length > 0,
    ok: true
  };
}

function findAllCommandMatches(
  commandPatterns: string[],
  sources: EvidenceSource[]
): CommandMatch[] {
  const matches: CommandMatch[] = [];

  for (const source of sources) {
    const consumedMatchStarts = new Set<number>();
    for (const commandPattern of commandPatterns) {
      const matcher = buildCommandMatchRegex(commandPattern);
      for (const match of source.text.matchAll(matcher)) {
        const boundaryPrefix = match[1] ?? "";
        const matchedCommand = match[2] ?? commandPattern;
        const commandStart = (match.index ?? 0) + boundaryPrefix.length;
        if (consumedMatchStarts.has(commandStart)) {
          continue;
        }
        consumedMatchStarts.add(commandStart);
        const snippetStart = Math.max(0, commandStart - 220);
        const snippetEnd = Math.min(
          source.text.length,
          commandStart + matchedCommand.length + 220
        );
        const snippet = source.text.slice(snippetStart, snippetEnd);
        const snippetLower = snippet.toLowerCase();

        const explicitExitSuccess =
          /\b(?:exit(?:\s*code)?|command\s+exit(?:\s*code)?|process\s+exit(?:\s*code)?|returned)\s*[:=]?\s*0\b/iu.test(
            snippetLower
          );
        const explicitExitFailure =
          /\b(?:exit(?:\s*code)?|command\s+exit(?:\s*code)?|process\s+exit(?:\s*code)?|returned)\s*[:=]?\s*[1-9][0-9]*\b/iu.test(
            snippetLower
          ) ||
          /\b(?:found|with|had)\s+[1-9][0-9]*\s+errors?\b/iu.test(snippetLower) ||
          /\b(?:[1-9][0-9]*\s+failed(?:\s+tests?)?|tests?\s+failed|command\s+failed)\b/iu.test(
            snippetLower
          );

        const completionMarker =
          commandPattern.includes("typecheck") || commandPattern.includes("tsc")
            ? /\b(?:found\s+0\s+errors?|0\s+errors?|no\s+type\s+errors?|no\s+errors?|pass(?:ed)?|success(?:ful)?)\b/iu.test(
                snippetLower
              )
            : commandPattern.includes("test")
              ? /\b(?:\d+\s+tests?\b|test\s+files?\b|all\s+tests\s+passed|no\s+tests\s+failed|pass(?:ed)?)\b/iu.test(
                  snippetLower
                )
              : /\b(?:pass(?:ed)?|success(?:ful)?|ok)\b/iu.test(snippetLower);

        const passToken = /\b(?:pass(?:ed)?|success(?:ful)?|ok)\b/iu.test(snippetLower);

        matches.push({
          source,
          snippet,
          explicitExitSuccess,
          explicitExitFailure,
          completionMarker,
          passToken
        });
      }
    }
  }

  return matches;
}

function scoreMatch(match: CommandMatch): number {
  let score = 0;
  if (match.explicitExitSuccess) {
    score += 3;
  }
  if (match.completionMarker) {
    score += 2;
  }
  if (match.passToken) {
    score += 1;
  }
  if (match.explicitExitFailure) {
    score -= 4;
  }
  if (match.source.kind === "ref") {
    score += 1;
  }
  return score;
}

export function buildCommandEvidence(
  command: string,
  sources: EvidenceSource[]
): ReviewerTestCommandEvidence {
  const commandLower = command.toLowerCase();
  const isTypecheckCommand = commandLower.includes("typecheck") || commandLower.includes("tsc");
  const matches = findAllCommandMatches(resolveCommandMatchCandidates(command), sources);
  if (matches.length === 0) {
    return {
      command,
      required: true,
      source: "none",
      status: "missing",
      exit_code: null,
      explicit_exit_status: false,
      completion_marker: false
    };
  }

  const bestMatch = [...matches].sort((left, right) => scoreMatch(right) - scoreMatch(left))[0];
  if (bestMatch === undefined) {
    return {
      command,
      required: true,
      source: "none",
      status: "missing",
      exit_code: null,
      explicit_exit_status: false,
      completion_marker: false
    };
  }

  let status: ReviewerTestCommandStatus = "unverifiable";
  let exitCode: 0 | 1 | null = null;
  if (bestMatch.explicitExitFailure) {
    status = "failed";
    exitCode = 1;
  } else if (
    bestMatch.completionMarker &&
    (bestMatch.explicitExitSuccess || bestMatch.passToken || isTypecheckCommand)
  ) {
    status = "verified";
    exitCode = 0;
  }

  return {
    command,
    required: true,
    source: bestMatch.source.kind,
    ...(bestMatch.source.kind === "ref" ? { source_ref: bestMatch.source.id } : {}),
    matched_text: bestMatch.snippet,
    status,
    exit_code: exitCode,
    explicit_exit_status: bestMatch.explicitExitSuccess,
    completion_marker: bestMatch.completionMarker
  };
}

function hasTrustedProvenance(commandEvidence: ReviewerTestCommandEvidence[]): boolean {
  const verified = commandEvidence.filter((entry) => entry.status === "verified");
  if (verified.length === 0) {
    return false;
  }

  return verified.every((entry) => entry.source === "ref");
}

export function normalizeCommandEvidenceProvenance(
  commandEvidence: ReviewerTestCommandEvidence[]
): ReviewerTestCommandEvidence[] {
  if (hasTrustedProvenance(commandEvidence)) {
    return commandEvidence;
  }

  return commandEvidence.map((entry) => {
    if (entry.status !== "verified" || entry.source !== "summary") {
      return entry;
    }
    return {
      ...entry,
      status: "unverifiable",
      exit_code: null
    };
  });
}

export function hasTrustedCommandEvidenceProvenance(
  commandEvidence: ReviewerTestCommandEvidence[]
): boolean {
  return hasTrustedProvenance(commandEvidence);
}
