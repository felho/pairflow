#!/usr/bin/env python3
"""Mutation-probe runner — R-DERIVED-PROBES' execution protocol
(adopted at the ch12 boundary; the self-report gap raised by the owner).

Every builder mutation probe runs THROUGH this tool, never by hand:

  1. the probe's command runs ONCE against the UNMUTATED target — the
     GREEN-BASELINE GATE (the ch13-P0 measured hole, 2026-07-31: all
     11 probes ran against an already-red baseline, so every
     suite_red receipt was vacuous). A non-green baseline ABORTS the
     probe loudly BEFORE any mutation: the receipt records the
     distinct class ("baseline": "RED — instrument broken, receipt
     would be vacuous") and the run exits nonzero; a green baseline
     is recorded in the receipt ("baseline": "green"),
  2. the target file is backed up by BYTE COPY into the receipts dir
     (git-independent — git-based restore is FORBIDDEN for mutation
     rollback: git knows the committed state, not uncommitted work;
     three live incidents),
  3. the caller-supplied MUTATED variant replaces the target,
  4. the test command runs; its FULL output is captured to a receipt
     log file,
  5. the target is restored FROM THE BACKUP COPY and the restore is
     verified by byte comparison — a mismatch is a LOUD failure that
     leaves the backup in place,
  6. a receipt JSON is written; the Build-record probe table cites it
     by probe id. The receipt is the machine evidence the arm's
     spot-check audits — never the builder's prose.

Exit codes: 0 = probe ran, the suite went RED, restore byte-verified
(the expected outcome); 3 = the suite STAYED GREEN (a blind probe — a
build-time finding; receipt still written, restore verified); 2 =
usage error (missing file, no-op mutation); 4 = restore verification
FAILED (backup preserved at the printed path — recover before
anything else; also minted when a BASELINE side-effect on the target
cannot be restored); 5 = RED BASELINE (the instrument is broken before
any mutation — no mutation applied; fix the instrument and rerun; a
baseline side-effect on the target is restored from backup and noted
in the receipt — arm fold, 2026-08-14).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def files_identical(a: Path, b: Path) -> bool:
    return a.read_bytes() == b.read_bytes()


# module-level seam so the selftest can drive the restore-failure path
_restore_copy = shutil.copyfile


def run_probe(
    probe_id: str,
    target: Path,
    mutated: Path,
    test_command: str,
    receipts_dir: Path,
    cwd: Path,
) -> int:
    if not target.is_file() or not mutated.is_file():
        print(f"probe-runner FAIL [{probe_id}]: target/mutated file missing")
        return 2
    if files_identical(target, mutated):
        print(
            f"probe-runner FAIL [{probe_id}]: mutated variant is byte-identical "
            f"to the target — a no-op mutation proves nothing"
        )
        return 2

    receipts_dir.mkdir(parents=True, exist_ok=True)
    backup = receipts_dir / f"{probe_id}.backup"
    out_file = receipts_dir / f"{probe_id}.out"
    receipt_file = receipts_dir / f"{probe_id}.receipt.json"
    baseline_file = receipts_dir / f"{probe_id}.baseline.out"

    # GREEN-BASELINE GATE (ch13-P0, 2026-07-31): the command runs once
    # UNMUTATED before any mutation is applied — against a red baseline
    # every suite_red receipt is vacuous (the suite was red anyway),
    # so a broken instrument aborts LOUDLY instead of receipting.
    # Arm fold (2026-08-14 review, finding 2): the backup and digest are
    # taken BEFORE the baseline run — the baseline command is arbitrary
    # shell and may itself write the target; after the run (any exit)
    # the target is compared and restored from the backup on divergence,
    # byte-verified, and the receipt says so. "The runner applies no
    # mutation" is the guarantee; a side-effecting command is caught.
    original_digest = digest(target)
    shutil.copyfile(target, backup)
    with baseline_file.open("wb") as out:
        base = subprocess.run(
            test_command, shell=True, cwd=cwd, stdout=out, stderr=subprocess.STDOUT
        )
    baseline_side_effect = None

    def _target_intact() -> bool:
        # Arm re-check fold (2026-08-14, finding: a baseline command that
        # REPLACES the target — directory, deletion, unreadable object —
        # crashed the unguarded digest() instead of reaching the loud
        # exit-4 lane). Any unreadable/non-regular state counts as a
        # side effect; never an uncaught exception.
        try:
            # not is_symlink(): is_file() FOLLOWS symlinks, so a
            # same-byte symlink replacement would pass digest equality
            # while the path is no longer the original file (final arm
            # re-check, 2026-08-14).
            return (
                target.is_file()
                and not target.is_symlink()
                and digest(target) == original_digest
            )
        except OSError:
            return False

    if not _target_intact():
        restored = False
        try:
            if target.is_dir() and not target.is_symlink():
                shutil.rmtree(target)
            elif target.exists() or target.is_symlink():
                target.unlink()
            _restore_copy(backup, target)
            restored = digest(target) == original_digest
        except OSError:
            restored = False
        if not restored:
            print(
                f"probe-runner FAIL [{probe_id}]: BASELINE SIDE-EFFECT on the "
                f"target could not be restored byte-identically — manual "
                f"recovery from {backup}"
            )
            return 4
        baseline_side_effect = (
            "the baseline command WROTE the target; restored byte-identically "
            "from backup before any mutation"
        )
    if base.returncode != 0:
        receipt = {
            "probe_id": probe_id,
            "file": str(target),
            "test_command": test_command,
            "baseline": "RED — instrument broken, receipt would be vacuous",
            "baseline_exit_code": base.returncode,
            "output_file": str(baseline_file),
        }
        if baseline_side_effect is not None:
            receipt["baseline_side_effect"] = baseline_side_effect
        receipt_file.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(
            f"probe-runner FAIL [{probe_id}]: BASELINE RED (exit "
            f"{base.returncode}) on the UNMUTATED target — instrument broken, "
            f"every receipt would be vacuous; no mutation applied; baseline "
            f"log: {baseline_file}"
        )
        return 5
    shutil.copyfile(mutated, target)
    try:
        with out_file.open("wb") as out:
            proc = subprocess.run(
                test_command, shell=True, cwd=cwd, stdout=out, stderr=subprocess.STDOUT
            )
        exit_code = proc.returncode
    finally:
        _restore_copy(backup, target)

    restore_verified = files_identical(target, backup) and digest(target) == original_digest
    receipt = {
        "probe_id": probe_id,
        "file": str(target),
        "original_sha256": original_digest,
        "mutated_sha256": digest(mutated),
        "test_command": test_command,
        "exit_code": exit_code,
        "suite_red": exit_code != 0,
        "baseline": "green",  # the gate above aborted every other case
        "output_file": str(out_file),
        "restore_verified": restore_verified,
    }
    if baseline_side_effect is not None:
        receipt["baseline_side_effect"] = baseline_side_effect
    receipt_file.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    if not restore_verified:
        print(
            f"probe-runner FAIL [{probe_id}]: RESTORE VERIFICATION FAILED — the "
            f"working tree may still carry the mutation; backup preserved at "
            f"{backup}"
        )
        return 4
    if exit_code == 0:
        print(
            f"probe-runner [{probe_id}]: suite stayed GREEN under the mutation — "
            f"a BLIND probe (build-time finding); receipt: {receipt_file}"
        )
        return 3
    print(
        f"probe-runner [{probe_id}]: observed RED (exit {exit_code}), restore "
        f"byte-verified; receipt: {receipt_file}"
    )
    return 0


def selftest() -> int:
    global _restore_copy
    failures: list[str] = []

    exercised = 0

    def expect(label: str, cond: bool) -> None:
        nonlocal exercised
        exercised += 1
        if not cond:
            failures.append(label)

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        target = root / "mod.txt"
        mutated = root / "mod.mutated.txt"
        receipts = root / "receipts"
        target.write_text("original\n", encoding="utf-8")
        mutated.write_text("mutated\n", encoding="utf-8")

        # the fixture "suite": green on the original bytes, red on the
        # mutated bytes — a REAL instrument shape (the always-red
        # "exit 1" of the pre-baseline era is exactly the broken
        # instrument the green-baseline gate now aborts on)
        suite = "grep -q original mod.txt"

        # red path: mutation makes the "suite" fail -> 0, restored, receipt
        code = run_probe("p-red", target, mutated, suite, receipts, root)
        expect("red-path-exit-0", code == 0)
        expect("red-path-target-restored", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-red.receipt.json").read_text())
        expect("red-path-receipt-suite-red", receipt["suite_red"] is True)
        expect("red-path-receipt-restore-ok", receipt["restore_verified"] is True)
        expect("red-path-receipt-baseline-green", receipt["baseline"] == "green")
        expect("red-path-output-captured", (receipts / "p-red.out").exists())

        # blind path: suite stays green -> 3, still restored + receipted
        code = run_probe("p-green", target, mutated, "exit 0", receipts, root)
        expect("green-path-exit-3", code == 3)
        expect("green-path-target-restored", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-green.receipt.json").read_text())
        expect("green-path-receipt-suite-not-red", receipt["suite_red"] is False)
        expect("green-path-receipt-baseline-green", receipt["baseline"] == "green")

        # red baseline: the instrument is broken BEFORE any mutation ->
        # 5, no mutation applied, receipt carries the distinct class
        # (ch13-P0: an already-red suite makes every receipt vacuous)
        code = run_probe("p-redbase", target, mutated, "exit 1", receipts, root)
        expect("red-baseline-exit-5", code == 5)
        expect("red-baseline-target-untouched", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-redbase.receipt.json").read_text())
        expect(
            "red-baseline-receipt-class",
            receipt["baseline"] == "RED — instrument broken, receipt would be vacuous",
        )

        # baseline SIDE-EFFECT (arm fold, 2026-08-14): a baseline
        # command that WRITES the target is caught — restored
        # byte-identically, noted in the receipt, and the run proceeds
        # on its own merits (green variant) or aborts red (red variant)
        # with the target still restored either way.
        side_green = f"printf side >> {target.name}; grep -q original {target.name}"
        code = run_probe("p-sidegreen", target, mutated, side_green, receipts, root)
        expect("side-effect-green-exit-0", code == 0)
        expect("side-effect-green-target-restored", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-sidegreen.receipt.json").read_text())
        expect(
            "side-effect-green-receipt-note",
            "restored byte-identically" in receipt.get("baseline_side_effect", ""),
        )
        side_red = f"printf side >> {target.name}; exit 9"
        code = run_probe("p-sidered", target, mutated, side_red, receipts, root)
        expect("side-effect-red-exit-5", code == 5)
        expect("side-effect-red-target-restored", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-sidered.receipt.json").read_text())
        expect(
            "side-effect-red-receipt-note",
            "restored byte-identically" in receipt.get("baseline_side_effect", ""),
        )

        # baseline REPLACES the target (arm re-check fold, 2026-08-14):
        # a dir-replacement is restored (rmtree + copy) — exit 5 with
        # the side-effect note, never an uncaught exception
        side_dir = f"rm -f {target.name}; mkdir {target.name}; exit 9"
        code = run_probe("p-sidedir", target, mutated, side_dir, receipts, root)
        expect("side-effect-dir-exit-5", code == 5)
        expect("side-effect-dir-target-restored", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-sidedir.receipt.json").read_text())
        expect(
            "side-effect-dir-receipt-note",
            "restored byte-identically" in receipt.get("baseline_side_effect", ""),
        )

        # same-byte SYMLINK replacement (final arm re-check,
        # 2026-08-14): is_file() follows symlinks, so digest equality
        # alone would pass — the guard must reject the symlink state
        elsewhere = root / "elsewhere.txt"
        elsewhere.write_text("original\n", encoding="utf-8")
        side_link = (
            f"rm -f {target.name}; ln -s {elsewhere.name} {target.name}; exit 9"
        )
        code = run_probe("p-sidelink", target, mutated, side_link, receipts, root)
        expect("side-effect-symlink-exit-5", code == 5)
        expect("side-effect-symlink-not-a-link", not target.is_symlink())
        expect("side-effect-symlink-restored", target.read_text() == "original\n")
        receipt = json.loads((receipts / "p-sidelink.receipt.json").read_text())
        expect(
            "side-effect-symlink-receipt-note",
            "restored byte-identically" in receipt.get("baseline_side_effect", ""),
        )

        # unrestorable baseline side effect -> LOUD exit 4 (driven
        # through the _restore_copy seam, the tamper lane's pattern)
        def _fail_restore(src, dst):  # noqa: ANN001
            raise OSError("selftest: restore refused")

        saved_restore = _restore_copy  # the real copyfile, via the global
        _restore_copy = _fail_restore
        try:
            code = run_probe(
                "p-sidedir4", target, mutated, side_dir, receipts, root
            )
        finally:
            _restore_copy = saved_restore
        expect("side-effect-unrestorable-exit-4", code == 4)
        # recover the fixture for the remaining lanes
        if target.is_dir():
            shutil.rmtree(target)
        target.write_text("original\n", encoding="utf-8")

        # no-op mutation -> 2 (proves nothing)
        noop = root / "mod.noop.txt"
        noop.write_text("original\n", encoding="utf-8")
        expect("noop-mutation-exit-2", run_probe("p-noop", target, noop, suite, receipts, root) == 2)

        # adversarial: the restore-failure path must go LOUD (exit 4);
        # driven by disabling the restore seam in-process
        _restore_copy = lambda src, dst: None  # noqa: E731
        try:
            code = run_probe("p-tamper", target, mutated, suite, receipts, root)
        finally:
            _restore_copy = shutil.copyfile
        expect("restore-failure-exit-4", code == 4)
        receipt = json.loads((receipts / "p-tamper.receipt.json").read_text())
        expect("restore-failure-receipted", receipt["restore_verified"] is False)
        # recover the fixture from the preserved backup (the tool's own advice)
        shutil.copyfile(receipts / "p-tamper.backup", target)
        expect("backup-recovers-target", target.read_text() == "original\n")

        # files_identical is able to fail (the verify claim's negative)
        expect("files-identical-negative", files_identical(target, mutated) is False)

    if failures:
        print(f"probe-runner selftest: {len(failures)} failure(s): {failures}")
        return 1
    print(f"probe-runner selftest: {exercised} case(s) exercised, 0 failure(s)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--probe-id")
    parser.add_argument("--file", dest="target")
    parser.add_argument("--mutated", help="path to the mutated variant of --file")
    parser.add_argument("--test", help="shell command whose RED proves the probe")
    parser.add_argument("--receipts-dir")
    parser.add_argument("--cwd", default=".")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        return selftest()
    required = [args.probe_id, args.target, args.mutated, args.test, args.receipts_dir]
    if any(v is None for v in required):
        parser.print_usage()
        return 2
    return run_probe(
        args.probe_id,
        Path(args.target),
        Path(args.mutated),
        args.test,
        Path(args.receipts_dir),
        Path(args.cwd),
    )


if __name__ == "__main__":
    sys.exit(main())
