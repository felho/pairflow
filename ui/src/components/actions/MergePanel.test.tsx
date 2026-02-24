import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MergePanel } from "./MergePanel";

describe("MergePanel", () => {
  it("shows cleanup copy and submits merge options", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);

    render(
      <MergePanel
        isSubmitting={false}
        actionError={null}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(
      screen.getByText("Merge includes runtime/worktree cleanup.")
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("Push merged base branch"));
    await user.click(screen.getByLabelText("Delete remote bubble branch"));
    await user.click(screen.getByRole("button", { name: "Submit Merge" }));

    expect(onSubmit).toHaveBeenCalledWith({
      push: true,
      deleteRemote: true
    });
  });
});
