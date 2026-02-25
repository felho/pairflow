import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

describe("DeleteConfirmDialog", () => {
  it("renders an accessible modal dialog", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        bubbleId="b-1"
        artifacts={{
          worktree: {
            exists: true,
            path: "/tmp/worktrees/b-1"
          },
          tmux: {
            exists: true,
            sessionName: "pf-b-1"
          },
          runtimeSession: {
            exists: true,
            sessionName: "pf-b-1"
          },
          branch: {
            exists: true,
            name: "pairflow/bubble/b-1"
          }
        }}
        isSubmitting={false}
        error={null}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    const dialog = screen.getByRole("dialog", {
      name: "Delete Bubble b-1?"
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("closes on Escape key when not submitting", () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        open={true}
        bubbleId="b-1"
        artifacts={{
          worktree: {
            exists: true,
            path: "/tmp/worktrees/b-1"
          },
          tmux: {
            exists: true,
            sessionName: "pf-b-1"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/b-1"
          }
        }}
        isSubmitting={false}
        error={null}
        onCancel={onCancel}
        onConfirm={() => undefined}
      />
    );

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape"
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape while submitting", () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        open={true}
        bubbleId="b-1"
        artifacts={{
          worktree: {
            exists: false,
            path: "/tmp/worktrees/b-1"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b-1"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/b-1"
          }
        }}
        isSubmitting={true}
        error={null}
        onCancel={onCancel}
        onConfirm={() => undefined}
      />
    );

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape"
    });

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("traps focus within dialog on Tab and Shift+Tab", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        bubbleId="b-1"
        artifacts={{
          worktree: {
            exists: true,
            path: "/tmp/worktrees/b-1"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b-1"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/b-1"
          }
        }}
        isSubmitting={false}
        error={null}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Delete with Force" });

    confirmButton.focus();
    fireEvent.keyDown(confirmButton, { key: "Tab" });
    expect(cancelButton).toHaveFocus();

    cancelButton.focus();
    fireEvent.keyDown(cancelButton, { key: "Tab", shiftKey: true });
    expect(confirmButton).toHaveFocus();
  });
});
