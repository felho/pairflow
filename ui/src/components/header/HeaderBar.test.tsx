import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HeaderBar } from "./HeaderBar";
import { stateCounts } from "../../test/fixtures";

describe("HeaderBar", () => {
  it("renders counts/status and toggles repo filters", async () => {
    const user = userEvent.setup();
    const onToggleRepo = vi.fn();

    render(
      <HeaderBar
        counts={stateCounts({ RUNNING: 2, WAITING_HUMAN: 1 })}
        repos={["/repo-a", "/repo-b"]}
        selectedRepos={["/repo-a"]}
        connectionStatus="connected"
        onToggleRepo={onToggleRepo}
      />
    );

    expect(screen.getByText("SSE connected")).toBeInTheDocument();
    expect(screen.getByText("Total bubbles: 3")).toBeInTheDocument();
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
