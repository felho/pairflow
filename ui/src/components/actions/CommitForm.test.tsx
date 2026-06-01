import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CommitActionInput } from "../../lib/types";
import { CommitForm } from "./CommitForm";

describe("CommitForm", () => {
  function expectStageAllInvariants(): void {
    expect(
      screen.getByRole("checkbox", { name: "Stage all changes" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/auto=true/u)).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("artifacts/commit-evidence.md")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("feat(scope): describe change")
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("artifacts/done-package.md")
    ).not.toBeInTheDocument();
  }

  it("submits default stage-all intent and stage-all wording", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: CommitActionInput) => Promise<void>>(() =>
      Promise.resolve(undefined)
    );

    render(
      <CommitForm
        isSubmitting={false}
        actionError={null}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const stageAll = screen.getByRole("checkbox", { name: "Stage all changes" });
    expect(stageAll).toBeChecked();
    expectStageAllInvariants();

    const submitButton = screen.getByRole("button", { name: "Submit Commit" });
    expect(submitButton).toBeDisabled();
    await user.type(
      screen.getByLabelText("Message"),
      "feat(commit): finalize bubble"
    );
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      stageAll: true,
      message: "feat(commit): finalize bubble"
    });
    const firstSubmit = onSubmit.mock.calls[0]?.[0];
    expect(firstSubmit).toBeDefined();
    expect(firstSubmit).toBeTypeOf("object");
    if (firstSubmit === undefined || typeof firstSubmit !== "object") {
      throw new Error("Expected first commit submit payload to be an object.");
    }
    expect("auto" in firstSubmit).toBe(false);
  });

  it("submits disabled stage-all intent without legacy auto", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: CommitActionInput) => Promise<void>>(() =>
      Promise.resolve(undefined)
    );

    render(
      <CommitForm
        isSubmitting={false}
        actionError={null}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expectStageAllInvariants();
    await user.click(
      screen.getByRole("checkbox", { name: "Stage all changes" })
    );
    expectStageAllInvariants();
    await user.type(
      screen.getByLabelText("Message"),
      "fix(commit): finalize selected files"
    );
    await user.type(
      screen.getByLabelText("Refs (optional, comma/newline separated)"),
      "artifacts/commit-evidence.md"
    );
    await user.click(screen.getByRole("button", { name: "Submit Commit" }));

    expect(onSubmit).toHaveBeenCalledWith({
      stageAll: false,
      message: "fix(commit): finalize selected files",
      refs: ["artifacts/commit-evidence.md"]
    });
    const secondSubmit = onSubmit.mock.calls[0]?.[0];
    expect(secondSubmit).toBeDefined();
    expect(secondSubmit).toBeTypeOf("object");
    if (secondSubmit === undefined || typeof secondSubmit !== "object") {
      throw new Error("Expected second commit submit payload to be an object.");
    }
    expect("auto" in secondSubmit).toBe(false);
  });
});
