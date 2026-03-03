import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HeaderBar } from "./HeaderBar";

describe("HeaderBar", () => {
  it("renders connection status and toggles repo filters", async () => {
    const user = userEvent.setup();
    const onToggleRepo = vi.fn();

    render(
      <HeaderBar
        repos={["/repo-a", "/repo-b"]}
        selectedRepos={["/repo-a"]}
        connectionStatus="connected"
        onToggleRepo={onToggleRepo}
      />
    );

    expect(screen.getByText("Pairflow")).toBeInTheDocument();
    expect(screen.getByText("SSE connected")).toBeInTheDocument();
    expect(
      screen.getByText("Pairflow").compareDocumentPosition(screen.getByText("SSE connected")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "repo-a" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "repo-b" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    await user.click(screen.getByRole("button", { name: "repo-b" }));
    expect(onToggleRepo).toHaveBeenCalledWith("/repo-b");
  });
});
