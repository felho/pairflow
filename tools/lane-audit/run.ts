/**
 * Lane structural audit — read-only ranked report.
 *
 * Surfaces `src/v11/<area>/<lane>` directories that may need `internal/`
 * boundary work (Pattern #1: Public Surface Narrowing + Package-Private
 * Submodules; see `docs/refactoring/public-surface-cleanup-patterns.md`).
 *
 * - Does NOT modify files. Does NOT block CI.
 * - Conservative lane definition: exactly two segments under `src/v11/`,
 *   limited to the six known areas.
 * - Cross-lane consumer count is the primary signal; file count is noise.
 * - Test consumers are counted separately from production consumers; tests
 *   alone do not confer "public" status on a top-level file.
 *
 * Usage:
 *   pnpm exec tsx tools/lane-audit/run.ts
 *   pnpm exec tsx tools/lane-audit/run.ts --top 20    (per-lane detail rows)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const REPO_ROOT = process.cwd();
const SRC_V11_DIR = join(REPO_ROOT, "src", "v11");
const TESTS_DIR = join(REPO_ROOT, "tests");

const AREAS = [
  "application",
  "shared",
  "domain",
  "infrastructure",
  "defaults",
  "ports"
] as const;
type Area = (typeof AREAS)[number];

const TOP_DETAIL = (() => {
  const idx = process.argv.indexOf("--top");
  if (idx >= 0 && process.argv[idx + 1]) {
    const n = Number(process.argv[idx + 1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 10;
})();

const HELPER_NAME_RE =
  /(Helper|Builder|Mapper|Parser|Normalizer|Resolver|Formatter)/;
const CONTRACT_NAME_RE = /(Contract|Types)\.ts$/;
const INDEX_NAME_RE = /^index\.ts$/;

type FileEntry = {
  abs: string;
  rel: string;
  isTest: boolean;
  area: Area | null;
  lane: string | null;
  isLaneTopLevel: boolean;
};

function walkTs(root: string): string[] {
  const out: string[] = [];
  function visit(dir: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git") continue;
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        visit(full);
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        out.push(full);
      }
    }
  }
  visit(root);
  return out;
}

function classifyFile(abs: string): FileEntry {
  const rel = relative(REPO_ROOT, abs);
  const parts = rel.split("/");
  const isTest = parts[0] === "tests";

  let area: Area | null = null;
  let lane: string | null = null;
  let isLaneTopLevel = false;
  if (parts[0] === "src" && parts[1] === "v11" && parts.length >= 4) {
    const candidateArea = parts[2];
    if ((AREAS as readonly string[]).includes(candidateArea)) {
      area = candidateArea as Area;
      lane = parts[3];
      isLaneTopLevel = parts.length === 5;
    }
  }

  return { abs, rel, isTest, area, lane, isLaneTopLevel };
}

const STATIC_IMPORT_RE = /(?:from|import)\s*["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

function extractImports(content: string): string[] {
  const out: string[] = [];
  for (const match of content.matchAll(STATIC_IMPORT_RE)) {
    out.push(match[1]);
  }
  for (const match of content.matchAll(DYNAMIC_IMPORT_RE)) {
    out.push(match[1]);
  }
  return out;
}

function resolveTsImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const fromDir = dirname(fromFile);
  let absolute = resolve(fromDir, spec);
  if (absolute.endsWith(".js")) {
    absolute = absolute.slice(0, -3) + ".ts";
  } else if (!absolute.endsWith(".ts")) {
    absolute = absolute + ".ts";
  }
  if (existsSync(absolute)) return absolute;
  const altIndex = absolute.replace(/\.ts$/, "/index.ts");
  if (existsSync(altIndex)) return altIndex;
  return null;
}

const allFiles: FileEntry[] = [];
for (const f of walkTs(SRC_V11_DIR)) allFiles.push(classifyFile(f));
for (const f of walkTs(TESTS_DIR)) allFiles.push(classifyFile(f));

const fileByAbs = new Map(allFiles.map((f) => [f.abs, f]));

const consumersOf = new Map<string, FileEntry[]>();
for (const file of allFiles) {
  let content: string;
  try {
    content = readFileSync(file.abs, "utf8");
  } catch {
    continue;
  }
  for (const spec of extractImports(content)) {
    const target = resolveTsImport(file.abs, spec);
    if (target && fileByAbs.has(target)) {
      const arr = consumersOf.get(target) ?? [];
      arr.push(file);
      consumersOf.set(target, arr);
    }
  }
}

type LaneInfo = {
  area: Area;
  lane: string;
  topLevelFiles: FileEntry[];
  hasInternal: boolean;
};

const laneMap = new Map<string, LaneInfo>();
for (const file of allFiles) {
  if (!file.area || !file.lane) continue;
  const key = `${file.area}/${file.lane}`;
  if (!laneMap.has(key)) {
    const internalDir = join(SRC_V11_DIR, file.area, file.lane, "internal");
    laneMap.set(key, {
      area: file.area,
      lane: file.lane,
      topLevelFiles: [],
      hasInternal: existsSync(internalDir)
    });
  }
  if (file.isLaneTopLevel) {
    laneMap.get(key)!.topLevelFiles.push(file);
  }
}

type FileCategory = "external" | "intra-only" | "test-only" | "unused";

type FileAudit = {
  file: FileEntry;
  category: FileCategory;
  prodOtherLane: number;
  prodSameLane: number;
  testCount: number;
  totalScore: number;
  reasons: string[];
};

function auditFile(file: FileEntry): FileAudit {
  const consumers = consumersOf.get(file.abs) ?? [];
  let prodOtherLane = 0;
  let prodSameLane = 0;
  let testCount = 0;
  for (const c of consumers) {
    if (c.abs === file.abs) continue;
    if (c.isTest) {
      testCount += 1;
    } else if (c.area === file.area && c.lane === file.lane) {
      prodSameLane += 1;
    } else {
      prodOtherLane += 1;
    }
  }

  let category: FileCategory;
  if (prodOtherLane > 0) category = "external";
  else if (prodSameLane > 0) category = "intra-only";
  else if (testCount > 0) category = "test-only";
  else category = "unused";

  let score = 0;
  const reasons: string[] = [];
  if (category === "intra-only") {
    score += 3;
    reasons.push("+3 intra-only");
  } else if (category === "test-only") {
    score += 2;
    reasons.push("+2 test-only");
  }

  const fileName = file.rel.split("/").pop() ?? "";
  const helperMatch = fileName.match(HELPER_NAME_RE);
  if (helperMatch) {
    score += 1;
    reasons.push(`+1 impl-name (${helperMatch[1]})`);
  }
  if (CONTRACT_NAME_RE.test(fileName)) {
    score -= 2;
    reasons.push("-2 contract/types");
  }
  if (INDEX_NAME_RE.test(fileName)) {
    score -= 2;
    reasons.push("-2 index file");
  }

  return {
    file,
    category,
    prodOtherLane,
    prodSameLane,
    testCount,
    totalScore: score,
    reasons
  };
}

type LaneAudit = {
  info: LaneInfo;
  fileAudits: FileAudit[];
  externalCount: number;
  intraOnlyCount: number;
  testOnlyCount: number;
  unusedCount: number;
  baseScore: number;
  bonusScore: number;
  totalScore: number;
};

const laneAudits: LaneAudit[] = [];
for (const info of laneMap.values()) {
  const fileAudits = info.topLevelFiles.map(auditFile);
  const externalCount = fileAudits.filter(
    (a) => a.category === "external"
  ).length;
  const intraOnlyCount = fileAudits.filter(
    (a) => a.category === "intra-only"
  ).length;
  const testOnlyCount = fileAudits.filter(
    (a) => a.category === "test-only"
  ).length;
  const unusedCount = fileAudits.filter((a) => a.category === "unused").length;
  const baseScore = fileAudits.reduce((s, a) => s + a.totalScore, 0);
  let bonusScore = 0;
  if (!info.hasInternal && info.topLevelFiles.length > 5) {
    bonusScore += 2;
  }
  laneAudits.push({
    info,
    fileAudits,
    externalCount,
    intraOnlyCount,
    testOnlyCount,
    unusedCount,
    baseScore,
    bonusScore,
    totalScore: baseScore + bonusScore
  });
}

laneAudits.sort((a, b) => {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  return (
    a.info.area.localeCompare(b.info.area) ||
    a.info.lane.localeCompare(b.info.lane)
  );
});

const lines: string[] = [];
lines.push("# Lane Structural Audit");
lines.push("");
lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
lines.push("");
lines.push(
  "Read-only ranking of `src/v11/<area>/<lane>` directories by likelihood of needing"
);
lines.push(
  "`internal/` boundary work (Pattern #1; see `docs/refactoring/public-surface-cleanup-patterns.md`)."
);
lines.push(
  "Higher score = stronger candidate. The score is a heuristic, not a verdict."
);
lines.push("");
lines.push("**Score formula**");
lines.push("");
lines.push(
  "- per top-level file: `+3` intra-only, `+2` test-only, `+1` Helper/Builder/Mapper/Parser/Normalizer/Resolver/Formatter name, `-2` `*Contract.ts` / `*Types.ts` / `index.ts`"
);
lines.push("- per lane: `+2` if no `internal/` directory and top-level files > 5");
lines.push("");
lines.push("**Categories**");
lines.push("");
lines.push(
  "- `external` — at least one production consumer outside the lane (legitimate public)"
);
lines.push(
  "- `intra-only` — only same-lane production consumers (move-to-internal candidate)"
);
lines.push(
  "- `test-only` — only test consumers, zero production (test imports implementation seam)"
);
lines.push("- `unused` — zero consumers anywhere (delete or move to internal)");
lines.push("");
lines.push("## Lane ranking");
lines.push("");
lines.push(
  "| Rank | Lane | Top-level | internal/ | external | intra-only | test-only | unused | Score |"
);
lines.push(
  "|-----:|------|----------:|:---------:|---------:|-----------:|----------:|-------:|------:|"
);
for (let i = 0; i < laneAudits.length; i++) {
  const la = laneAudits[i];
  const has = la.info.hasInternal ? "yes" : "no";
  lines.push(
    `| ${i + 1} | ${la.info.area}/${la.info.lane} | ${la.info.topLevelFiles.length} | ${has} | ${la.externalCount} | ${la.intraOnlyCount} | ${la.testOnlyCount} | ${la.unusedCount} | ${la.totalScore} |`
  );
}
lines.push("");

lines.push(`## Per-lane file detail (top ${TOP_DETAIL})`);
lines.push("");

let detailEmitted = 0;
for (const la of laneAudits) {
  if (detailEmitted >= TOP_DETAIL) break;
  if (la.totalScore <= 0) continue;
  detailEmitted += 1;
  lines.push(
    `### ${detailEmitted}. ${la.info.area}/${la.info.lane} (score ${la.totalScore})`
  );
  lines.push("");
  if (la.bonusScore > 0) {
    lines.push(
      `_Lane bonus +${la.bonusScore}: no \`internal/\` directory and ${la.info.topLevelFiles.length} top-level files_`
    );
    lines.push("");
  }
  lines.push(
    "| File | category | other-lane | same-lane | tests | score | notes |"
  );
  lines.push(
    "|------|----------|-----------:|----------:|------:|------:|-------|"
  );
  const sorted = [...la.fileAudits].sort(
    (a, b) => b.totalScore - a.totalScore
  );
  for (const fa of sorted) {
    const fileName = fa.file.rel.split("/").pop();
    const reasons = fa.reasons.length > 0 ? fa.reasons.join("; ") : "—";
    lines.push(
      `| ${fileName} | ${fa.category} | ${fa.prodOtherLane} | ${fa.prodSameLane} | ${fa.testCount} | ${fa.totalScore} | ${reasons} |`
    );
  }
  lines.push("");
}

const totalLanes = laneAudits.length;
const lanesWithScore = laneAudits.filter((l) => l.totalScore > 0).length;
const top = laneAudits[0];
lines.push("## Summary");
lines.push("");
lines.push(`- Lanes scanned: ${totalLanes}`);
lines.push(`- Lanes with score > 0: ${lanesWithScore}`);
if (top) {
  lines.push(
    `- Top score: ${top.totalScore} (${top.info.area}/${top.info.lane})`
  );
}
lines.push("");
lines.push("## Known limitations");
lines.push("");
lines.push(
  "- Barrel-only re-export consumers: if a lane has an `index.ts` that re-exports"
);
lines.push(
  "  a top-level file and external lanes import only via the barrel, the file"
);
lines.push(
  "  appears `intra-only` here. The recommendation (move to `internal/`) remains"
);
lines.push(
  "  correct: the barrel can re-export from `internal/` without changing external"
);
lines.push("  consumer paths.");
lines.push(
  "- Naming heuristic is regex-based; a `*Helper.ts` that genuinely belongs in"
);
lines.push(
  "  the public surface still receives `+1`. Treat the score as a sort key, not a"
);
lines.push("  verdict.");
lines.push(
  "- Lane definition is conservative (`src/v11/<area>/<lane>`). Sub-areas like"
);
lines.push(
  "  `infrastructure/channel/tmux/` are folded into `infrastructure/channel`."
);
lines.push(
  "  Refine if the audit shape suggests sub-lane treatment is needed."
);
lines.push("");

console.log(lines.join("\n"));
