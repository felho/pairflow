import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";
import { builtInValidationCommandIds } from "../../shared/validation/validationCommandId.js";
import type { ResolvedRepoValidationProfileCommands } from "./repoValidationProfileResolver.js";

interface ValidationCommandsConfigInput {
  bootstrapCommand?: string;
  testCommand?: string;
  typecheckCommand?: string;
  resolvedValidationCommands?: ResolvedRepoValidationProfileCommands;
}

export function buildValidationCommandsConfig(
  input: ValidationCommandsConfigInput
): BubbleConfig["commands"] {
  const resolvedCommands = input.resolvedValidationCommands?.commands;
  const customCommands = Object.fromEntries(
    Object.entries(resolvedCommands ?? {}).filter(
      ([id]) => !(builtInValidationCommandIds as readonly string[]).includes(id)
    )
  );
  return {
    // Bubble config historically materializes required test/typecheck defaults
    // while leaving lint/bootstrap absent unless explicitly configured.
    ...(resolvedCommands?.bootstrap !== undefined || input.bootstrapCommand !== undefined
      ? { bootstrap: resolvedCommands?.bootstrap ?? input.bootstrapCommand }
      : {}),
    ...(resolvedCommands?.lint !== undefined
      ? { lint: resolvedCommands.lint }
      : {}),
    test: resolvedCommands?.test ?? input.testCommand ?? "pnpm test",
    typecheck: resolvedCommands?.typecheck ?? input.typecheckCommand ?? "pnpm typecheck",
    ...customCommands,
    ...(input.resolvedValidationCommands?.metaReviewApproveRequired !== undefined
      ? {
          meta_review_approve_required:
            input.resolvedValidationCommands.metaReviewApproveRequired
        }
      : {}),
    ...(input.resolvedValidationCommands?.validationRequired !== undefined
      ? {
          validation_required:
            input.resolvedValidationCommands.validationRequired
        }
      : {}),
    ...(input.resolvedValidationCommands?.validationRequiredExplicit !== undefined
      ? {
          validation_required_explicit:
            input.resolvedValidationCommands.validationRequiredExplicit
        }
      : {})
  };
}
