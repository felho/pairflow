import { describe, expect, it } from "vitest";

import { resolveRepoValidationProfileCommands } from "../../../../src/v11/application/create/repoValidationProfileResolver.js";

describe("resolveRepoValidationProfileCommands", () => {
  it("applies explicit, repo, then legacy precedence and preserves required order", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {
        test: "pnpm test:explicit",
        bootstrap: "pnpm install --frozen-lockfile"
      },
      repoValidation: {
        required: ["lint", "fitness", "typecheck", "test"],
        commands: {
          lint: "pnpm lint",
          fitness: "pnpm fitness",
          test: "pnpm test:repo"
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result).toEqual({
      commands: {
        test: "pnpm test:explicit",
        typecheck: "pnpm typecheck",
        lint: "pnpm lint",
        fitness: "pnpm fitness",
        bootstrap: "pnpm install --frozen-lockfile"
      },
      validationRequired: ["lint", "fitness", "typecheck", "test"]
    });
    expect(result.validationRequiredExplicit).toBeUndefined();
  });

  it("uses repo command over legacy defaults when explicit input is absent", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      repoValidation: {
        required: ["test", "typecheck"],
        commands: {
          test: "pnpm test:repo",
          typecheck: "pnpm typecheck:repo"
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.commands.test).toBe("pnpm test:repo");
    expect(result.commands.typecheck).toBe("pnpm typecheck:repo");
    expect(result.validationRequiredExplicit).toBeUndefined();
  });

  it("uses explicit lint command over repo profile command", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {
        lint: "pnpm lint:explicit"
      },
      repoValidation: {
        required: ["lint"],
        commands: {
          lint: "pnpm lint:repo"
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.commands.lint).toBe("pnpm lint:explicit");
    expect(result.validationRequired).toEqual(["lint"]);
  });

  it("uses legacy defaults only for test and typecheck when no profile command exists", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.commands).toEqual({
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    });
    expect(result.validationRequired).toBeUndefined();
  });

  it("resolves required test and typecheck from legacy defaults", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      repoValidation: {
        required: ["typecheck", "test"]
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.commands).toEqual({
      test: "pnpm test",
      typecheck: "pnpm typecheck"
    });
    expect(result.validationRequired).toEqual(["typecheck", "test"]);
    expect(result.validationRequiredExplicit).toBeUndefined();
  });

  it("materializes explicit empty required policy", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      repoValidation: {
        required: []
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.validationRequired).toEqual([]);
    expect(result.validationRequiredExplicit).toBe(true);
  });

  it("rejects unresolved required ids before bubble config persistence", () => {
    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        repoValidation: {
          required: ["fitness"]
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/no command was resolved/u);
  });

  it("rejects duplicate required ids at the resolver boundary", () => {
    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        repoValidation: {
          required: ["test", "test"]
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/Duplicate validation.required id/u);
  });

  it("rejects invalid command ids at the resolver boundary", () => {
    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        repoValidation: {
          required: ["Fitness"],
          commands: {
            Fitness: "pnpm fitness"
          }
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/Invalid validation command id/u);
  });
});
