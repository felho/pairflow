import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// The v3 lint layer (plan §3.3): CHK-D-NOCLOCK, the ADR-001/ADR-005 import
// boundaries, CHK-D-TESTCLOCK, and the no-randomness half of the fixture
// convention. Every rule here is negative-tested before it counts as
// realized. Entry ORDER matters: later entries override a rule's config
// for overlapping files (kernel-specific boundaries come last).

const noClockMessage =
  "CHK-D-NOCLOCK: no direct wall-clock read — time flows through the injected TimeSource (ports/time.ts).";
const testClockMessage =
  "CHK-D-TESTCLOCK: no real time in tests/fixtures — bind the testkit controlled clock and advance() it.";
const noRandomMessage =
  "Fixture convention (testkit/README.md): no randomness in tests/fixtures — inject a deterministic source.";

// ch8-opening sweep (deferred fix, ch7 boundary review): every import ban
// carries its DYNAMIC form. The declaration rules (no-restricted-imports)
// check ImportDeclaration nodes only, so `await import("…")` was lint-green
// against every ban except floor→diag (closed in the ch7-P3 aftermath —
// that entry is the selector-form precedent: / = "/", because esquery
// delimits attribute regexes with raw slashes). A NON-LITERAL source
// (`import(expr)`) stays out of selector reach — the same
// compromised-caller scope-out the floor rule recorded; the drift entry is
// the one exception (it bans the ImportExpression node itself: under
// import-type-only discipline no dynamic import is legal at all).
// MERGE RULE: flat config REPLACES a rule id's whole config on a later
// matching entry (never merges options), so every scope needing two
// selector families gets ONE merged `no-restricted-syntax` entry; the
// shared families live in these consts. The base no-clock/test-clock
// entries below keep their own copies as defense in depth — for kernel,
// domain, and testkit files they are shadowed by the merged entries.
const noClockSyntaxSelectors = [
  { selector: "NewExpression[callee.name='Date']", message: noClockMessage },
  { selector: "CallExpression[callee.name='Date']", message: noClockMessage },
];
const testClockSyntaxSelectors = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: testClockMessage,
  },
];
const dynamicTestkitDriftSelectors = [
  {
    selector: "ImportExpression[source.value=/\\u002Ftestkit\\u002F/]",
    message: "ADR-005: production modules never import testkit/ — dynamic import() included.",
  },
  {
    selector: "ImportExpression[source.value=/\\u002Fdrift\\u002F/]",
    message:
      "ADR-007: production modules never import drift/ (test-only module) — dynamic import() included.",
  },
];
const cliWriteBoundarySelectors = [
  {
    selector: "CallExpression[callee.property.name='commitTransition']",
    message:
      "ch6-P4a write boundary: CLI code never calls StorePort.commitTransition — ops go through ingress.submit.",
  },
  {
    selector: "CallExpression[callee.property.name='createInstance']",
    message:
      "ch6-P4a write boundary: CLI code never calls StorePort.createInstance — births go through kernel.startInstance.",
  },
];

export default tseslint.config(
  {
    ignores: ["node_modules/**", "eslint.config.mjs", "vitest.config.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/require-await": "off",
    },
  },

  // CHK-D-TESTCLOCK + no-randomness: tests and the testkit are deterministic.
  {
    files: ["src/**/*.test.ts", "src/testkit/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "setTimeout", message: testClockMessage },
        { name: "setInterval", message: testClockMessage },
        { name: "setImmediate", message: testClockMessage },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: testClockMessage },
        { object: "performance", property: "now", message: testClockMessage },
        { object: "Math", property: "random", message: noRandomMessage },
        { object: "crypto", property: "randomUUID", message: noRandomMessage },
      ],
      "no-restricted-syntax": ["error", ...testClockSyntaxSelectors],
    },
  },

  // CHK-D-NOCLOCK: kernel/ and domain/ never touch the clock (tests are
  // governed by the CHK-D-TESTCLOCK entry above).
  {
    files: ["src/kernel/**", "src/domain/**"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "setTimeout", message: noClockMessage },
        { name: "setInterval", message: noClockMessage },
        { name: "setImmediate", message: noClockMessage },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: noClockMessage },
        { object: "performance", property: "now", message: noClockMessage },
      ],
      "no-restricted-syntax": ["error", ...noClockSyntaxSelectors],
    },
  },

  // ADR-005 + ADR-007: production modules never import testkit/ or drift/.
  // ADR-009: the NORMAL cli graph is production — the src/cli/dev/**
  // entrypoint is the ONE structural exemption (dev CLI boundary).
  // The DYNAMIC form of this ban lives in the per-scope merged
  // no-restricted-syntax entries below (ch8-opening sweep).
  {
    files: [
      "src/domain/**",
      "src/kernel/**",
      "src/ports/**",
      "src/store/**",
      "src/ingress/**",
      "src/emit/**",
      "src/floor/**",
      "src/diag/**",
      "src/cli/**",
    ],
    ignores: ["src/**/*.test.ts", "src/cli/dev/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/testkit/**"],
              message: "ADR-005: production modules never import testkit/.",
            },
            {
              group: ["**/drift/**"],
              message: "ADR-007: production modules never import drift/ (test-only module).",
            },
          ],
        },
      ],
    },
  },

  // ch7-P3 floor→diag boundary: floor/ never VALUE-imports diag/ —
  // DiagUnavailableError is matched by `error.name` (the P2 cross-module
  // (name, reason) contract) and readers/sinks arrive injected; the
  // interim reader's value import lives in the CLI composition roots.
  // The TS variant (the base rule has no allowTypeImports; the drift
  // entry below is the in-file precedent) coexists with the base-rule
  // testkit/drift bans above (later-entry-overrides-per-RULE-ID
  // semantics — distinct rule ids never clobber). Floor TEST files
  // legitimately value-import openDiagStore (the ADR-005 ignores
  // culture).
  {
    files: ["src/floor/**"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/diag/**"],
              allowTypeImports: true,
              message:
                "ch7-P3 floor→diag boundary: floor/ never value-imports diag/ — match DiagUnavailableError by error.name; readers arrive injected (composition roots wire them).",
            },
          ],
        },
      ],
      // The DYNAMIC form of the same ban (ch7-P3 aftermath): the import
      // rules above check declarations only — `await import("../diag/…")`
      // is a value import with no ImportDeclaration node. The legal type
      // route stays `import type … from "../diag/…"` (allowTypeImports
      // above); the type-position `typeof import(...)` form is a
      // TSImportType node this selector ignores, and
      // consistent-type-imports disallows that annotation form anyway
      // (probe-verified: neither boundary rule fires on it).
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression[source.value=/\\u002Fdiag\\u002F/]",
          message:
            "ch7-P3 floor→diag boundary: floor/ never value-imports diag/ — dynamic import() included; readers arrive injected (composition roots wire them).",
        },
        // Merged (ch8-opening sweep): floor claims the rule id here, so the
        // production-wide dynamic testkit/drift ban rides in the same entry.
        ...dynamicTestkitDriftSelectors,
      ],
    },
  },

  // ADR-007: non-test drift modules (the manifests / import tables) are
  // compile-time bookkeeping — `import type` ONLY. Drift TEST files may
  // value-import domain registry values (comparing the runtime value
  // against the ledger is the whole point) and are exempted here.
  {
    files: ["src/drift/**"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**"],
              allowTypeImports: true,
              message:
                "ADR-007: non-test drift modules are static bookkeeping — import type only; runtime coupling belongs in the drift tests.",
            },
          ],
        },
      ],
      // Dynamic form (ch8-opening sweep): a dynamic import() is ALWAYS a
      // value import, so under import-type-only discipline none is legal —
      // the ban is on the node itself (non-literal sources included).
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression",
          message:
            "ADR-007: non-test drift modules are static bookkeeping — dynamic import() is always a value import; none is legal here.",
        },
      ],
    },
  },

  // ADR-005: testkit is the far side of the seams — never imports kernel/
  // or store/ (its imports stop at ports/, domain/, emit/).
  {
    files: ["src/testkit/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/kernel/**", "**/store/**"],
              message:
                "ADR-005: testkit never imports kernel/ or store/ — tests, not the kit, drive the kernel.",
            },
          ],
        },
      ],
      // Merged (ch8-opening sweep): this entry claims the rule id for
      // src/testkit/**, so the CHK-D-TESTCLOCK selector is repeated here
      // alongside the dynamic form of the kernel/store ban.
      "no-restricted-syntax": [
        "error",
        ...testClockSyntaxSelectors,
        {
          selector: "ImportExpression[source.value=/\\u002Fkernel\\u002F/]",
          message:
            "ADR-005: testkit never imports kernel/ or store/ — dynamic import() included.",
        },
        {
          selector: "ImportExpression[source.value=/\\u002Fstore\\u002F/]",
          message:
            "ADR-005: testkit never imports kernel/ or store/ — dynamic import() included.",
        },
      ],
    },
  },

  // ADR-009 write boundary (packet ch6-P4a): a CLI handler never calls a
  // StorePort write directly — writes enter through kernel.startInstance
  // and ingress.submit ONLY (the write-entrypoint matrix). Scoped to
  // src/cli/** (incl. dev); negative-tested with an executed probe.
  {
    files: ["src/cli/**"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...cliWriteBoundarySelectors],
    },
  },

  // ch8-opening sweep: the dynamic testkit/drift ban for the remaining
  // production scopes. Three groups, because flat config replaces a rule
  // id's whole config per matching file (see the MERGE RULE note above):
  // (1) scopes with no prior no-restricted-syntax claim get the plain
  // dynamic ban; (2) domain/ repeats its no-clock selectors; (3) the
  // NORMAL cli graph repeats the write boundary — src/cli/dev/** is
  // ignored here, so dev files stay on the write-boundary-only entry
  // above and keep their ADR-009 testkit exemption. kernel/ gets its
  // dynamic form inside the allowlist entry below.
  {
    files: ["src/ports/**", "src/store/**", "src/ingress/**", "src/emit/**", "src/diag/**"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...dynamicTestkitDriftSelectors],
    },
  },
  {
    files: ["src/domain/**"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...noClockSyntaxSelectors, ...dynamicTestkitDriftSelectors],
    },
  },
  {
    files: ["src/cli/**"],
    ignores: ["src/**/*.test.ts", "src/cli/dev/**"],
    rules: {
      "no-restricted-syntax": ["error", ...cliWriteBoundarySelectors, ...dynamicTestkitDriftSelectors],
    },
  },

  // ADR-001: the port-parametric kernel imports domain/ and ports/ ONLY.
  // ALLOWLIST, not a blocklist — everything is banned (other v3 modules,
  // node builtins, packages) except kernel-internal files and the two
  // permitted modules; the negative test derives from this claim, not
  // from an enumerated ban list. Regex, because gitignore-style pattern
  // negation cannot express ../-relative allowances. Last on purpose — it
  // replaces the production-wide restriction above for kernel files with
  // the full boundary. (If kernel/ ever nests subdirectories, their
  // parent-relative imports need extending the lookahead.)
  {
    files: ["src/kernel/**"],
    ignores: ["src/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!\\./|\\.\\./domain/|\\.\\./ports/).*",
              message:
                "ADR-001: the port-parametric kernel imports domain/ and ports/ ONLY — everything else (other modules, node builtins, packages) arrives through ports.",
            },
          ],
        },
      ],
      // Merged (ch8-opening sweep): the ALLOWLIST's dynamic form — same
      // negated lookahead over the literal source (this subsumes the
      // testkit/drift ban for kernel files, like its static twin) — plus
      // the repeated CHK-D-NOCLOCK selectors this entry would otherwise
      // clobber.
      "no-restricted-syntax": [
        "error",
        ...noClockSyntaxSelectors,
        {
          selector:
            "ImportExpression[source.value=/^(?!\\.\\u002F|\\.\\.\\u002Fdomain\\u002F|\\.\\.\\u002Fports\\u002F)/]",
          message:
            "ADR-001: the port-parametric kernel imports domain/ and ports/ ONLY — dynamic import() included; everything else arrives through ports.",
        },
      ],
    },
  },
);
