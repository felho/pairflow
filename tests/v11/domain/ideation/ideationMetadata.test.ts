import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/v11/shared/config/bubbleConfigTypes.js";
import {
  hasIdeationMetadataParseWarning,
  resolveIdeationMetadata
} from "../../../../src/v11/domain/ideation/ideationMetadata.js";

function createBubbleConfig(overrides: Partial<BubbleConfig> = {}): BubbleConfig {
  return {
    id: "b_ideation_metadata_fixture",
    ...overrides
  } as unknown as BubbleConfig;
}

describe("resolveIdeationMetadata", () => {
  it("defaults to disabled metadata when ideation config is missing", () => {
    expect(
      resolveIdeationMetadata(createBubbleConfig({
        id: "b_ideation_metadata_01"
      }))
    ).toEqual({
      mode: false,
      taskPending: false
    });
  });

  it("maps persisted ideation config into the v11 metadata contract", () => {
    expect(
      resolveIdeationMetadata(createBubbleConfig({
        id: "b_ideation_metadata_02",
        ideation: {
          mode: true,
          task_pending: true,
          parse_warning: "IDEATION_METADATA_PARSE_WARNING: synthetic test fixture"
        }
      }))
    ).toEqual({
      mode: true,
      taskPending: true,
      parseWarning: "IDEATION_METADATA_PARSE_WARNING: synthetic test fixture"
    });
  });
});

describe("hasIdeationMetadataParseWarning", () => {
  it("treats blank parse warnings as absent", () => {
    expect(
      hasIdeationMetadataParseWarning(createBubbleConfig({
        id: "b_ideation_metadata_03",
        ideation: {
          mode: true,
          task_pending: true,
          parse_warning: "   "
        }
      }))
    ).toBe(false);
  });

  it("treats non-empty parse warnings as present", () => {
    expect(
      hasIdeationMetadataParseWarning(createBubbleConfig({
        id: "b_ideation_metadata_04",
        ideation: {
          mode: true,
          task_pending: true,
          parse_warning: "synthetic warning"
        }
      }))
    ).toBe(true);
  });
});
