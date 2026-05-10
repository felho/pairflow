import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveRepoValidationProfileCommands } from "../../../../src/v11/application/create/internal/preparation/repoValidationProfileResolver.js";
import { buildValidationCommandsConfig } from "../../../../src/v11/application/create/internal/preparation/createValidationCommandsConfig.js";
import { parsePairflowRepoConfigToml } from "../../../../src/config/repoConfig.js";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

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

  it("materializes split PASS and meta-review approve validation policies", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      repoValidation: {
        required: ["lint", "typecheck", "fitness"],
        meta_review_approve_required: ["test"],
        commands: {
          lint: "pnpm lint",
          fitness: "pnpm fitness"
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.validationRequired).toEqual(["lint", "typecheck", "fitness"]);
    expect(result.metaReviewApproveRequired).toEqual(["test"]);
    expect(buildValidationCommandsConfig({ resolvedValidationCommands: result }))
      .toMatchObject({
        validation_required: ["lint", "typecheck", "fitness"],
        meta_review_approve_required: ["test"],
        test: "pnpm test"
      });
  });

  it("resolves parsed approve-gate test from legacy defaults without validation.commands.test", () => {
    const repoConfig = parsePairflowRepoConfigToml(`
[validation]
meta_review_approve_required = ["test"]
`);

    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      repoValidation: repoConfig.validation!,
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.metaReviewApproveRequired).toEqual(["test"]);
    expect(result.commands.test).toBe("pnpm test");
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

  it("rejects unresolved meta-review approve required ids before bubble config persistence", () => {
    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        repoValidation: {
          meta_review_approve_required: ["fitness"]
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_META_REVIEW_APPROVE_REQUIRED_COMMAND_UNRESOLVED/u);
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

  it("uses a field-specific reason code for duplicate meta-review approve ids", () => {
    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        repoValidation: {
          meta_review_approve_required: ["test", "test"]
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_META_REVIEW_APPROVE_REQUIRED_DUPLICATE/u);
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

  it("materializes an explicit validation target with target/root/explicit precedence", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {
        bootstrap: "pnpm bootstrap:explicit"
      },
      validationTarget: "web",
      worktreePath: process.cwd(),
      repoValidation: {
        required: ["test"],
        commands: {
          typecheck: "pnpm typecheck:root",
          test: "pnpm test:root",
          bootstrap: "pnpm bootstrap:root"
        },
        targets: {
          web: {
            cwd: "apps/web",
            paths: ["apps/web/**"],
            required: ["lint", "typecheck", "test", "bootstrap"],
            commands: {
              lint: "pnpm lint:web",
              test: "pnpm test:web",
              bootstrap: "pnpm bootstrap:web"
            }
          }
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result).toEqual({
      commands: {
        test: "pnpm test:web",
        typecheck: "pnpm typecheck:root",
        lint: "pnpm lint:web",
        bootstrap: "pnpm bootstrap:explicit"
      },
      validationRequired: ["lint", "typecheck", "test", "bootstrap"],
      validationTarget: {
        id: "web",
        cwd: "apps/web",
        paths: ["apps/web/**"]
      }
    });
    expect(result.validationRequiredExplicit).toBeUndefined();
  });

  it("preserves validation target metadata when meta-review approve required uses a target command", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      validationTarget: "web",
      worktreePath: process.cwd(),
      repoValidation: {
        meta_review_approve_required: ["lint"],
        targets: {
          web: {
            cwd: "apps/web",
            paths: ["apps/web/**"],
            required: [],
            commands: {
              lint: "pnpm --filter web lint"
            }
          }
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.metaReviewApproveRequired).toEqual(["lint"]);
    expect(result.commands.lint).toBe("pnpm --filter web lint");
    expect(result.validationTarget).toEqual({
      id: "web",
      cwd: "apps/web",
      paths: ["apps/web/**"]
    });
  });

  it("uses selected target required order instead of root validation.required", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      validationTarget: "web",
      repoValidation: {
        required: ["test"],
        commands: {
          lint: "pnpm lint",
          test: "pnpm test:root"
        },
        targets: {
          web: {
            required: ["lint"],
            commands: {}
          }
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.validationRequired).toEqual(["lint"]);
    expect(result.commands.test).toBe("pnpm test:root");
    expect(result.commands.lint).toBe("pnpm lint");
  });

  it("selects a unique default target and preserves explicit empty target policy", () => {
    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      repoValidation: {
        targets: {
          web: {
            default: true,
            required: [],
            commands: {}
          }
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.validationTarget).toEqual({ id: "web" });
    expect(result.validationRequired).toEqual([]);
    expect(result.validationRequiredExplicit).toBe(true);
  });

  it("fails fast for missing, unknown, ambiguous, and unresolved targets", () => {
    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        validationTarget: "web",
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_TARGETS_NOT_CONFIGURED/u);

    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        validationTarget: "web",
        repoValidation: {
          targets: {
            api: {
              required: [],
              commands: {}
            }
          }
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_TARGET_UNKNOWN/u);

    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        repoValidation: {
          targets: {
            web: { required: [], commands: {} }
          }
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_TARGET_DEFAULT_MISSING/u);

    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        repoValidation: {
          targets: {
            web: { required: [], commands: {} },
            api: { required: [], commands: {} }
          }
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_TARGET_AMBIGUOUS/u);

    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        validationTarget: "web",
        repoValidation: {
          targets: {
            web: {
              required: ["fitness"],
              commands: {}
            }
          }
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_TARGET_REQUIRED_COMMAND_UNRESOLVED/u);
  });

  it("fails fast when a selected target cwd cannot be checked against a worktree", () => {
    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        validationTarget: "web",
        repoValidation: {
          targets: {
            web: {
              cwd: "apps/web",
              required: [],
              commands: {}
            }
          }
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE/u);
  });

  it("can validate selected target cwd against a planned worktree path before it exists", async () => {
    const repoParentPath = await mkdtemp(join(tmpdir(), "pairflow-target-parent-"));
    cleanupPaths.push(repoParentPath);
    const plannedWorktreePath = join(repoParentPath, "worktrees", "b_target");

    const result = resolveRepoValidationProfileCommands({
      explicitCommands: {},
      validationTarget: "web",
      worktreePath: plannedWorktreePath,
      allowMissingWorktreePath: true,
      repoValidation: {
        targets: {
          web: {
            cwd: "apps/web",
            required: ["typecheck"],
            commands: {}
          }
        }
      },
      legacyDefaults: {
        test: "pnpm test",
        typecheck: "pnpm typecheck"
      }
    });

    expect(result.validationTarget).toEqual({
      id: "web",
      cwd: "apps/web"
    });
  });

  it("rejects selected target cwd that resolves through a symlink outside the worktree", async () => {
    const worktreePath = await mkdtemp(join(tmpdir(), "pairflow-target-worktree-"));
    const outsidePath = await mkdtemp(join(tmpdir(), "pairflow-target-outside-"));
    cleanupPaths.push(worktreePath, outsidePath);
    await mkdir(join(worktreePath, "apps"), { recursive: true });
    await symlink(outsidePath, join(worktreePath, "apps", "web"));

    expect(() =>
      resolveRepoValidationProfileCommands({
        explicitCommands: {},
        validationTarget: "web",
        worktreePath,
        repoValidation: {
          targets: {
            web: {
              cwd: "apps/web",
              required: [],
              commands: {}
            }
          }
        },
        legacyDefaults: {
          test: "pnpm test",
          typecheck: "pnpm typecheck"
        }
      })
    ).toThrow(/VALIDATION_TARGET_CWD_OUTSIDE_WORKTREE/u);
  });
});
