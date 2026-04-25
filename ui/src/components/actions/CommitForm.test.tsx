import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
      screen.queryByPlaceholderText("artifacts/done-package.md")
    ).not.toBeInTheDocument();
  }

  it("submits default stage-all intent and stage-all wording", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve(undefined));

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

    await user.click(screen.getByRole("button", { name: "Submit Commit" }));

    expect(onSubmit).toHaveBeenCalledWith({
      stageAll: true
    });
    expect("auto" in (onSubmit.mock.calls[0]?.[0] as object)).toBe(false);
  });

  it("submits disabled stage-all intent without legacy auto", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve(undefined));

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
      screen.getByLabelText("Refs (optional, comma/newline separated)"),
      "artifacts/commit-evidence.md"
    );
    await user.click(screen.getByRole("button", { name: "Submit Commit" }));

    expect(onSubmit).toHaveBeenCalledWith({
      stageAll: false,
      refs: ["artifacts/commit-evidence.md"]
    });
    expect("auto" in (onSubmit.mock.calls[0]?.[0] as object)).toBe(false);
  });
});
