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
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: testClockMessage,
        },
      ],
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
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: noClockMessage },
        { selector: "CallExpression[callee.name='Date']", message: noClockMessage },
      ],
    },
  },

  // ADR-005 + ADR-007: production modules never import testkit/ or drift/.
  // ADR-009: the NORMAL cli graph is production — the src/cli/dev/**
  // entrypoint is the ONE structural exemption (dev CLI boundary).
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
      "no-restricted-syntax": [
        "error",
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
      ],
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
    },
  },
);
